# ClinicFlow — Decision-Aware ML System for Reducing Appointment No-Shows

> *"Will this patient show up?" is the wrong question. The right one: "What should we do right now?"*

**Live Demo:** https://clinicflow-hazel.vercel.app  
**Backend API:** https://clinicflow-ysqv.onrender.com/docs  
**GitHub:** https://github.com/sanikadhayabarpatil/clinicflow

---

## What This Is

ClinicFlow is a production-grade decision system for healthcare clinics. It doesn't just predict whether a patient will miss their appointment — it tells staff **what action to take** and **why it's worth taking it**.

For every upcoming appointment, ClinicFlow:
1. Scores no-show risk using a calibrated XGBoost model (AUROC 0.823)
2. Estimates the ROI of each intervention (SMS at $0.05, phone call at $0.50, overbooking at $2.00)
3. Recommends the optimal action based on expected revenue gain minus cost
4. Explains the decision in plain language with feature attributions

This is the shift from **prediction → decision** that separates ClinicFlow from a standard ML project.

---

## The Problem

Appointment no-shows are a persistent operational failure in healthcare:
- 5–30% no-show rates across clinics
- Direct revenue loss and longer patient wait times
- Most existing ML systems stop at prediction — they don't tell staff what to do

**Typical ML project:** "This patient has a 72% chance of not showing up."  
**ClinicFlow:** "This patient has a 72% chance of not showing up. Call them — expected net value is $22.00."

---

## Architecture

```
clinicflow/
├── backend/                    # FastAPI + Python
│   ├── app/
│   │   ├── api/                # REST endpoints
│   │   │   ├── appointments.py # CRUD + outcome recording
│   │   │   ├── predictions.py  # Risk scoring + intervention engine
│   │   │   ├── monitoring.py   # Drift + fairness dashboard
│   │   │   └── admin.py        # Demo data seeding
│   │   ├── ml/
│   │   │   ├── features.py     # Feature engineering (leakage-safe)
│   │   │   ├── inference.py    # Prediction + uplift + decision policy
│   │   │   └── model_registry.py # Artifact loader
│   │   ├── models/
│   │   │   ├── schemas.py      # Pydantic request/response models
│   │   │   └── orm.py          # SQLAlchemy table definitions
│   │   ├── monitoring/
│   │   │   └── monitor.py      # PSI drift + fairness analysis
│   │   ├── main.py             # FastAPI app + lifespan
│   │   ├── database.py         # Async SQLAlchemy setup
│   │   └── config.py           # Settings via pydantic-settings
│   └── tests/
│       └── test_core.py        # Unit tests
├── frontend/                   # React + Vite + Tailwind
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx   # KPIs, charts, risk distribution
│       │   ├── Predictions.jsx # Live prediction engine (calls API)
│       │   ├── Appointments.jsx# Queue with risk badges + signals
│       │   └── Monitoring.jsx  # PSI drift + fairness + governance
│       └── utils/
│           ├── api.js          # Backend API client
│           └── mockData.js     # Fallback demo data
├── scripts/
│   ├── generate_data.py        # Synthetic 50k appointment dataset
│   └── train_models.py         # XGBoost + LR baseline + uplift models
└── artifacts/                  # Trained model files (.pkl)
```

---

## ML System Design

### Feature Engineering
All features are computed from information available **at scheduling time** — no data leakage.

| Category | Features |
|---|---|
| Temporal | lead time days, day of week, hour of day, is monday, is friday, is morning/afternoon |
| Behavioral | historical no-show rate, prior no-shows, prior appointments, rolling attendance (3), is first appointment |
| Contextual | clinic load percentage |
| Demographic | age group (bucketed), has chronic condition |

### Risk Model
- **Baseline:** Logistic Regression (interpretability)
- **Production:** XGBoost with isotonic calibration
- **Evaluation:** Temporal train/val split (80/10/10), no random shuffle
- **Metrics:** AUROC 0.823, Brier Score 0.141

### Intervention-Aware Modeling (Key Differentiator)
Instead of assuming all interventions help equally, ClinicFlow uses an S-Learner uplift approach — separate outcome models conditioned on each intervention type. This estimates the **incremental effect** of each action per patient:

```
Δ = P(no-show | no action) - P(no-show | intervention)
```

### Decision Policy
```
Expected Net Value = Δ × Revenue per appointment − Intervention cost

Low risk  → no action
Medium    → SMS ($0.05) if net positive
High      → call ($0.50) if net positive
Critical  → call or overbook based on max net value
```

### Monitoring & Governance
- **PSI (Population Stability Index):** detects feature distribution drift between training and production
  - PSI < 0.1: stable
  - 0.1–0.2: alert
  - > 0.2: critical, retrain
- **Fairness analysis:** per-subgroup AUROC, Brier score, and calibration error across age groups
- **Audit log:** every prediction and intervention decision is persisted to the database
- **Outcome recording:** actual show/no-show outcomes can be recorded for feedback loop

---

## Tech Stack

| Layer | Technology | Notes |
|---|---|---|
| Backend API | FastAPI + Python 3.10 | Async, REST |
| ML Models | XGBoost, scikit-learn | Calibrated, versioned |
| Database | SQLite (via SQLAlchemy async) | Runs on Render free tier |
| Frontend | React + Vite + Tailwind | Dark theme, Recharts |
| Backend Hosting | Render (free tier) | Auto-deploys from GitHub |
| Frontend Hosting | Vercel (free tier) | Auto-deploys from GitHub |
| CI/CD | GitHub Actions | Test + build on every push |

---

## Running Locally

### Prerequisites
- Python 3.10+
- Node.js 18+
- Git

### Backend Setup
```bash
git clone https://github.com/sanikadhayabarpatil/clinicflow
cd clinicflow/backend
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
```

### Generate Data + Train Models
```bash
cd ..
PYTHONPATH=backend python scripts/generate_data.py
PYTHONPATH=backend python scripts/train_models.py
```

This creates:
- `data/appointments.csv` — 50,000 synthetic appointments with realistic no-show patterns
- `artifacts/risk_model.pkl` — calibrated XGBoost model
- `artifacts/uplift_models.pkl` — S-Learner uplift models per intervention
- `artifacts/model_meta.json` — version, AUROC, Brier score

### Start API
```bash
cd backend
cp ../artifacts/* artifacts/
uvicorn app.main:app --reload --port 8000
```

API docs: http://localhost:8000/docs

### Start Frontend
```bash
cd frontend
npm install
```

Create `frontend/.env.local`:
```
VITE_API_URL=http://localhost:8000
```

```bash
npm run dev
```

App: http://localhost:5173

### Seed Demo Data
```bash
curl -X POST "http://localhost:8000/api/admin/seed-demo?n=30"
```

### Run Tests
```bash
cd backend
pytest tests/ -v
```

---

## Deployment

The live deployment uses:
- **Render** (free tier) for the FastAPI backend — `https://clinicflow-ysqv.onrender.com`
- **Vercel** (free tier) for the React frontend — `https://clinicflow-hazel.vercel.app`
- **SQLite** on Render's filesystem for the database
- Model artifacts committed directly to the GitHub repo and loaded at startup

> Note: Render's free tier spins down after 15 minutes of inactivity. First request after spin-down takes ~30 seconds (cold start). This is expected behavior on the free plan.

To manually seed data on the live backend:
```bash
curl -X POST "https://clinicflow-ysqv.onrender.com/api/admin/seed-demo?n=50"
```

---

## API Reference

| Method | Endpoint | Description |
|---|---|---|
| GET | `/health` | Health check + model status |
| POST | `/api/appointments/` | Create appointment |
| GET | `/api/appointments/{id}` | Get appointment |
| GET | `/api/appointments/clinic/{clinic_id}` | List clinic appointments |
| PATCH | `/api/appointments/{id}/outcome` | Record actual outcome |
| POST | `/api/predictions/{appointment_id}` | Run full prediction pipeline |
| POST | `/api/predictions/bulk/clinic/{clinic_id}` | Batch predictions for clinic |
| GET | `/api/monitoring/dashboard` | PSI + fairness + intervention stats |
| GET | `/api/monitoring/model-info` | Current model metadata |
| POST | `/api/admin/seed-demo` | Seed synthetic appointments |

Full interactive docs: https://clinicflow-ysqv.onrender.com/docs

---

## Project Motivation

This project was built to demonstrate senior-level thinking across the full ML stack:

- Not just a model — a **decision system** with business impact framing
- Not just accuracy — **calibrated probabilities** and cost-benefit optimization
- Not just a notebook — **production APIs**, async database, CI/CD
- Not just predictions — **monitoring, fairness, and audit trails**

The no-show problem in healthcare is well-studied but almost always solved with classifiers that output a probability and stop there. ClinicFlow treats it as a **decision problem under uncertainty** — which is what it actually is in practice.

---

## Author

Sanika Dhayabar Patil  
Software and AI Engineer 
[GitHub](https://github.com/sanikadhayabarpatil) · [LinkedIn](https://linkedin.com/in/sanikadhayabarpatil)
