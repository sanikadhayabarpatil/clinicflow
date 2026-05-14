# ClinicFlow — Free Deployment Guide

All services below have generous free tiers that cover this project with zero cost.

---

## Overview

| Service | Role | Free Tier |
|---|---|---|
| **Render** | Backend FastAPI | 750 hrs/mo, spins down after inactivity |
| **Vercel** | Frontend React | Unlimited deployments |
| **Supabase** | PostgreSQL database | 500MB, 2 projects |
| **GitHub Actions** | CI/CD | 2,000 min/mo |
| **HuggingFace** | Model artifact storage | Free public repos |

---

## Step 1 — Database (Supabase)

1. Go to [supabase.com](https://supabase.com) → New Project
2. Save your **database URL**: `postgresql://postgres:[password]@[host]:5432/postgres`
3. Convert to async SQLAlchemy format:
   ```
   postgresql+asyncpg://postgres:[password]@[host]:5432/postgres
   ```

---

## Step 2 — Backend (Render)

1. Push code to GitHub
2. Go to [render.com](https://render.com) → New Web Service → Connect repo
3. **Settings:**
   - Root directory: `backend`
   - Build command: `pip install -r requirements.txt`
   - Start command: `uvicorn app.main:app --host 0.0.0.0 --port $PORT`
   - Environment: Python 3.11

4. **Environment variables** (Render dashboard → Environment):
   ```
   DATABASE_URL=postgresql+asyncpg://...  (from Supabase)
   MODEL_DIR=./artifacts
   SECRET_KEY=your-random-secret-key
   ```

5. **Model artifacts:**
   - Run locally: `python scripts/generate_data.py && python scripts/train_models.py`
   - Commit `artifacts/` folder to repo (or use HuggingFace Hub — see below)

### Model storage on HuggingFace (optional, better)
```bash
pip install huggingface_hub
huggingface-cli login
python -c "
from huggingface_hub import HfApi
api = HfApi()
api.upload_folder(folder_path='./artifacts', repo_id='yourname/clinicflow-models', repo_type='model')
"
```
Then in startup, download from HF instead of relying on committed files.

---

## Step 3 — Frontend (Vercel)

1. Go to [vercel.com](https://vercel.com) → New Project → Import from GitHub
2. **Settings:**
   - Root directory: `frontend`
   - Build command: `npm run build`
   - Output directory: `dist`
   - Framework preset: Vite

3. **Environment variable:**
   ```
   VITE_API_URL=https://your-app.onrender.com
   ```

4. Deploy → your frontend is live at `your-project.vercel.app`

---

## Step 4 — CI/CD (GitHub Actions)

Add these secrets to your GitHub repo (Settings → Secrets):

```
RENDER_DEPLOY_HOOK    # From Render dashboard → Deploy Hook URL
VERCEL_TOKEN          # From vercel.com → Settings → Tokens
VERCEL_ORG_ID         # From vercel.com → Settings
VERCEL_PROJECT_ID     # From your Vercel project settings
```

CI will now:
1. Test backend on every push
2. Build frontend on every push
3. Auto-deploy both on merge to `main`

---

## Step 5 — Seed demo data

After deployment, run:
```bash
curl -X POST https://your-app.onrender.com/api/admin/seed-demo?n=50
```

Then open the frontend and you'll see 50 appointments with live predictions.

---

## Render free tier caveat

The Render free tier spins down after 15 minutes of inactivity.
First request after spin-down takes ~30 seconds (cold start).

To avoid this for demos: set up a free cron ping at [cron-job.org](https://cron-job.org):
- URL: `https://your-app.onrender.com/health`
- Schedule: every 10 minutes

---

## Local development

```bash
# Backend
cd backend
cp .env.example .env
python -m venv venv && source venv/bin/activate
pip install -r requirements.txt
cd ..
python scripts/generate_data.py
python scripts/train_models.py
cd backend
uvicorn app.main:app --reload

# Frontend (new terminal)
cd frontend
npm install
npm run dev
```

Open http://localhost:5173 → full app running locally.
