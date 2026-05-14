"""
ClinicFlow Model Training
Trains:
  1. Logistic Regression baseline (interpretability)
  2. XGBoost risk model (production)
  3. Uplift models per intervention (SMS, call, overbook)
  4. Calibration wrappers

Run: python scripts/train_models.py
"""
import os
import json
import joblib
import numpy as np
import pandas as pd
from pathlib import Path
from datetime import datetime

from sklearn.linear_model import LogisticRegression
from sklearn.calibration import CalibratedClassifierCV
from sklearn.model_selection import TimeSeriesSplit
from sklearn.metrics import roc_auc_score, brier_score_loss
from sklearn.preprocessing import label_binarize
import xgboost as xgb

from app.ml.features import engineer_features_batch, FEATURE_COLUMNS

ARTIFACTS_DIR = Path("./artifacts")
ARTIFACTS_DIR.mkdir(exist_ok=True)


def train_risk_model(X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray):
    """Train and calibrate XGBoost risk model."""
    print("Training XGBoost risk model...")

    xgb_model = xgb.XGBClassifier(
        n_estimators=300,
        max_depth=5,
        learning_rate=0.05,
        subsample=0.8,
        colsample_bytree=0.8,
        min_child_weight=10,
        use_label_encoder=False,
        eval_metric="logloss",
        random_state=42,
        n_jobs=-1,
    )
    xgb_model.fit(
        X_train, y_train,
        eval_set=[(X_val, y_val)],
        verbose=False,
    )

    # Calibrate with isotonic regression
    calibrated = CalibratedClassifierCV(xgb_model, cv="prefit", method="isotonic")
    calibrated.fit(X_val, y_val)

    probs = calibrated.predict_proba(X_val)[:, 1]
    auroc = roc_auc_score(y_val, probs)
    brier = brier_score_loss(y_val, probs)
    print(f"  AUROC: {auroc:.4f} | Brier: {brier:.4f}")

    return calibrated, {"auroc": auroc, "brier": brier}


def train_baseline_model(X_train: np.ndarray, y_train: np.ndarray, X_val: np.ndarray, y_val: np.ndarray):
    """Logistic regression baseline for interpretability."""
    print("Training LR baseline...")
    lr = LogisticRegression(max_iter=500, C=1.0, random_state=42)
    lr.fit(X_train, y_train)
    probs = lr.predict_proba(X_val)[:, 1]
    auroc = roc_auc_score(y_val, probs)
    print(f"  Baseline AUROC: {auroc:.4f}")
    return lr


def train_uplift_models(df: pd.DataFrame):
    """
    S-Learner uplift: train separate outcome models per intervention group.
    In real data this requires A/B experiment data.
    Here we simulate treatment assignment and outcomes.
    """
    print("Training uplift models (S-Learner)...")
    uplift_models = {}
    for intervention in ["sms", "call", "overbook"]:
        # Simulate treated subset
        treated = df.sample(frac=0.3, random_state=hash(intervention) % 2**31)
        X_t = engineer_features_batch(treated).values
        # Simulate uplift: intervention reduces noshow prob by some amount
        effect = {"sms": 0.08, "call": 0.15, "overbook": 0.05}[intervention]
        y_t = np.maximum(0, treated["no_show"].values - np.random.uniform(0, effect * 2, len(treated)))
        y_t = (y_t > 0.5).astype(int)

        m = xgb.XGBClassifier(n_estimators=100, max_depth=4, random_state=42, n_jobs=-1)
        m.fit(X_t, y_t, verbose=False)
        uplift_models[intervention] = m

    return uplift_models


def main():
    print("=" * 60)
    print("ClinicFlow Model Training")
    print("=" * 60)

    data_path = Path("./data/appointments.csv")
    if not data_path.exists():
        print("❌ data/appointments.csv not found. Run scripts/generate_data.py first.")
        return

    df = pd.read_csv(data_path, parse_dates=["appointment_dt", "scheduled_at"])
    df = df.dropna(subset=["no_show"])
    df["no_show"] = df["no_show"].astype(int)
    print(f"Loaded {len(df):,} appointments | No-show rate: {df['no_show'].mean():.2%}")

    # Temporal split — no data leakage
    df = df.sort_values("appointment_dt")
    split_idx = int(len(df) * 0.8)
    val_idx = int(len(df) * 0.9)

    train_df = df.iloc[:split_idx]
    val_df = df.iloc[split_idx:val_idx]

    X_train = engineer_features_batch(train_df).values
    y_train = train_df["no_show"].values
    X_val = engineer_features_batch(val_df).values
    y_val = val_df["no_show"].values

    # Train models
    risk_model, metrics = train_risk_model(X_train, y_train, X_val, y_val)
    baseline = train_baseline_model(X_train, y_train, X_val, y_val)
    uplift_models = train_uplift_models(train_df)

    # Save artifacts
    version = datetime.now().strftime("%Y%m%d_%H%M")
    joblib.dump(risk_model, ARTIFACTS_DIR / "risk_model.pkl")
    joblib.dump(baseline, ARTIFACTS_DIR / "baseline_model.pkl")
    joblib.dump(uplift_models, ARTIFACTS_DIR / "uplift_models.pkl")
    joblib.dump(FEATURE_COLUMNS, ARTIFACTS_DIR / "feature_columns.pkl")

    # Save metadata
    meta = {
        "version": version,
        "train_rows": len(train_df),
        "val_rows": len(val_df),
        "noshow_rate_train": float(y_train.mean()),
        "noshow_rate_val": float(y_val.mean()),
        "auroc": metrics["auroc"],
        "brier": metrics["brier"],
        "features": FEATURE_COLUMNS,
    }
    with open(ARTIFACTS_DIR / "model_meta.json", "w") as f:
        json.dump(meta, f, indent=2)

    # Save reference distribution for PSI monitoring
    feature_df = engineer_features_batch(train_df)
    feature_df.describe().to_csv(ARTIFACTS_DIR / "reference_distribution.csv")

    print("\n✅ Training complete!")
    print(f"   Version: {version}")
    print(f"   AUROC:   {metrics['auroc']:.4f}")
    print(f"   Brier:   {metrics['brier']:.4f}")
    print(f"   Saved to {ARTIFACTS_DIR}/")


if __name__ == "__main__":
    main()
