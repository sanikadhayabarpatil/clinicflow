"""
ClinicFlow — Decision-Aware ML System
FastAPI application entry point
"""
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import logging

from app.api import appointments, predictions, monitoring, admin
from app.ml.model_registry import ModelRegistry
from app.database import init_db

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    """Startup: load models; Shutdown: cleanup"""
    logger.info("🏥 ClinicFlow starting up...")
    await init_db()
    ModelRegistry.load_all()
    logger.info("✅ Models loaded. API ready.")
    yield
    logger.info("🔻 ClinicFlow shutting down.")


app = FastAPI(
    title="ClinicFlow API",
    description="Decision-Aware ML System for Reducing Appointment No-Shows",
    version="1.0.0",
    lifespan=lifespan,
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # restrict in production
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(appointments.router, prefix="/api/appointments", tags=["appointments"])
app.include_router(predictions.router, prefix="/api/predictions", tags=["predictions"])
app.include_router(monitoring.router, prefix="/api/monitoring", tags=["monitoring"])
app.include_router(admin.router, prefix="/api/admin", tags=["admin"])


@app.get("/health")
async def health():
    return {
        "status": "ok",
        "models_loaded": ModelRegistry.is_ready(),
    }
