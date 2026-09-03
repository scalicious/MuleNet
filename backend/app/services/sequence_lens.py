"""
Sequence Risk Engine — Person 3 (ML - Sequence & SHAP)

Computes account lifecycle velocity and behavioural features strictly before
as_of_timestamp, then evaluates sequence risk via a trained XGBoost classifier.
SHAP TreeExplainer provides per-feature attribution for every scored transaction.

Feature set (17 features total):
  Lifecycle timing:
    - setup_gap_minutes        : minutes between last credential/payee change and action
    - dormancy_flag            : reactivation after >30 days silence (cold-start burst)
    - new_device_flag          : login from new/unrecognised device in 1h window
    - payee_added_flag         : payee added within 30 minutes of this transfer

  Velocity:
    - logins_1h                : login count in last hour
    - logins_24h               : login count in last 24 hours

  Amount distribution:
    - amount_zscore            : standard deviations from account historical mean
    - feature_mean             : normalised transfer amount (amount / 10000)
    - feature_std              : mirrors amount_zscore for XGB linearity

  Graph-derived behavioural features:
    - flow_imbalance           : |inflow - outflow| / (inflow + outflow)
    - fan_in_out_ratio         : velocity-adjusted counterparty fan proxy
    - degree_vs_time_mean      : transaction count relative to account window
    - in_degree_ratio          : proportion of transactions that are incoming
    - out_degree_ratio         : proportion of transactions that are outgoing
    - log_total_degree         : log(1 + txn_count) for XGB stability

  Multi-dimensional risk co-occurrence:
    - extreme_feature_count_2  : count of features at 80th+ percentile
    - extreme_feature_count_3  : count of features at 95th+ percentile

Inference pipeline:
    1. CausalFilter strips future events/txns relative to as_of_timestamp
    2. Extract 17 features from filtered account history
    3. XGBClassifier.predict_proba -> P(mule | features)
    4. SHAPExplainabilityEngine.explain -> top-N SHAP attributions
    5. Hard-rule boosts applied on top of ML score for safety-net coverage
    6. Factor deduplication: highest impact per feature key retained
"""

import os
import logging
from typing import Dict, Any, List, Tuple
import numpy as np
import xgboost as xgb

from app.core.causal_filter import CausalFilter
from app.services.shap_engine import shap_engine

logger = logging.getLogger(__name__)

# XGBoost model input column order — must match training pipeline exactly
FEATURE_ORDER = [
    "flow_imbalance",
    "fan_in_out_ratio",
    "degree_vs_time_mean",
    "in_degree_ratio",
    "out_degree_ratio",
    "log_total_degree",
    "extreme_feature_count_2",
    "extreme_feature_count_3",
    "feature_mean",
    "feature_std",
]

# Rule boost thresholds — calibrated against IBM AML dataset distributions
SETUP_GAP_CRITICAL_MINUTES = 5.0    # ≤ 5 min: high probability ATO
SETUP_GAP_HIGH_MINUTES     = 60.0   # ≤ 60 min: elevated risk
AMOUNT_ZSCORE_HIGH         = 3.0    # z > 3: statistically extreme amount
LOGIN_VELOCITY_HIGH        = 4      # ≥ 4 logins/hour: session storm
DORMANCY_HIGH_AMOUNT       = 5000.0 # reactivation + large amount


class SequenceRiskEngine:
    """
    Evaluates behavioural sequence risk for a pending transaction using
