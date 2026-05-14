"""Pydantic schemas for request/response validation"""
from pydantic import BaseModel, Field, field_validator
from typing import Optional, Literal
from datetime import datetime
from enum import Enum


class InterventionType(str, Enum):
    NONE = "none"
    SMS = "sms"
    CALL = "call"
    OVERBOOK = "overbook"


class RiskTier(str, Enum):
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


# ── Appointment ──────────────────────────────────────────────────────────────

class AppointmentCreate(BaseModel):
    patient_id: str
    clinic_id: str
    appointment_dt: datetime
    scheduled_at: datetime
    appointment_type: str
    patient_age_group: Literal["18-30", "31-45", "46-60", "61+"]
    has_chronic_condition: bool = False
    prior_noshows: int = Field(ge=0)
    prior_appointments: int = Field(ge=0)
    day_of_week: int = Field(ge=0, le=6)
    hour_of_day: int = Field(ge=0, le=23)
    clinic_load_pct: float = Field(ge=0.0, le=1.0)

    @field_validator("prior_noshows")
    @classmethod
    def noshows_le_appointments(cls, v, info):
        if "prior_appointments" in info.data and v > info.data["prior_appointments"]:
            raise ValueError("prior_noshows cannot exceed prior_appointments")
        return v


class AppointmentOut(AppointmentCreate):
    id: str
    created_at: datetime

    model_config = {"from_attributes": True}


# ── Prediction ───────────────────────────────────────────────────────────────

class PredictionRequest(BaseModel):
    appointment_id: str


class UpliftEstimate(BaseModel):
    intervention: InterventionType
    delta_noshowprob: float = Field(description="Reduction in no-show probability")
    expected_gain_usd: float
    intervention_cost_usd: float
    net_value_usd: float


class PredictionResponse(BaseModel):
    appointment_id: str
    no_show_probability: float = Field(ge=0.0, le=1.0)
    risk_tier: RiskTier
    recommended_intervention: InterventionType
    uplift_estimates: list[UpliftEstimate]
    feature_importances: dict[str, float]
    decision_rationale: str
    predicted_at: datetime


# ── Monitoring ────────────────────────────────────────────────────────────────

class PSIReport(BaseModel):
    feature: str
    psi_score: float
    status: Literal["stable", "alert", "critical"]
    computed_at: datetime


class FairnessReport(BaseModel):
    subgroup: str
    attribute: str
    auroc: float
    brier_score: float
    calibration_error: float
    n_samples: int


class MonitoringDashboard(BaseModel):
    psi_reports: list[PSIReport]
    fairness_reports: list[FairnessReport]
    model_version: str
    total_predictions_7d: int
    avg_no_show_prob_7d: float
    intervention_distribution: dict[str, int]
