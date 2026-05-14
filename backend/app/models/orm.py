"""SQLAlchemy ORM table definitions"""
from sqlalchemy import Column, String, Float, Integer, Boolean, DateTime, JSON, Text
from sqlalchemy.sql import func
from app.database import Base
import uuid


def new_uuid():
    return str(uuid.uuid4())


class Appointment(Base):
    __tablename__ = "appointments"

    id = Column(String, primary_key=True, default=new_uuid)
    patient_id = Column(String, nullable=False, index=True)
    clinic_id = Column(String, nullable=False, index=True)
    appointment_dt = Column(DateTime, nullable=False)
    scheduled_at = Column(DateTime, nullable=False)
    appointment_type = Column(String)
    patient_age_group = Column(String)
    has_chronic_condition = Column(Boolean, default=False)
    prior_noshows = Column(Integer, default=0)
    prior_appointments = Column(Integer, default=0)
    day_of_week = Column(Integer)
    hour_of_day = Column(Integer)
    clinic_load_pct = Column(Float)
    actual_outcome = Column(String, nullable=True)  # "show" | "noshow" | null
    created_at = Column(DateTime, server_default=func.now())


class PredictionLog(Base):
    __tablename__ = "prediction_logs"

    id = Column(String, primary_key=True, default=new_uuid)
    appointment_id = Column(String, index=True)
    no_show_probability = Column(Float)
    risk_tier = Column(String)
    recommended_intervention = Column(String)
    uplift_estimates = Column(JSON)
    feature_importances = Column(JSON)
    decision_rationale = Column(Text)
    model_version = Column(String)
    predicted_at = Column(DateTime, server_default=func.now())


class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=new_uuid)
    event_type = Column(String, index=True)
    appointment_id = Column(String, nullable=True)
    payload = Column(JSON)
    created_at = Column(DateTime, server_default=func.now())
