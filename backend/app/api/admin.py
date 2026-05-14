"""Admin utilities — seed demo data, health checks"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime, timedelta
import random
import uuid

from app.database import get_db
from app.models.orm import Appointment

router = APIRouter()


@router.post("/seed-demo")
async def seed_demo_data(n: int = 20, db: AsyncSession = Depends(get_db)):
    """Seed database with demo appointments for testing the UI."""
    age_groups = ["18-30", "31-45", "46-60", "61+"]
    appt_types = ["primary_care", "specialist", "follow_up", "procedure"]
    clinic_ids = ["CLINIC_001", "CLINIC_002", "CLINIC_003"]
    created = []

    for i in range(n):
        appt_dt = datetime.utcnow() + timedelta(days=random.randint(1, 30))
        scheduled_at = appt_dt - timedelta(days=random.randint(1, 45))
        appt = Appointment(
            id=str(uuid.uuid4()),
            patient_id=f"P{random.randint(1, 999):04d}",
            clinic_id=random.choice(clinic_ids),
            appointment_dt=appt_dt,
            scheduled_at=scheduled_at,
            appointment_type=random.choice(appt_types),
            patient_age_group=random.choice(age_groups),
            has_chronic_condition=random.random() < 0.3,
            prior_noshows=random.randint(0, 4),
            prior_appointments=random.randint(0, 15),
            day_of_week=appt_dt.weekday(),
            hour_of_day=random.randint(8, 17),
            clinic_load_pct=round(random.uniform(0.4, 0.95), 2),
        )
        db.add(appt)
        created.append(appt.id)

    await db.commit()
    return {"seeded": len(created), "appointment_ids": created}
