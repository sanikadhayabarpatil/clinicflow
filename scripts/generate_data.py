"""
Generate synthetic appointment data for ClinicFlow training.
Produces ~50,000 realistic appointments with realistic no-show patterns.
Run: python scripts/generate_data.py
"""
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime, timedelta
import random

random.seed(42)
np.random.seed(42)

N = 50_000
OUTPUT = Path("./data/appointments.csv")
OUTPUT.parent.mkdir(exist_ok=True)

CLINICS = [f"CLINIC_{i:03d}" for i in range(1, 11)]
AGE_GROUPS = ["18-30", "31-45", "46-60", "61+"]
APPT_TYPES = ["primary_care", "specialist", "follow_up", "procedure", "telehealth"]

print(f"Generating {N:,} synthetic appointments...")

# Patient pool with fixed histories
N_PATIENTS = 8000
patient_ids = [f"P{i:05d}" for i in range(N_PATIENTS)]
patient_age_group = {pid: np.random.choice(AGE_GROUPS) for pid in patient_ids}
patient_chronic = {pid: np.random.choice([True, False], p=[0.3, 0.7]) for pid in patient_ids}

rows = []
base_date = datetime(2022, 1, 1)

patient_history: dict[str, dict] = {
    pid: {"prior_appointments": 0, "prior_noshows": 0, "last_attended": None}
    for pid in patient_ids
}

for i in range(N):
    pid = random.choice(patient_ids)
    hist = patient_history[pid]

    # Appointment date — spread over 2 years
    appt_dt = base_date + timedelta(days=random.randint(0, 730))
    lead_days = random.choice([1, 2, 3, 5, 7, 14, 21, 28, 42, 60])
    scheduled_at = appt_dt - timedelta(days=lead_days)

    dow = appt_dt.weekday()  # 0=Mon
    hour = random.choices(range(8, 18), weights=[3,5,8,9,8,7,8,9,6,4])[0]
    clinic = random.choice(CLINICS)
    appt_type = random.choice(APPT_TYPES)
    age_group = patient_age_group[pid]
    chronic = patient_chronic[pid]

    prior_appts = hist["prior_appointments"]
    prior_ns = hist["prior_noshows"]
    historical_ns_rate = prior_ns / prior_appts if prior_appts > 0 else 0.15

    # Rolling attendance (last 3)
    rolling = max(0, min(1, 1 - historical_ns_rate + np.random.normal(0, 0.1)))
    clinic_load = np.clip(np.random.beta(5, 2), 0, 1)

    # ── Ground-truth no-show probability (sigmoid of risk factors) ────────────
    logit = -1.5  # intercept (baseline ~18%)
    logit += 0.8 * historical_ns_rate         # strongest signal
    logit += 0.4 * (lead_days > 14)           # longer lead → more no-show
    logit += 0.3 * (dow in [0, 4])            # Mon/Fri effect
    logit += 0.2 * (hour < 9 or hour > 16)    # early/late slots
    logit -= 0.4 * chronic                    # chronic patients more motivated
    logit += 0.3 * (prior_appts == 0)         # first-timers riskier
    logit -= 0.2 * (age_group == "61+")       # seniors tend to show
    logit += 0.15 * (age_group == "18-30")    # young adults miss more
    logit += 0.1 * (appt_type == "telehealth") # easier to skip
    logit += np.random.normal(0, 0.3)          # noise

    p_noshow = 1 / (1 + np.exp(-logit))
    no_show = int(np.random.random() < p_noshow)

    rows.append({
        "appointment_id": f"A{i:06d}",
        "patient_id": pid,
        "clinic_id": clinic,
        "appointment_dt": appt_dt.strftime("%Y-%m-%d %H:%M:%S"),
        "scheduled_at": scheduled_at.strftime("%Y-%m-%d %H:%M:%S"),
        "appointment_type": appt_type,
        "patient_age_group": age_group,
        "has_chronic_condition": chronic,
        "prior_noshows": prior_ns,
        "prior_appointments": prior_appts,
        "lead_time_days": lead_days,
        "day_of_week": dow,
        "hour_of_day": hour,
        "clinic_load_pct": round(clinic_load, 3),
        "rolling_attendance_3": round(rolling, 3),
        "historical_noshow_rate": round(historical_ns_rate, 3),
        "no_show": no_show,
    })

    # Update patient history
    hist["prior_appointments"] += 1
    if no_show:
        hist["prior_noshows"] += 1

df = pd.DataFrame(rows)
df.to_csv(OUTPUT, index=False)

noshow_rate = df["no_show"].mean()
print(f"✅ Generated {len(df):,} appointments")
print(f"   No-show rate: {noshow_rate:.2%}")
print(f"   Date range:   {df['appointment_dt'].min()} → {df['appointment_dt'].max()}")
print(f"   Saved to {OUTPUT}")
