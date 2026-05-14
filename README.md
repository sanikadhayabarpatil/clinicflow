# ClinicFlow — Decision-Aware ML System for Reducing Appointment No-Shows

> *"Will this patient show up?" is the wrong question. The right one: "What should we do right now?"*

ClinicFlow is a **production-grade decision system** that predicts appointment no-show risk, recommends cost-effective interventions, and measurably improves clinic utilization.

---

## Architecture Overview

```
clinicflow/
├── backend/                    # FastAPI microservices
│   ├── app/
│   │   ├── api/                # REST endpoints
│   │   ├── models/             # Pydantic schemas
│   │   ├── ml/                 # Training, inference, uplift
│   │   ├── services/           # Business logic
│   │   └── monitoring/         # Drift, fairness, audit
│   └── tests/
├── frontend/                   # React dashboard
├── data/                       # Data generation + fixtures
├── scripts/                    # Training & setup scripts
└── .github/workflows/          # CI/CD
```

---

## Stack (All Free-Tier)

| Layer | Technology | Free Tier |
|---|---|---|
| Backend API | FastAPI + Python | Railway / Render |
| ML Training | scikit-learn, XGBoost, LightGBM | Local / GitHub Actions |
| Database | SQLite (dev) / PostgreSQL | Supabase free |
| Frontend | React + Vite | Vercel |
| Model Storage | joblib files | GitHub repo / HuggingFace |
| CI/CD | GitHub Actions | Free 2000 min/mo |
| Monitoring | Custom (PSI, fairness) | In-process |

---

## Quick Start

### 1. Clone & Setup Backend
```bash
git clone https://github.com/yourname/clinicflow
cd clinicflow/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
```

### 2. Generate Synthetic Data + Train Models
```bash
python scripts/generate_data.py        # Creates data/appointments.csv (50k rows)
python scripts/train_models.py         # Trains risk + uplift models, saves artifacts
```

### 3. Start API
```bash
uvicorn app.main:app --reload --port 8000
# Docs: http://localhost:8000/docs
```

### 4. Start Frontend
```bash
cd frontend
npm install && npm run dev
# App: http://localhost:5173
```

---

## Key Features

### Risk Prediction
- Calibrated probability of no-show per appointment
- Gradient-boosted model (XGBoost) with logistic regression baseline
- Temporal train/test splits (no leakage)

### Intervention Engine
- Uplift modeling: estimates Δ per action (SMS, call, overbook)
- Decision policy: maps risk + uplift to optimal action
- Cost-benefit calculation per intervention

### Monitoring & Governance
- Population Stability Index (PSI) for feature drift
- Calibration decay tracking
- Subgroup fairness analysis
- Full audit log of every decision

### GenAI Copilot (Bonus)
- RAG-based patient communication assistant
- Uses Gemini free tier (1500 req/day)
- Grounded in appointment context

---

## Deployment (Free)

See [DEPLOYMENT.md](DEPLOYMENT.md) for step-by-step Render + Vercel + Supabase setup.
