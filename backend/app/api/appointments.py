"""Appointments CRUD router"""
from fastapi import APIRouter, HTTPException, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select
import uuid
from datetime import datetime

from app.database import get_db
from app.models.schemas import AppointmentCreate, AppointmentOut
from app.models.orm import Appointment

router = APIRouter()


@router.post("/", response_model=AppointmentOut, status_code=201)
async def create_appointment(body: AppointmentCreate, db: AsyncSession = Depends(get_db)):
    appt = Appointment(
        id=str(uuid.uuid4()),
        **body.model_dump(),
    )
    db.add(appt)
    await db.commit()
    await db.refresh(appt)
    return appt


@router.get("/{appointment_id}", response_model=AppointmentOut)
async def get_appointment(appointment_id: str, db: AsyncSession = Depends(get_db)):
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    return appt


@router.get("/clinic/{clinic_id}", response_model=list[AppointmentOut])
async def list_clinic_appointments(
    clinic_id: str,
    limit: int = 100,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Appointment)
        .where(Appointment.clinic_id == clinic_id)
        .order_by(Appointment.appointment_dt.desc())
        .limit(limit)
    )
    return result.scalars().all()


@router.patch("/{appointment_id}/outcome")
async def record_outcome(
    appointment_id: str,
    outcome: str,
    db: AsyncSession = Depends(get_db),
):
    """Record actual show/no-show for feedback loop."""
    if outcome not in ("show", "noshow"):
        raise HTTPException(status_code=400, detail="outcome must be 'show' or 'noshow'")
    result = await db.execute(select(Appointment).where(Appointment.id == appointment_id))
    appt = result.scalar_one_or_none()
    if not appt:
        raise HTTPException(status_code=404, detail="Appointment not found")
    appt.actual_outcome = outcome
    await db.commit()
    return {"status": "updated", "appointment_id": appointment_id, "outcome": outcome}
