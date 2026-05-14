"""
Feature engineering for ClinicFlow.
Strict leakage prevention: only features available at scheduling time.
"""
import numpy as np
import pandas as pd
from typing import Union


FEATURE_COLUMNS = [
    # Temporal
    "lead_time_days",
    "day_of_week",
    "hour_of_day",
    "is_monday",
    "is_friday",
    "is_morning",
    "is_afternoon",
    # Behavioral (patient history)
    "historical_noshow_rate",
    "prior_noshows",
    "prior_appointments",
    "rolling_attendance_3",
    "is_first_appointment",
    # Contextual
    "clinic_load_pct",
    # Demographic (bucketed)
    "age_group_18_30",
    "age_group_31_45",
    "age_group_46_60",
    "age_group_61_plus",
    "has_chronic_condition",
]


def engineer_features(row: Union[dict, pd.Series]) -> np.ndarray:
    """
    Transform a raw appointment record into the model feature vector.
    Works on both dict (API inference) and pd.Series (batch training).
    """
    if isinstance(row, dict):
        row = pd.Series(row)

    feats = {}

    # ── Temporal ──────────────────────────────────────────────────────────────
    feats["lead_time_days"] = row.get("lead_time_days", 0)
    dow = int(row.get("day_of_week", 0))
    feats["day_of_week"] = dow
    hour = int(row.get("hour_of_day", 9))
    feats["hour_of_day"] = hour
    feats["is_monday"] = int(dow == 0)
    feats["is_friday"] = int(dow == 4)
    feats["is_morning"] = int(8 <= hour < 12)
    feats["is_afternoon"] = int(12 <= hour < 17)

    # ── Behavioral ────────────────────────────────────────────────────────────
    prior_appts = max(int(row.get("prior_appointments", 0)), 0)
    prior_ns = max(int(row.get("prior_noshows", 0)), 0)
    prior_ns = min(prior_ns, prior_appts)  # safety clamp

    feats["prior_noshows"] = prior_ns
    feats["prior_appointments"] = prior_appts
    feats["historical_noshow_rate"] = prior_ns / prior_appts if prior_appts > 0 else 0.15  # prior
    feats["rolling_attendance_3"] = row.get("rolling_attendance_3", 1.0)
    feats["is_first_appointment"] = int(prior_appts == 0)

    # ── Contextual ────────────────────────────────────────────────────────────
    feats["clinic_load_pct"] = float(row.get("clinic_load_pct", 0.7))

    # ── Demographic (one-hot) ─────────────────────────────────────────────────
    age_group = row.get("patient_age_group", "31-45")
    feats["age_group_18_30"] = int(age_group == "18-30")
    feats["age_group_31_45"] = int(age_group == "31-45")
    feats["age_group_46_60"] = int(age_group == "46-60")
    feats["age_group_61_plus"] = int(age_group == "61+")
    feats["has_chronic_condition"] = int(bool(row.get("has_chronic_condition", False)))

    return np.array([feats[c] for c in FEATURE_COLUMNS], dtype=np.float32)


def engineer_features_batch(df: pd.DataFrame) -> pd.DataFrame:
    """Vectorized feature engineering for training."""
    out = pd.DataFrame(index=df.index)

    # Lead time
    if "lead_time_days" not in df.columns:
        if "appointment_dt" in df.columns and "scheduled_at" in df.columns:
            out["lead_time_days"] = (
                pd.to_datetime(df["appointment_dt"]) - pd.to_datetime(df["scheduled_at"])
            ).dt.days.clip(lower=0)
        else:
            out["lead_time_days"] = 0
    else:
        out["lead_time_days"] = df["lead_time_days"]

    out["day_of_week"] = df["day_of_week"].astype(int)
    out["hour_of_day"] = df["hour_of_day"].astype(int)
    out["is_monday"] = (df["day_of_week"] == 0).astype(int)
    out["is_friday"] = (df["day_of_week"] == 4).astype(int)
    out["is_morning"] = ((df["hour_of_day"] >= 8) & (df["hour_of_day"] < 12)).astype(int)
    out["is_afternoon"] = ((df["hour_of_day"] >= 12) & (df["hour_of_day"] < 17)).astype(int)

    prior_appts = df["prior_appointments"].clip(lower=0)
    prior_ns = df["prior_noshows"].clip(lower=0)
    prior_ns = np.minimum(prior_ns, prior_appts)

    out["prior_noshows"] = prior_ns
    out["prior_appointments"] = prior_appts
    out["historical_noshow_rate"] = np.where(prior_appts > 0, prior_ns / prior_appts, 0.15)
    out["rolling_attendance_3"] = df.get("rolling_attendance_3", pd.Series(1.0, index=df.index))
    out["is_first_appointment"] = (prior_appts == 0).astype(int)

    out["clinic_load_pct"] = df["clinic_load_pct"].clip(0, 1)

    for group, col in [("18-30", "age_group_18_30"), ("31-45", "age_group_31_45"),
                        ("46-60", "age_group_46_60"), ("61+", "age_group_61_plus")]:
        out[col] = (df["patient_age_group"] == group).astype(int)

    out["has_chronic_condition"] = df["has_chronic_condition"].astype(int)

    return out[FEATURE_COLUMNS]
