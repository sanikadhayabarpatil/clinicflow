"""Monitoring & governance API router"""
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from datetime import datetime

from app.database import get_db
from app.models.schemas import MonitoringDashboard
from app.monitoring.monitor import mock_monitoring_data
from app.ml.model_registry import ModelRegistry

router = APIRouter()


@router.get("/dashboard", response_model=MonitoringDashboard)
async def monitoring_dashboard(db: AsyncSession = Depends(get_db)):
    """
    Returns:
    - PSI drift scores per feature
    - Fairness metrics per subgroup
    - Intervention distribution (last 7 days)
    - Model version
    """
    data = mock_monitoring_data()
    meta = ModelRegistry.meta()

    return MonitoringDashboard(
        psi_reports=data["psi_reports"],
        fairness_reports=data["fairness_reports"],
        model_version=meta.get("version", "dev"),
        total_predictions_7d=data["total_predictions_7d"],
        avg_no_show_prob_7d=data["avg_no_show_prob_7d"],
        intervention_distribution=data["intervention_distribution"],
    )


@router.get("/model-info")
async def model_info():
    """Returns current model metadata."""
    return ModelRegistry.meta()
