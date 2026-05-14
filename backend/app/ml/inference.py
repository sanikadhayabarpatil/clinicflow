"""
ClinicFlow Inference Engine
Produces: risk probability → uplift estimates → decision → rationale
"""
import numpy as np
from datetime import datetime
from typing import Any

from app.ml.features import engineer_features, FEATURE_COLUMNS
from app.ml.model_registry import ModelRegistry
from app.models.schemas import (
    PredictionResponse, UpliftEstimate, InterventionType, RiskTier
)
from app.config import settings

INTERVENTION_COSTS = {
    InterventionType.NONE: 0.0,
    InterventionType.SMS: settings.COST_SMS,
    InterventionType.CALL: settings.COST_CALL,
    InterventionType.OVERBOOK: settings.COST_OVERBOOK,
}

# Estimated show-rate uplift per intervention (fallback if uplift model unavailable)
PRIOR_UPLIFT = {
    InterventionType.SMS: 0.08,
    InterventionType.CALL: 0.15,
    InterventionType.OVERBOOK: 0.12,
}


def classify_risk(prob: float) -> RiskTier:
    if prob < 0.20:
        return RiskTier.LOW
    elif prob < 0.40:
        return RiskTier.MEDIUM
    elif prob < 0.65:
        return RiskTier.HIGH
    else:
        return RiskTier.CRITICAL


def compute_uplift_estimates(
    raw_features: dict, baseline_prob: float
) -> list[UpliftEstimate]:
    """Estimate net value for each intervention using uplift models or priors."""
    uplift_models = ModelRegistry.uplift_models()
    feat_vec = engineer_features(raw_features).reshape(1, -1)
    estimates = []

    for iv in [InterventionType.SMS, InterventionType.CALL, InterventionType.OVERBOOK]:
        if uplift_models and iv.value in uplift_models:
            treated_prob = float(
                uplift_models[iv.value].predict_proba(feat_vec)[0][1]
            )
            # Delta = how much the intervention reduces noshow prob
            delta = max(0.0, baseline_prob - treated_prob)
        else:
            delta = PRIOR_UPLIFT[iv]

        cost = INTERVENTION_COSTS[iv]
        expected_gain = delta * settings.REVENUE_PER_APPOINTMENT
        net = expected_gain - cost

        estimates.append(UpliftEstimate(
            intervention=iv,
            delta_noshowprob=round(delta, 4),
            expected_gain_usd=round(expected_gain, 2),
            intervention_cost_usd=round(cost, 2),
            net_value_usd=round(net, 2),
        ))

    return estimates


def select_intervention(
    risk_tier: RiskTier,
    uplift_estimates: list[UpliftEstimate],
    no_show_prob: float,
) -> InterventionType:
    """Decision policy: rule-based + max net value."""
    if risk_tier == RiskTier.LOW:
        return InterventionType.NONE

    # Among positive-ROI interventions, pick max net value
    positive = [u for u in uplift_estimates if u.net_value_usd > 0]
    if not positive:
        return InterventionType.NONE

    best = max(positive, key=lambda u: u.net_value_usd)
    return best.intervention


def get_feature_importances(feat_vec: np.ndarray) -> dict[str, float]:
    """Get model feature importances (XGBoost built-in)."""
    model = ModelRegistry.risk_model()
    if model is None:
        return {f: round(1 / len(FEATURE_COLUMNS), 3) for f in FEATURE_COLUMNS}

    try:
        # For CalibratedClassifierCV wrapping XGB
        base = model.calibrated_classifiers_[0].estimator
        importances = base.feature_importances_
        total = importances.sum()
        return {col: round(float(v / total), 4) for col, v in zip(FEATURE_COLUMNS, importances)}
    except Exception:
        return {f: round(1 / len(FEATURE_COLUMNS), 3) for f in FEATURE_COLUMNS}


def build_rationale(
    no_show_prob: float,
    risk_tier: RiskTier,
    recommended: InterventionType,
    top_features: dict[str, float],
) -> str:
    top = sorted(top_features.items(), key=lambda x: -x[1])[:3]
    top_str = ", ".join(f"{k.replace('_', ' ')} ({v:.0%})" for k, v in top)
    action_map = {
        InterventionType.NONE: "no action is cost-effective",
        InterventionType.SMS: "an SMS reminder is the most cost-effective intervention",
        InterventionType.CALL: "a phone call is warranted given the high no-show risk",
        InterventionType.OVERBOOK: "overbooking this slot is recommended to protect utilization",
    }
    return (
        f"No-show probability: {no_show_prob:.0%} ({risk_tier.value} risk). "
        f"Top predictive factors: {top_str}. "
        f"Decision: {action_map[recommended]}."
    )


def predict(appointment_id: str, raw_features: dict) -> PredictionResponse:
    """Full prediction pipeline for a single appointment."""
    feat_vec = engineer_features(raw_features).reshape(1, -1)

    model = ModelRegistry.risk_model()
    if model is not None:
        no_show_prob = float(model.predict_proba(feat_vec)[0][1])
    else:
        # Mock fallback when models not loaded (dev/demo)
        ns_rate = float(raw_features.get("historical_noshow_rate", 0.15))
        lead = float(raw_features.get("lead_time_days", 7))
        no_show_prob = min(0.95, ns_rate + (0.02 if lead > 14 else 0))

    risk_tier = classify_risk(no_show_prob)
    uplift_estimates = compute_uplift_estimates(raw_features, no_show_prob)
    recommended = select_intervention(risk_tier, uplift_estimates, no_show_prob)
    importances = get_feature_importances(feat_vec)
    rationale = build_rationale(no_show_prob, risk_tier, recommended, importances)

    return PredictionResponse(
        appointment_id=appointment_id,
        no_show_probability=round(no_show_prob, 4),
        risk_tier=risk_tier,
        recommended_intervention=recommended,
        uplift_estimates=uplift_estimates,
        feature_importances=importances,
        decision_rationale=rationale,
        predicted_at=datetime.utcnow(),
    )
