"""
ClinicFlow Monitoring Module
- Population Stability Index (PSI) for feature drift detection
- Calibration decay tracking
- Subgroup fairness analysis
"""
import numpy as np
import pandas as pd
from datetime import datetime
from typing import Optional
from app.models.schemas import PSIReport, FairnessReport
from app.config import settings


def compute_psi(expected: np.ndarray, actual: np.ndarray, n_bins: int = 10) -> float:
    """
    Population Stability Index.
    PSI < 0.1:  stable
    0.1–0.2:    minor shift
    > 0.2:      significant drift — retrain
    """
    eps = 1e-6
    min_val = min(expected.min(), actual.min())
    max_val = max(expected.max(), actual.max())
    bins = np.linspace(min_val, max_val, n_bins + 1)

    exp_freq, _ = np.histogram(expected, bins=bins)
    act_freq, _ = np.histogram(actual, bins=bins)

    exp_pct = (exp_freq + eps) / (len(expected) + eps)
    act_pct = (act_freq + eps) / (len(actual) + eps)

    psi = np.sum((act_pct - exp_pct) * np.log(act_pct / exp_pct))
    return float(psi)


def psi_status(score: float) -> str:
    if score < 0.1:
        return "stable"
    elif score < settings.PSI_ALERT_THRESHOLD:
        return "alert"
    else:
        return "critical"


def run_psi_report(
    reference_df: pd.DataFrame,
    current_df: pd.DataFrame,
    feature_columns: list[str],
) -> list[PSIReport]:
    """Compute PSI for each feature between reference and current windows."""
    reports = []
    for feat in feature_columns:
        if feat not in reference_df.columns or feat not in current_df.columns:
            continue
        ref_vals = reference_df[feat].dropna().values
        cur_vals = current_df[feat].dropna().values
        if len(ref_vals) < 10 or len(cur_vals) < 10:
            continue
        score = compute_psi(ref_vals, cur_vals)
        reports.append(PSIReport(
            feature=feat,
            psi_score=round(score, 4),
            status=psi_status(score),
            computed_at=datetime.utcnow(),
        ))
    return sorted(reports, key=lambda r: -r.psi_score)


def compute_calibration_error(y_true: np.ndarray, y_prob: np.ndarray, n_bins: int = 10) -> float:
    """Expected Calibration Error (ECE)."""
    bins = np.linspace(0, 1, n_bins + 1)
    ece = 0.0
    for i in range(n_bins):
        mask = (y_prob >= bins[i]) & (y_prob < bins[i + 1])
        if mask.sum() == 0:
            continue
        bin_acc = y_true[mask].mean()
        bin_conf = y_prob[mask].mean()
        ece += mask.sum() / len(y_true) * abs(bin_acc - bin_conf)
    return float(ece)


def run_fairness_report(
    df: pd.DataFrame,
    y_true_col: str = "no_show",
    y_prob_col: str = "predicted_prob",
    subgroup_col: str = "patient_age_group",
) -> list[FairnessReport]:
    """Compute per-subgroup AUROC, Brier, and ECE."""
    from sklearn.metrics import roc_auc_score, brier_score_loss

    reports = []
    for group in df[subgroup_col].unique():
        sub = df[df[subgroup_col] == group]
        y = sub[y_true_col].values
        p = sub[y_prob_col].values

        if len(np.unique(y)) < 2 or len(y) < 20:
            continue

        try:
            auroc = roc_auc_score(y, p)
            brier = brier_score_loss(y, p)
            cal_err = compute_calibration_error(y, p)

            reports.append(FairnessReport(
                subgroup=str(group),
                attribute=subgroup_col,
                auroc=round(auroc, 4),
                brier_score=round(brier, 4),
                calibration_error=round(cal_err, 4),
                n_samples=len(sub),
            ))
        except Exception:
            continue

    return reports


def mock_monitoring_data() -> dict:
    """Returns mock monitoring data when real predictions are unavailable."""
    features = ["historical_noshow_rate", "lead_time_days", "clinic_load_pct",
                 "day_of_week", "hour_of_day", "prior_appointments"]
    psi_reports = [
        PSIReport(
            feature=f,
            psi_score=round(abs(np.random.normal(0.05, 0.04)), 4),
            status="stable",
            computed_at=datetime.utcnow(),
        )
        for f in features
    ]
    psi_reports[0].psi_score = 0.18
    psi_reports[0].status = "alert"

    fairness = [
        FairnessReport(
            subgroup=g, attribute="patient_age_group",
            auroc=round(np.random.uniform(0.72, 0.82), 4),
            brier_score=round(np.random.uniform(0.13, 0.18), 4),
            calibration_error=round(np.random.uniform(0.02, 0.06), 4),
            n_samples=random.randint(800, 2000),
        )
        for g in ["18-30", "31-45", "46-60", "61+"]
    ]

    return {
        "psi_reports": psi_reports,
        "fairness_reports": fairness,
        "intervention_distribution": {"none": 412, "sms": 287, "call": 95, "overbook": 31},
        "total_predictions_7d": 825,
        "avg_no_show_prob_7d": 0.23,
    }


import random  # noqa: E402 (needed for mock)
