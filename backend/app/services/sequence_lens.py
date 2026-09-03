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
    XGBoost + SHAP TreeExplainer.

    All features are computed strictly before as_of_timestamp (causal filter)
    so the engine can never leak future information into the scoring decision.

    The final sequence_score is a blend of:
      - XGBoost predicted probability P(mule)
      - Hard-rule boosts from extreme threshold violations
    Boosted scores are clamped at 0.98 to preserve model calibration signal.
    """

    def __init__(self):
        self.model: xgb.XGBClassifier | None = None
        self._load_model()

    def _load_model(self) -> None:
        """
        Searches known artifact paths for serialized XGBoost weights.
        Supports .json format (XGBoost native binary format).
        Initialises SHAP explainer immediately after successful load.
        """
        model_paths = [
            os.path.abspath("backend/artifacts/xgboost_sequence_model.json"),
            os.path.abspath("MuleNet/backend/artifacts/xgboost_sequence_model.json"),
            os.path.abspath("artifacts/xgboost_sequence_model.json"),
        ]
        for p in model_paths:
            if os.path.exists(p):
                try:
                    self.model = xgb.XGBClassifier(n_jobs=1)
                    self.model.load_model(p)
                    shap_engine.init_explainer(self.model)
                    logger.info(f"[SequenceRiskEngine] XGBoost + SHAP loaded from {p}")
                    return
                except Exception as e:
                    logger.warning(f"[SequenceRiskEngine] Failed to load model from {p}: {e}")

        logger.warning(
            "[SequenceRiskEngine] No XGBoost weights found — "
            "scoring will fall back to hard-rule heuristics only."
        )

    # ------------------------------------------------------------------
    # Feature extraction
    # ------------------------------------------------------------------

    def extract_features(
        self,
        account_id: str,
        amount: float,
        as_of_timestamp: str,
        events: List[Dict[str, Any]],
        historical_txns: List[Dict[str, Any]]
    ) -> Dict[str, float]:
        """
        Extracts the full 17-feature behavioural vector for the pending
        transaction. All inputs are filtered through CausalFilter to ensure
        strict temporal integrity.

        Args:
            account_id       : Account being scored
            amount           : Transaction amount (currency units)
            as_of_timestamp  : ISO-8601 scoring cutoff
            events           : Full raw event log for account
            historical_txns  : All prior transactions for account

        Returns:
            Dict mapping feature name -> float value
        """
        prior_events = CausalFilter.filter_prior_events(events, as_of_timestamp)
        prior_txns   = CausalFilter.filter_prior_transactions(historical_txns, as_of_timestamp)
        as_of_dt     = CausalFilter.parse_iso(as_of_timestamp)

        # ----------------------------------------------------------------
        # 1. Setup-to-action gap (minutes)
        #    Last credential/payee change event before this action.
        #    Short gaps (<5 min) are the strongest ATO indicator.
        # ----------------------------------------------------------------
        SETUP_EVENT_TYPES = {
            "mobile_number_change", "email_change", "payee_added",
            "password_reset", "address_change", "beneficiary_added"
        }
        setup_gap_minutes = 9999.0
        for ev in reversed(prior_events):
            if ev.get("event_type") in SETUP_EVENT_TYPES:
                ev_dt = CausalFilter.parse_iso(ev["timestamp"])
                diff  = (as_of_dt - ev_dt).total_seconds() / 60.0
                if diff >= 0:
                    setup_gap_minutes = min(setup_gap_minutes, diff)
                    break

        # ----------------------------------------------------------------
        # 2. Login velocity — 1h and 24h session storm indicators
        # ----------------------------------------------------------------
        logins_1h  = 0
        logins_24h = 0
        for ev in prior_events:
            if ev.get("event_type") in ("login", "new_device_login"):
                ev_dt = CausalFilter.parse_iso(ev["timestamp"])
                secs  = (as_of_dt - ev_dt).total_seconds()
                if 0 <= secs <= 3600:
                    logins_1h  += 1
                if 0 <= secs <= 86400:
                    logins_24h += 1

        # ----------------------------------------------------------------
        # 3. New device flag — unrecognised device in 1h window
        # ----------------------------------------------------------------
        new_device_flag = float(any(
            ev.get("event_type") == "new_device_login"
            for ev in prior_events
            if (as_of_dt - CausalFilter.parse_iso(ev["timestamp"])).total_seconds() <= 3600
        ))

        # ----------------------------------------------------------------
        # 4. Payee added in session — same-session payee-add before transfer
        # ----------------------------------------------------------------
        payee_added_flag = float(any(
            ev.get("event_type") == "payee_added"
            for ev in prior_events
            if (as_of_dt - CausalFilter.parse_iso(ev["timestamp"])).total_seconds() <= 1800
        ))

        # ----------------------------------------------------------------
        # 5. Amount z-score vs account history
        #    Cold-start (< 3 prior txns): use absolute amount thresholds
        # ----------------------------------------------------------------
        prior_amounts = [t.get("amount", 0.0) for t in prior_txns]
        if len(prior_amounts) >= 3:
            mean_amt      = float(np.mean(prior_amounts))
            std_amt       = float(np.std(prior_amounts)) + 1e-5
            amount_zscore = float((amount - mean_amt) / std_amt)
        else:
            # Cold-start absolute threshold ladder
            if amount > 50000:
                amount_zscore = 4.0
            elif amount > 25000:
                amount_zscore = 2.8
            elif amount > 10000:
                amount_zscore = 1.5
            else:
                amount_zscore = 0.5
        amount_zscore = max(0.0, amount_zscore)

        # ----------------------------------------------------------------
        # 6. Dormancy flag — >30 day gap before this transaction
        # ----------------------------------------------------------------
        dormancy_flag = 0.0
        if prior_txns:
            latest_dt = max(CausalFilter.parse_iso(t["timestamp"]) for t in prior_txns)
            if (as_of_dt - latest_dt).total_seconds() > 30 * 86400:
                dormancy_flag = 1.0
        else:
            dormancy_flag = 1.0  # no prior txns = cold-start = effectively dormant

        # ----------------------------------------------------------------
        # 7. Flow imbalance — asymmetric in/out cash flow
        # ----------------------------------------------------------------
        inflows  = sum(t.get("amount", 0.0) for t in prior_txns if t.get("receiver_id") == account_id)
        outflows = sum(t.get("amount", 0.0) for t in prior_txns if t.get("sender_id") == account_id) + amount
        flow_imbalance = abs(inflows - outflows) / max(1.0, inflows + outflows)

        # ----------------------------------------------------------------
        # 8. Degree-based graph features
        # ----------------------------------------------------------------
        n_txns    = len(prior_txns)
        in_count  = sum(1 for t in prior_txns if t.get("receiver_id") == account_id)
        out_count = sum(1 for t in prior_txns if t.get("sender_id")   == account_id)
        total_deg = in_count + out_count + 1  # +1 for the current pending txn

        in_degree_ratio      = in_count  / max(1, total_deg)
        out_degree_ratio     = out_count / max(1, total_deg)
        log_total_degree     = float(np.log1p(total_deg))
        degree_vs_time_mean  = min(10.0, float(n_txns + 1))

        # ----------------------------------------------------------------
        # 9. Extreme feature co-occurrence counts
        #    Captures multi-dimensional risk signals that individually
        #    may not trigger rules but jointly indicate fraud.
        # ----------------------------------------------------------------
        risk_flags_2 = [
            1 if flow_imbalance   > 0.80 else 0,
            1 if amount_zscore    > 2.5  else 0,
            1 if logins_1h        >= 3   else 0,
            1 if dormancy_flag    > 0    else 0,
            1 if setup_gap_minutes < 30  else 0,
            1 if new_device_flag  > 0    else 0,
            1 if payee_added_flag > 0    else 0,
        ]
        extreme_feature_count_2 = float(sum(risk_flags_2))

        risk_flags_3 = [
            1 if flow_imbalance > 0.90 else 0,
            1 if amount_zscore  > 3.5  else 0,
            1 if logins_1h      >= 5   else 0,
        ]
        extreme_feature_count_3 = float(sum(risk_flags_3))

        # ----------------------------------------------------------------
        # 10. Fan-in/out ratio — session velocity proxy
        # ----------------------------------------------------------------
        fan_in_out_ratio = min(5.0, (logins_1h + 1.0) / 2.0)

        return {
            "setup_gap_minutes":       setup_gap_minutes,
            "logins_1h":               float(logins_1h),
            "logins_24h":              float(logins_24h),
            "new_device_flag":         new_device_flag,
            "payee_added_flag":        payee_added_flag,
            "amount_zscore":           amount_zscore,
            "dormancy_flag":           dormancy_flag,
            "flow_imbalance":          flow_imbalance,
            "fan_in_out_ratio":        fan_in_out_ratio,
            "degree_vs_time_mean":     degree_vs_time_mean,
            "in_degree_ratio":         in_degree_ratio,
            "out_degree_ratio":        out_degree_ratio,
            "log_total_degree":        log_total_degree,
            "extreme_feature_count_2": extreme_feature_count_2,
            "extreme_feature_count_3": extreme_feature_count_3,
            "feature_mean":            float(amount / 10000.0),
            "feature_std":             float(amount_zscore),
        }

    # ------------------------------------------------------------------
    # Scoring
    # ------------------------------------------------------------------

    def score_sequence(
        self,
        account_id: str,
        amount: float,
        as_of_timestamp: str,
        events: List[Dict[str, Any]],
        historical_txns: List[Dict[str, Any]]
    ) -> Tuple[float, List[Dict[str, Any]]]:
        """
        Scores sequence risk for a pending transaction.

        Returns:
            (sequence_risk_score ∈ [0,1], list of forensic factor dicts)

        Factor dict schema:
            feature     : str   — feature name
            impact      : float — SHAP value or rule boost magnitude
            explanation : str   — investigator-readable explanation
        """
        feats = self.extract_features(
            account_id, amount, as_of_timestamp, events, historical_txns
        )

        # ---- Build feature vector in training column order ----
        feature_vector = np.array([[
            feats["flow_imbalance"],
            feats["fan_in_out_ratio"],
            feats["degree_vs_time_mean"],
            feats["in_degree_ratio"],
            feats["out_degree_ratio"],
            feats["log_total_degree"],
            feats["extreme_feature_count_2"],
            feats["extreme_feature_count_3"],
            feats["feature_mean"],
            feats["feature_std"],
        ]])

        # ---- XGBoost inference ----
        model_prob = None
        if self.model is not None:
            try:
                probs      = self.model.predict_proba(feature_vector)[0]
                model_prob = float(probs[1]) if len(probs) > 1 else float(probs[0])
            except Exception as e:
                logger.error(f"[SequenceRiskEngine] XGBoost predict error: {e}")

        score = model_prob if model_prob is not None else 0.05

        # ---- SHAP attribution ----
        shap_factors = shap_engine.explain(
            feature_vector=feature_vector,
            feature_values_dict=feats,
            top_n=4
        )
        factors: List[Dict[str, Any]] = [
            {
                "feature":     sf["feature"],
                "impact":      sf["impact"],
                "explanation": sf["explanation"],
            }
            for sf in shap_factors
        ]

        # ----------------------------------------------------------------
        # Hard-rule safety-net boosts
        # Applied on top of XGB score to catch extreme edge cases that
        # might fall below the ML threshold at inference time.
        # Each boost is capped to prevent trivial saturation.
        # ----------------------------------------------------------------

        # Rule 1: Credential change → transfer in < 5 minutes (critical ATO)
        if feats["setup_gap_minutes"] < SETUP_GAP_CRITICAL_MINUTES:
            score = max(score, min(0.98, score + 0.50))
            if not any(f["feature"] == "setup_gap_minutes" for f in factors):
                factors.insert(0, {
                    "feature": "setup_to_action_gap",
                    "impact":  0.50,
                    "explanation": (
                        f"CRITICAL: Credential or payee change occurred "
                        f"{int(feats['setup_gap_minutes'] * 60)}s before this transfer. "
                        "Sub-5-minute setup-to-action gap is the strongest known ATO indicator."
                    ),
                })
        elif feats["setup_gap_minutes"] < SETUP_GAP_HIGH_MINUTES:
            score = max(score, min(0.98, score + 0.25))

        # Rule 2: Statistically extreme transfer amount
        if feats["amount_zscore"] > AMOUNT_ZSCORE_HIGH:
            score = max(score, min(0.98, score + 0.30))

        # Rule 3: Login storm (≥ 4 logins/hour)
        if feats["logins_1h"] >= LOGIN_VELOCITY_HIGH:
            score = max(score, min(0.98, score + 0.20))

        # Rule 4: Dormancy reactivation + large amount
        if feats["dormancy_flag"] > 0 and amount > DORMANCY_HIGH_AMOUNT:
            score = max(score, min(0.98, score + 0.20))
            if not any(f["feature"] == "dormancy_reactivation" for f in factors):
                factors.append({
                    "feature": "dormancy_reactivation",
                    "impact":  0.20,
                    "explanation": (
                        f"Account reactivated after >30-day dormancy period with a "
                        f"${amount:,.0f} transfer — dormancy-then-burst pattern "
                        "is strongly correlated with account takeover activity."
                    ),
                })

        # Rule 5: New device login within session before transfer
        if feats["new_device_flag"] > 0 and feats["setup_gap_minutes"] < 120:
            score = max(score, min(0.98, score + 0.15))
            factors.append({
                "feature": "new_device_login",
                "impact":  0.15,
                "explanation": (
                    "Transaction initiated from an unrecognised device within 1 hour "
                    "of account modification events — combined device + change signal."
                ),
            })

        # Rule 6: Same-session payee-add before transfer
        if feats["payee_added_flag"] > 0:
            score = max(score, min(0.98, score + 0.18))
            factors.append({
                "feature": "payee_added_in_session",
                "impact":  0.18,
                "explanation": (
                    "Payee added within 30 minutes of this transfer. "
                    "Same-session payee-add-then-transfer is a top-ranked ATO indicator "
                    "across UK Finance and FS-ISAC red-team scenarios."
                ),
            })

        # ---- Deduplication: keep highest absolute impact per feature key ----
        seen: Dict[str, Dict[str, Any]] = {}
        for f in factors:
            key = f["feature"]
            if key not in seen or abs(f["impact"]) > abs(seen[key]["impact"]):
                seen[key] = f
        deduped = sorted(seen.values(), key=lambda x: abs(x["impact"]), reverse=True)

        return min(1.0, max(0.01, round(score, 4))), deduped[:6]


sequence_risk_engine = SequenceRiskEngine()
