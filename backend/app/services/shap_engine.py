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
    ),
    "feature_std": (
        "Amount z-score {val:.2f}: this transfer deviates significantly "
        "from the account's historical transaction distribution."
    ),
    "amount_zscore": (
        "Amount z-score {val:.2f}: transaction amount is a statistical "
        "outlier vs account history."
    ),
    "setup_gap_minutes": (
        "Setup-to-action gap: {val:.0f} minutes between last credential "
        "change and this transfer — ATO indicator."
    ),
    "logins_1h": (
        "{val:.0f} logins in the past hour — unusually high session "
        "velocity before this transfer."
    ),
    "dormancy_flag": (
        "Account was dormant before this transfer — reactivation-then-burst "
        "pattern is a strong AML signal."
    ),
    "new_device_flag": (
        "Transaction from an unrecognised device in the same session window "
        "as account credential changes."
    ),
    "payee_added_flag": (
        "Payee added within 30 minutes of this transfer — same-session "
        "payee-add is a top ATO indicator."
    ),
}

_DEFAULT_EXPLANATION = "Feature {name} (value: {val:.3f}) contributes to elevated risk score."


class SHAPExplainabilityEngine:
    """
    Wraps SHAP TreeExplainer for XGBoost-based sequence risk models.
    Falls back to magnitude-ranked raw feature values when SHAP is unavailable.
    """

    FEATURE_ORDER = [
        "flow_imbalance", "fan_in_out_ratio", "degree_vs_time_mean",
        "in_degree_ratio", "out_degree_ratio", "log_total_degree",
        "extreme_feature_count_2", "extreme_feature_count_3",
        "feature_mean", "feature_std",
    ]

    def __init__(self):
        self.explainer: Optional[Any] = None

    def init_explainer(self, model: Any) -> None:
        """
        Initialises the SHAP TreeExplainer from a trained XGBClassifier.
        Must be called after model weights are loaded.
        """
        if not _SHAP_AVAILABLE:
            print("[SHAPEngine] SHAP library not installed — using fallback attribution.")
            return
        try:
            self.explainer = _shap.TreeExplainer(model)
            print("[SHAPEngine] TreeExplainer initialised successfully.")
        except Exception as e:
            print(f"[SHAPEngine] TreeExplainer init error: {e}")
            self.explainer = None

    def explain(
        self,
        feature_vector: np.ndarray,
        feature_values_dict: Dict[str, float],
        top_n: int = 4
    ) -> List[Dict[str, Any]]:
        """
        Computes SHAP values for the given feature vector and returns the
        top-N features by absolute SHAP impact.

        Args:
            feature_vector    : (1, F) numpy array matching FEATURE_ORDER
            feature_values_dict: mapping of feature name → raw value
            top_n             : maximum factors to return

        Returns:
            list of dicts with keys: feature, impact, explanation
        """
        if self.explainer is not None and _SHAP_AVAILABLE:
            return self._shap_explain(feature_vector, feature_values_dict, top_n)
        else:
            return self._fallback_explain(feature_values_dict, top_n)

    # ------------------------------------------------------------------
    # Private
    # ------------------------------------------------------------------

    def _shap_explain(
        self,
        feature_vector: np.ndarray,
        feature_values_dict: Dict[str, float],
        top_n: int
    ) -> List[Dict[str, Any]]:
        try:
            shap_values = self.explainer.shap_values(feature_vector)
            # For binary classifiers: shap_values is list[2 arrays] or single array
            if isinstance(shap_values, list):
                sv = shap_values[1][0]   # class=1 SHAP values
            else:
                sv = shap_values[0]

            # Pair with feature names
            pairs = list(zip(self.FEATURE_ORDER, sv.tolist()))
            pairs.sort(key=lambda x: abs(x[1]), reverse=True)

            results = []
            for fname, impact in pairs[:top_n]:
                raw_val = feature_values_dict.get(fname, 0.0)
                results.append({
                    "feature": fname,
                    "impact": round(float(impact), 4),
                    "explanation": self._build_explanation(fname, raw_val),
                })
            return results

        except Exception as e:
            print(f"[SHAPEngine] SHAP explain error: {e}")
            return self._fallback_explain(feature_values_dict, top_n)

    def _fallback_explain(
        self,
        feature_values_dict: Dict[str, float],
        top_n: int
    ) -> List[Dict[str, Any]]:
        """
        When SHAP is unavailable, rank features by raw value magnitude
        as a proxy for impact.
        """
        ranked = sorted(
            [(k, v) for k, v in feature_values_dict.items() if k in self.FEATURE_ORDER],
            key=lambda x: abs(x[1]),
            reverse=True
        )
        results = []
        for fname, raw_val in ranked[:top_n]:
            results.append({
                "feature": fname,
                "impact": round(float(raw_val) * 0.1, 4),  # scaled proxy
                "explanation": self._build_explanation(fname, raw_val),
            })
        return results

    @staticmethod
    def _build_explanation(feature_name: str, raw_value: float) -> str:
        template = _FEATURE_EXPLANATIONS.get(feature_name, _DEFAULT_EXPLANATION)
        try:
            return template.format(val=raw_value, name=feature_name)
        except Exception:
            return _DEFAULT_EXPLANATION.format(name=feature_name, val=raw_value)


shap_engine = SHAPExplainabilityEngine()
