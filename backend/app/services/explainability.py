from typing import List, Dict, Any
from app.models.schema import ShapFactor

class ExplainabilityEngine:
    """
    Translates ML feature impacts and graph attention signals
    into investigator-ready plain-language reasons.
    """
    def __init__(self):
        # ---------------------------------------------------------
        # PERSON 3 PLACEHOLDER: SHAP Explainer
        # Setup SHAP TreeExplainer and build the mapping dictionary 
        # that turns top 3-5 SHAP feature contributions into clean, 
        # human-readable sentences.
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        pass

    @staticmethod
    def format_explanations(
        sequence_factors: List[Dict[str, Any]],
        network_factors: List[Dict[str, Any]],
        context_factors: List[Dict[str, Any]]
    ) -> List[ShapFactor]:
        # ---------------------------------------------------------
        # PERSON 3 PLACEHOLDER: SHAP Output Mapping
        # Map raw SHAP values to natural language here using the dictionary.
        # TO BE CHANGED ACCORDINGLY AS PER THE REQUIREMENT
        # ---------------------------------------------------------
        
        all_factors = sequence_factors + network_factors + context_factors
        if not all_factors:
            return []
        # Sort by absolute impact descending
        sorted_factors = sorted(all_factors, key=lambda x: abs(x.get("impact", 0.0)), reverse=True)

        return [
            ShapFactor(
                feature=f.get("feature", f.get("signal", "unknown")),
                impact=round(float(f.get("impact", f.get("weight", 0.0))), 3),
                explanation=f.get("explanation", "Contributing risk factor.")
            )
            for f in sorted_factors[:4]
        ]

explainability_engine = ExplainabilityEngine()
