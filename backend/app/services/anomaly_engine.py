import os
import logging
import numpy as np
from typing import Dict, Any, List
import joblib
from sklearn.ensemble import IsolationForest

logger = logging.getLogger(__name__)

class AnomalyModelLoadError(Exception):
    """Raised when the joblib model fails to load from disk."""
    pass

class AnomalyEngine:
    """
    Unsupervised Isolation Forest novelty detector (Person 3).
    Evaluates transactions for multi-dimensional anomalies that evade rules.
    """
    def __init__(self):
        self.model = None
        self._load_model()

    def _load_model(self):
        """
        Attempts to load the pre-trained isolation_forest.joblib model.
        Falls back to a baseline trained on dummy synthetic data if missing.
        """
        paths = [
            "backend/artifacts/isolation_forest.joblib",
            "MuleNet/backend/artifacts/isolation_forest.joblib",
            "artifacts/isolation_forest.joblib"
        ]
        for p in paths:
            if os.path.exists(p):
                try:
                    self.model = joblib.load(p)
                    logger.info(f"[AnomalyEngine] Loaded IF model from {p}")
                    return
                except Exception as e:
                    logger.warning(f"[AnomalyEngine] Load failed for {p}: {e}")
        
        logger.warning("[AnomalyEngine] No IF model found. Training fallback.")
        self.model = IsolationForest(contamination=0.03, random_state=42)
        dummy_data = np.array([
            [100.0, 1.0, 0.0], [250.0, 2.0, 0.0], [500.0, 1.0, 0.0],
            [1200.0, 3.0, 0.0], [50.0, 1.0, 0.0], [80.0, 1.5, 0.5],
            [300.0, 2.5, 1.0], [600.0, 1.2, 0.1], [900.0, 2.8, 0.2]
        ])
        self.model.fit(dummy_data)

    def _prepare_features(self, amount: float, velocity: float, setup_gap: float) -> np.ndarray:
        """
        Cleans and normalizes input features for the Isolation Forest.
        Handles missing values, NaNs, and bounds clipping to prevent
        inference errors on wild data streams.
        """
        amt = float(amount) if amount is not None else 0.0
        vel = float(velocity) if velocity is not None else 0.0
        gap = float(setup_gap) if setup_gap is not None else 9999.0

        if np.isnan(amt) or amt < 0: amt = 0.0
        if np.isnan(vel) or vel < 0: vel = 0.0
        if np.isnan(gap) or gap < 0: gap = 9999.0
        
        # Clip extreme outliers that might destabilize the predict bounds
        amt = min(amt, 1000000.0)
        vel = min(vel, 1000.0)
        gap = min(gap, 100000.0)

        return np.array([[amt, vel, gap]])
