from typing import Dict, Any, List, Tuple
from datetime import datetime
from app.core.causal_filter import CausalFilter
import numpy as np

class SequenceRiskEngine:
    """
    Computes account lifecycle velocity and anomaly features strictly before as_of_timestamp
    and evaluates sequence risk.
    """
    def __init__(self):
        # ---------------------------------------------------------
        # PERSON 3 PLACEHOLDER: XGBoost Model
        # self.model = xgb.Booster(model_file='xgboost.json')
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        pass

    def extract_features(
        self,
        account_id: str,
        amount: float,
        as_of_timestamp: str,
        events: List[Any],
        historical_txns: List[Any]
    ) -> Dict[str, float]:
        # ---------------------------------------------------------
        # PERSON 3 PLACEHOLDER: Feature Extraction
        # Implement feature functions: 
        # - setup_to_action_gap
        # - time_since_last_profile_change
        # - dormancy_then_activity_flag
        # - login_velocity_1h
        # - amount_zscore
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        
        # Returning dummy features for now
        return {
            "setup_to_action_gap": 999.0,
            "time_since_last_profile_change": 999.0,
            "dormancy_then_activity_flag": 0.0,
            "login_velocity_1h": 0.0,
            "amount_zscore": 0.0
        }

    def score_sequence(
        self,
        account_id: str,
        amount: float,
        as_of_timestamp: str,
        events: List[Any],
        historical_txns: List[Any]
    ) -> Tuple[float, List[Dict[str, Any]]]:
        # ---------------------------------------------------------
        # PERSON 3 PLACEHOLDER: XGBoost Inference
        # Train tabular XGBoost on sequence risks. Predict using the features.
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        feats = self.extract_features(account_id, amount, as_of_timestamp, events, historical_txns)
        
        # Dummy score and factors for Person 4 testing
        score = 0.05
        factors = []
        return min(1.0, round(score, 4)), factors

sequence_risk_engine = SequenceRiskEngine()
