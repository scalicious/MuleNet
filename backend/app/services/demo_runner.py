import asyncio
import json
from typing import AsyncGenerator, Dict, Any, Optional, List
from datetime import datetime
import random
import logging

logger = logging.getLogger(__name__)

class DemoRunner:
    """
    Asynchronous event generator for the live replay stream (Person 5 Deliverable).
    Powers the /demo/stream Server-Sent Events (SSE) feed and handles real-time attack injections.
    """
    
    SUPPORTED_SCENARIOS = {
        "ATO": {
            "name": "Rapid Pass-Through Mule Behavior",
            "aliases": ["ATO", "ACCOUNT_TAKEOVER", "SIMULATE_ACCOUNT_TAKEOVER", "PASS_THROUGH", "RAPID_PASS_THROUGH"],
            "default_amount": 49500.0,
            "fused_score": 0.93,
            "risk_tier": "CRITICAL",
            "recommended_action": "HOLD_FOR_REVIEW",
            "evidence": "Large transfer executed 2 minutes after account/payee modification."
        },
        "SMURFING": {
            "name": "Smurfing / Structuring",
            "aliases": ["SMURFING", "STRUCTURING", "SIMULATE_SMURFING"],
            "default_amount": 9500.0,
            "fused_score": 0.86,
            "risk_tier": "CRITICAL",
            "recommended_action": "HOLD_FOR_REVIEW",
            "evidence": "3 transactions detected just below the $10k reporting threshold."
        },
        "RING_WASH": {
            "name": "Cross-Bank Coordinated Mule Ring",
            "aliases": ["RING_WASH", "MULE_RING", "SIMULATE_MULE_RING", "CIRCULAR_RING", "RING"],
            "default_amount": 45000.0,
            "fused_score": 0.96,
            "risk_tier": "CRITICAL",
            "recommended_action": "HOLD_FOR_REVIEW",
            "evidence": "Account identified in a circular transaction flow traversing multiple financial entities."
        },
        "FAN_IN": {
            "name": "Fan-In Collection Hub",
            "aliases": ["FAN_IN", "COLLECTION_HUB", "SIMULATE_FAN_IN", "FAN_IN_HUB"],
            "default_amount": 32000.0,
            "fused_score": 0.88,
            "risk_tier": "CRITICAL",
            "recommended_action": "HOLD_FOR_REVIEW",
            "evidence": "Account interacts with 6 distinct counterparties in active window."
        }
    }

    def __init__(self):
        self.injected_queue: asyncio.Queue = asyncio.Queue()

    def get_queue_depth(self) -> int:
        """Returns the number of pending injected attack events waiting to be streamed."""
        return self.injected_queue.qsize()

    def clear_injected_queue(self) -> int:
        """Clears all pending injected scenarios from the queue."""
        cleared_count = 0
        while not self.injected_queue.empty():
            try:
                self.injected_queue.get_nowait()
                cleared_count += 1
            except asyncio.QueueEmpty:
                break
        logger.info(f"[DemoRunner] Cleared {cleared_count} items from injection queue.")
        return cleared_count

    def normalize_scenario_type(self, raw_scenario: str) -> str:
        """Normalizes free-form scenario names or UI button labels into canonical keys."""
        normalized = raw_scenario.strip().upper().replace("-", "_").replace(" ", "_")
        for canon_key, meta in self.SUPPORTED_SCENARIOS.items():
            if normalized == canon_key or normalized in meta["aliases"]:
                return canon_key
        return "ATO"  # Fallback canonical key

    async def inject_scenario(
        self,
        scenario_type: str,
        account_id: Optional[str] = None,
        amount: Optional[float] = None
    ) -> Dict[str, Any]:
        """
        Injects a simulated attack pattern into the live scoring stream.
        Directly matches Person 5's /simulator/inject workflow.
        """
        canonical_key = self.normalize_scenario_type(scenario_type or "ATO")
        config = self.SUPPORTED_SCENARIOS.get(canonical_key, self.SUPPORTED_SCENARIOS["ATO"])
        
        effective_amount = float(amount) if amount is not None and amount > 0 else config["default_amount"]
        sender = account_id or f"BANK01_ACC{random.randint(1000, 9999)}"
        receiver = f"BANK04_ACC{random.randint(5000, 9999)}"
        
        # Build precise forensic evidence string
        typology_name = config["name"]
        if canonical_key == "ATO":
            typology_evidence = f"Large transfer (${effective_amount:,.2f}) executed 2 minutes after account/payee modification."
        else:
            typology_evidence = config["evidence"]

        scenario_event = {
            "transaction_id": f"INJ-{random.randint(10000, 99999)}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender_id": sender,
            "receiver_id": receiver,
            "amount": effective_amount,
            "currency": "USD",
            "fused_score": config["fused_score"],
            "risk_tier": config["risk_tier"],
            "recommended_action": config["recommended_action"],
            "lenses": {
                "sequence_score": 0.95 if canonical_key in ["ATO", "SMURFING"] else 0.45,
                "network_score": 0.98 if canonical_key in ["RING_WASH", "FAN_IN"] else 0.38,
                "context_score": 0.75,
                "anomaly_score": 0.82
            },
            "typologies": [
                {
                    "name": typology_name,
                    "evidence": typology_evidence
                }
            ],
            "shap_factors": [
                {
                    "feature": "injected_attack_signature",
                    "impact": 0.55,
                    "explanation": f"Pattern matches known {canonical_key} risk profile."
                }
            ]
        }
        
        logger.info(f"[DemoRunner] Queuing injection scenario: {canonical_key} (${effective_amount:,.2f})")
        await self.injected_queue.put(scenario_event)
        return scenario_event

    async def stream_transactions(self, interval_seconds: float = 2.5) -> AsyncGenerator[str, None]:
        """
        Continuously generates and streams SSE events to Person 1's LiveTransactionFeed component.
        Prioritizes user/judge injected scenarios from the queue, otherwise generates realistic background baseline traffic.
        """
        logger.info("[DemoRunner] Client connected to live SSE transaction stream.")
        try:
            while True:
                # 1. Process injected attacks first if available in the queue
                if not self.injected_queue.empty():
                    event_data = await self.injected_queue.get()
                    logger.info(f"[DemoRunner] Dispatching injected attack event: {event_data['transaction_id']}")
                else:
                    # 2. Generate baseline background transaction
                    is_risky = (random.random() < 0.15)
                    amt = random.uniform(5000, 50000) if is_risky else random.uniform(20, 1500)
                    score = random.uniform(0.75, 0.95) if is_risky else random.uniform(0.02, 0.25)
                    tier = "CRITICAL" if score > 0.85 else ("HIGH" if score > 0.60 else ("MEDIUM" if score > 0.30 else "LOW"))
                    action = "HOLD_FOR_REVIEW" if tier == "CRITICAL" else ("STEP_UP_AUTH" if tier == "HIGH" else ("SOFT_CHALLENGE" if tier == "MEDIUM" else "ALLOW"))

                    event_data = {
                        "transaction_id": f"TXN-{random.randint(10000, 99999)}",
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "sender_id": f"BANK01_ACC{random.randint(1000, 9999)}",
                        "receiver_id": f"BANK02_ACC{random.randint(1000, 9999)}",
                        "amount": round(amt, 2),
                        "currency": "USD",
                        "fused_score": round(score, 2),
                        "risk_tier": tier,
                        "recommended_action": action,
                        "lenses": {
                            "sequence_score": round(score * random.uniform(0.9, 1.1), 2),
                            "network_score": round(score * random.uniform(0.8, 1.0), 2),
                            "context_score": round(score * random.uniform(0.7, 0.9), 2),
                            "anomaly_score": round(score * random.uniform(0.85, 1.05), 2),
                        },
                        "typologies": [
                            {"name": "Rapid Pass-Through Mule Behavior", "evidence": "Funds forwarded quickly."}
                        ] if is_risky else [],
                        "shap_factors": [
                            {"feature": "setup_gap", "impact": 0.35, "explanation": "Rapid modification before transfer."}
                        ] if is_risky else []
                    }

                yield f"data: {json.dumps(event_data)}\n\n"
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            logger.info("[DemoRunner] SSE transaction stream connection cancelled by client.")
            raise

demo_runner = DemoRunner()

