"""
SHAPExplainabilityEngine — Person 2 (ML - GNN) / Person 3 (Sequence)

Wraps SHAP TreeExplainer for post-hoc XGBoost feature attribution.
Provides unified per-feature SHAP impact values and human-readable
forensic explanations for inclusion in transaction dossiers.

Usage:
    shap_engine.init_explainer(xgb_model)
    factors = shap_engine.explain(feature_vector, feature_values_dict, top_n=4)
"""

from typing import List, Dict, Any, Optional
import numpy as np

# SHAP is imported lazily to avoid import errors when shap is not installed
try:
    import shap as _shap
    _SHAP_AVAILABLE = True
except ImportError:
    _SHAP_AVAILABLE = False


# Human-readable template explanations for each known feature
_FEATURE_EXPLANATIONS = {
    "flow_imbalance": (
        "Flow imbalance {val:.2f}: strongly asymmetric cash-flow pattern "
        "(high outflow vs inflow) consistent with mule pass-through."
    ),
    "fan_in_out_ratio": (
        "Fan-in/out ratio {val:.2f}: account exhibits velocity profile "
        "suggesting rapid aggregation and forwarding of funds."
    ),
    "degree_vs_time_mean": (
        "Transaction count {val:.0f} in scoring window — "
        "elevated activity relative to account history."
    ),
    "in_degree_ratio": (
        "In-degree ratio {val:.2f}: disproportionate number of incoming "
        "transfers — possible smurfing collection point."
    ),
    "out_degree_ratio": (
        "Out-degree ratio {val:.2f}: disproportionate outward transfers "
        "detected — consistent with layering distribution node."
    ),
    "log_total_degree": (
        "Log total degree {val:.2f}: logarithmic indicator of unusually "
        "high transaction volume in the scoring window."
    ),
    "extreme_feature_count_2": (
        "{val:.0f} features at extreme risk percentile (>80th) — "
        "multi-dimensional risk co-occurrence signal."
    ),
    "extreme_feature_count_3": (
        "{val:.0f} features at ultra-extreme percentile (>95th) — "
        "very high-confidence multi-factor anomaly."
    ),
    "feature_mean": (
        "Normalised transaction amount {val:.3f} — elevated relative to "
        "account category baseline."
