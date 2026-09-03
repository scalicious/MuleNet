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
