"""Model registry — loads trained artifacts once at startup."""
import joblib
import json
import logging
from pathlib import Path
from app.config import settings

logger = logging.getLogger(__name__)


class ModelRegistry:
    _risk_model = None
    _baseline_model = None
    _uplift_models = None
    _feature_columns = None
    _meta = None
    _ready = False

    @classmethod
    def load_all(cls):
        artifacts = Path(settings.MODEL_DIR)
        try:
            cls._risk_model = joblib.load(artifacts / "risk_model.pkl")
            cls._baseline_model = joblib.load(artifacts / "baseline_model.pkl")
            cls._uplift_models = joblib.load(artifacts / "uplift_models.pkl")
            cls._feature_columns = joblib.load(artifacts / "feature_columns.pkl")
            with open(artifacts / "model_meta.json") as f:
                cls._meta = json.load(f)
            cls._ready = True
            logger.info(f"Models loaded. Version: {cls._meta.get('version', 'unknown')}")
        except FileNotFoundError as e:
            logger.warning(f"Model artifacts not found: {e}. Using mock mode.")
            cls._ready = False

    @classmethod
    def is_ready(cls) -> bool:
        return cls._ready

    @classmethod
    def risk_model(cls):
        return cls._risk_model

    @classmethod
    def uplift_models(cls):
        return cls._uplift_models

    @classmethod
    def meta(cls):
        return cls._meta or {"version": "mock"}
