"""
ClinicFlow backend tests
Run: pytest tests/ -v
"""
import pytest
import numpy as np
from datetime import datetime


# ── Feature engineering tests ──────────────────────────────────────────────

def test_feature_engineering_basic():
    from app.ml.features import engineer_features, FEATURE_COLUMNS
    row = {
        "prior_noshows": 2, "prior_appointments": 8, "lead_time_days": 14,
        "day_of_week": 0, "hour_of_day": 9, "clinic_load_pct": 0.75,
        "patient_age_group": "31-45", "has_chronic_condition": False,
        "rolling_attendance_3": 0.8, "historical_noshow_rate": 0.25,
    }
    feats = engineer_features(row)
    assert feats.shape == (len(FEATURE_COLUMNS),)
    assert feats.dtype == np.float32


def test_noshow_rate_calculated():
    from app.ml.features import engineer_features
    row = {"prior_noshows": 3, "prior_appointments": 10, "lead_time_days": 7,
           "day_of_week": 2, "hour_of_day": 11, "clinic_load_pct": 0.6,
           "patient_age_group": "46-60", "has_chronic_condition": True,
           "rolling_attendance_3": 1.0, "historical_noshow_rate": 0.30}
    feats = engineer_features(row)
    # historical_noshow_rate is index 0 in features
    from app.ml.features import FEATURE_COLUMNS
    idx = FEATURE_COLUMNS.index("historical_noshow_rate")
    assert feats[idx] == pytest.approx(0.30)


def test_is_first_appointment_flag():
    from app.ml.features import engineer_features, FEATURE_COLUMNS
    row = {"prior_noshows": 0, "prior_appointments": 0, "lead_time_days": 5,
           "day_of_week": 1, "hour_of_day": 10, "clinic_load_pct": 0.5,
           "patient_age_group": "18-30", "has_chronic_condition": False,
           "rolling_attendance_3": 1.0, "historical_noshow_rate": 0.15}
    feats = engineer_features(row)
    idx = FEATURE_COLUMNS.index("is_first_appointment")
    assert feats[idx] == 1.0


# ── Inference / decision tests ─────────────────────────────────────────────

def test_risk_classification():
    from app.ml.inference import classify_risk
    from app.models.schemas import RiskTier
    assert classify_risk(0.05) == RiskTier.LOW
    assert classify_risk(0.25) == RiskTier.MEDIUM
    assert classify_risk(0.50) == RiskTier.HIGH
    assert classify_risk(0.80) == RiskTier.CRITICAL


def test_low_risk_no_intervention():
    from app.ml.inference import select_intervention
    from app.models.schemas import InterventionType, RiskTier
    result = select_intervention(RiskTier.LOW, [], 0.10)
    assert result == InterventionType.NONE


def test_predict_returns_response(monkeypatch):
    from app.ml.inference import predict
    from app.models.schemas import PredictionResponse
    row = {
        "prior_noshows": 2, "prior_appointments": 5, "lead_time_days": 21,
        "day_of_week": 4, "hour_of_day": 15, "clinic_load_pct": 0.90,
        "patient_age_group": "18-30", "has_chronic_condition": False,
        "rolling_attendance_3": 0.5, "historical_noshow_rate": 0.40,
    }
    result = predict("TEST-001", row)
    assert isinstance(result, PredictionResponse)
    assert 0 <= result.no_show_probability <= 1
    assert result.appointment_id == "TEST-001"
    assert result.recommended_intervention is not None
    assert len(result.uplift_estimates) == 3


# ── PSI monitoring tests ────────────────────────────────────────────────────

def test_psi_stable():
    from app.monitoring.monitor import compute_psi, psi_status
    rng = np.random.default_rng(42)
    ref = rng.normal(0.2, 0.05, 1000)
    cur = rng.normal(0.21, 0.05, 1000)  # tiny shift
    score = compute_psi(ref, cur)
    assert score < 0.1
    assert psi_status(score) == "stable"


def test_psi_alert():
    from app.monitoring.monitor import compute_psi, psi_status
    rng = np.random.default_rng(42)
    ref = rng.normal(0.2, 0.05, 1000)
    cur = rng.normal(0.35, 0.08, 1000)  # noticeable shift
    score = compute_psi(ref, cur)
    assert score >= 0.1


def test_calibration_error():
    from app.monitoring.monitor import compute_calibration_error
    # Perfect calibration
    y_true = np.array([0, 0, 1, 1])
    y_prob = np.array([0.1, 0.2, 0.8, 0.9])
    ece = compute_calibration_error(y_true, y_prob)
    assert ece < 0.2


# ── Schema validation tests ─────────────────────────────────────────────────

def test_appointment_schema_validation():
    from app.models.schemas import AppointmentCreate
    from pydantic import ValidationError
    with pytest.raises(ValidationError):
        AppointmentCreate(
            patient_id="P001", clinic_id="C001",
            appointment_dt=datetime.now(), scheduled_at=datetime.now(),
            appointment_type="follow_up", patient_age_group="31-45",
            prior_noshows=5, prior_appointments=3,  # invalid: noshows > appts
            day_of_week=1, hour_of_day=10, clinic_load_pct=0.7,
        )
