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
