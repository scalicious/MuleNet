import logging
from typing import List, Dict, Any
from app.models.schema import ShapFactor

logger = logging.getLogger(__name__)

class ExplainabilityEngine:
    """
    Translates ML feature impacts and graph attention signals
    into investigator-ready plain-language reasons.
    """
    
    # Dictionary mapping sequence feature names to human readable sentence templates.
    SEQUENCE_DICTIONARY = {
        "setup_to_action_gap": "Account or payee modifications were made suspiciously close to the transfer.",
        "time_since_last_profile_change": "Recent updates to the account profile triggered elevated risk protocols.",
        "dormancy_then_activity_flag": "Account reactivated with high volume after a prolonged period of dormancy.",
        "login_velocity_1h": "High frequency of logins recorded from this account in the past hour.",
        "amount_zscore": "Transaction amount significantly deviates from the historical baseline for this account.",
        "flow_imbalance": "Significant imbalance detected between incoming and outgoing funds.",
        "fan_in_out_ratio": "Account exhibits rapid aggregation or distribution of funds."
    }

    # Dictionary mapping network feature names to human readable sentence templates.
    NETWORK_DICTIONARY = {
        "high_neighborhood_density": "Account operates in a tightly clustered transaction network typical of mule rings.",
        "isolated_node": "Account lacks historical counterparty relationships to establish trust.",
        "extractor_error": "Unable to fully trace the counterparty network subgraph.",
        "known_mule_cluster_adjacency": "Directly transacted with accounts previously flagged for mule activity.",
        "circular_routing_detected": "Funds were traced through a circular path indicative of layering.",
        "device_sharing_syndicate": "Account shares physical device fingerprints with known bad actors.",
        "collection_hub_pattern": "Account functions as a central hub collecting funds from multiple sources.",
        "deep_layering_path": "Transaction forms part of a deep, multi-hop layering chain."
    }
    
    CONTEXT_DICTIONARY = {
        "high_risk_jurisdiction": "Funds are being routed to or from a historically high-risk jurisdiction.",
        "unusual_time_of_day": "Transaction executed during hours highly atypical for this account profile.",
        "velocity_limit_breach": "Account has breached standard volume velocity thresholds for this tier."
    }

    @classmethod
    def _map_feature_to_sentence(cls, feature: str, impact: float, default: str) -> str:
        """
        Maps a raw feature string to its human-readable counterpart based on impact magnitude.
        """
        if feature in cls.SEQUENCE_DICTIONARY:
            base = cls.SEQUENCE_DICTIONARY[feature]
            return f"{base} (Impact: {impact:.2f})"
            
        if feature in cls.NETWORK_DICTIONARY:
            base = cls.NETWORK_DICTIONARY[feature]
            return f"{base} (Network Signal)"
            
        if feature in cls.CONTEXT_DICTIONARY:
            base = cls.CONTEXT_DICTIONARY[feature]
            return f"{base} (Context Signal)"
            
        return default

    @classmethod
    def format_explanations(
        cls,
        sequence_factors: List[Dict[str, Any]],
        network_factors: List[Dict[str, Any]],
        context_factors: List[Dict[str, Any]]
    ) -> List[ShapFactor]:
        """
        Aggregates, sorts, deduplicates, and formats all cross-lens risk factors.
        """
        all_factors = sequence_factors + network_factors + context_factors
        if not all_factors:
            return []
            
        # Deduplicate by feature name keeping highest impact
        deduped = {}
        for factor in all_factors:
            feat_name = factor.get("feature", factor.get("signal", "unknown"))
            impact = float(factor.get("impact", factor.get("weight", 0.0)))
            
            if feat_name not in deduped or abs(impact) > abs(deduped[feat_name].get("impact", 0.0)):
                factor["impact"] = impact
                deduped[feat_name] = factor
                
        # Sort by absolute impact descending
        sorted_factors = sorted(deduped.values(), key=lambda x: abs(x.get("impact", 0.0)), reverse=True)

        results = []
        for f in sorted_factors[:5]:
            feat_name = f.get("feature", f.get("signal", "unknown"))
            impact = float(f.get("impact", f.get("weight", 0.0)))
            default_exp = f.get("explanation", "Contributing risk factor.")
            
            human_exp = cls._map_feature_to_sentence(feat_name, impact, default_exp)
            
            results.append(ShapFactor(
                feature=feat_name,
                impact=round(impact, 3),
                explanation=human_exp
            ))
            
        return results

explainability_engine = ExplainabilityEngine()
