"""Predictions API router"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import json

from app.database import get_db
from app.models.schemas import PredictionResponse
from app.models.orm import Appointment, PredictionLog, AuditLog
from app.ml.inference import predict
from app.ml.model_registry import ModelRegistry

router = APIRouter()


@router.post("/{appointment_id}", response_model=PredictionResponse)
async def predict_appointment(appointment_id: str, db: AsyncSession = Depends(get_db)):
    """
    Run the full decision pipeline for an appointment:
    1. Load appointment features
    2. Predict no-show probability
    3. Estimate uplift per intervention
    4. Return optimal action + rationale
    """
    # Fetch appointment
    result = await db.execute(
        select(Appointment).where(Appointment.id == appointment_id)
    )
    appt = result.scalar_one_or_none()
    if appt is None:
        raise HTTPException(status_code=404, detail=f"Appointment {appointment_id} not found")

    from datetime import datetime
    lead_time_days = max(
        0,
        (appt.appointment_dt - appt.scheduled_at).days
        if appt.appointment_dt and appt.scheduled_at else 7
    )

    raw_features = {
        "prior_noshows": appt.prior_noshows,
        "prior_appointments": appt.prior_appointments,
        "lead_time_days": lead_time_days,
        "day_of_week": appt.day_of_week,
        "hour_of_day": appt.hour_of_day,
        "clinic_load_pct": appt.clinic_load_pct,
        "patient_age_group": appt.patient_age_group,
        "has_chronic_condition": appt.has_chronic_condition,
        "rolling_attendance_3": 1.0,
        "historical_noshow_rate": (
            appt.prior_noshows / appt.prior_appointments
            if appt.prior_appointments > 0 else 0.15
        ),
    }

    response = predict(appointment_id, raw_features)

    # Persist prediction log
    log = PredictionLog(
        appointment_id=appointment_id,
        no_show_probability=response.no_show_probability,
        risk_tier=response.risk_tier.value,
        recommended_intervention=response.recommended_intervention.value,
        uplift_estimates=[u.model_dump() for u in response.uplift_estimates],
        feature_importances=response.feature_importances,
        decision_rationale=response.decision_rationale,
        model_version=ModelRegistry.meta().get("version", "unknown"),
    )
    db.add(log)

    # Audit log
    audit = AuditLog(
        event_type="prediction",
        appointment_id=appointment_id,
        payload={
            "no_show_probability": response.no_show_probability,
            "recommended_intervention": response.recommended_intervention.value,
        },
    )
    db.add(audit)
    await db.commit()

    return response


@router.get("/bulk/clinic/{clinic_id}", response_model=list[PredictionResponse])
async def predict_clinic_appointments(
    clinic_id: str,
    limit: int = 50,
    db: AsyncSession = Depends(get_db),
):
    """Batch predictions for all upcoming appointments at a clinic."""
    result = await db.execute(
        select(Appointment)
        .where(Appointment.clinic_id == clinic_id, Appointment.actual_outcome.is_(None))
        .limit(limit)
    )
    appointments = result.scalars().all()

    predictions = []
    for appt in appointments:
        lead_time_days = max(
            0,
            (appt.appointment_dt - appt.scheduled_at).days
            if appt.appointment_dt and appt.scheduled_at else 7
        )
        raw = {
            "prior_noshows": appt.prior_noshows,
            "prior_appointments": appt.prior_appointments,
            "lead_time_days": lead_time_days,
            "day_of_week": appt.day_of_week,
            "hour_of_day": appt.hour_of_day,
            "clinic_load_pct": appt.clinic_load_pct,
            "patient_age_group": appt.patient_age_group,
            "has_chronic_condition": appt.has_chronic_condition,
            "rolling_attendance_3": 1.0,
            "historical_noshow_rate": (
                appt.prior_noshows / appt.prior_appointments
                if appt.prior_appointments > 0 else 0.15
            ),
        }
        predictions.append(predict(appt.id, raw))

    return predictions
