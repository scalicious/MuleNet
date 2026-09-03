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
