import os

with open("backend/app/services/demo_runner.py", "w") as f:
    f.write("""import asyncio
import json
import csv
import random
import os
from typing import AsyncGenerator, Dict, Any, Optional, List
from datetime import datetime
import logging

logger = logging.getLogger(__name__)

class DemoRunner:
    def __init__(self):
        self.injected_queue: asyncio.Queue = asyncio.Queue()
        self.test_data = []
        self.laundering_data = []
        self.normal_data = []
        self._load_csv()

    def _load_csv(self):
        csv_path = os.path.join(os.path.dirname(__file__), "..", "..", "..", "..", "data", "processed", "ibm_trans_test.csv")
        if not os.path.exists(csv_path):
            logger.warning(f"CSV not found at {csv_path}")
            return
            
        with open(csv_path, "r", encoding="utf-8") as f:
            reader = csv.reader(f)
            next(reader)  # Skip header
            for row in reader:
                if len(row) < 11:
                    continue
                # Indices: 2: Sender Acc, 4: Receiver Acc, 5: Amount, 10: Is Laundering
                is_laundering = int(row[10])
                tx = {
                    "sender_id": row[2],
                    "receiver_id": row[4],
                    "amount": float(row[5])
                }
                if is_laundering == 1:
                    self.laundering_data.append(tx)
                else:
                    self.normal_data.append(tx)
        logger.info(f"Loaded {len(self.laundering_data)} frauds and {len(self.normal_data)} normals from test set.")

    def get_queue_depth(self) -> int:
        return self.injected_queue.qsize()

    def clear_injected_queue(self) -> int:
        cleared = 0
        while not self.injected_queue.empty():
            try:
                self.injected_queue.get_nowait()
                cleared += 1
            except asyncio.QueueEmpty:
                break
        return cleared

    async def inject_scenario(self, scenario_type: str, account_id: Optional[str] = None, amount: Optional[float] = None) -> Dict[str, Any]:
        tx = random.choice(self.laundering_data) if self.laundering_data else {"sender_id": "MOCK", "receiver_id": "MOCK2", "amount": 9999.0}
        
        scenario_event = {
            "transaction_id": f"INJ-{random.randint(10000, 99999)}",
            "timestamp": datetime.utcnow().isoformat() + "Z",
            "sender_id": tx["sender_id"],
            "receiver_id": tx["receiver_id"],
            "amount": tx["amount"],
            "currency": "USD",
            "fused_score": 0.95,
            "risk_tier": "CRITICAL",
            "recommended_action": "HOLD_FOR_REVIEW",
            "lenses": {
                "sequence_score": 0.96,
                "network_score": 0.92,
                "context_score": 0.85,
                "anomaly_score": 0.91
            },
            "typologies": [{"name": "Ground Truth Fraud", "evidence": "Labelled as Is Laundering=1 in IBM Test Set"}],
            "shap_factors": [{"feature": "historical_fraud_label", "impact": 0.60, "explanation": "Row extracted directly from laundering test data."}]
        }
        await self.injected_queue.put(scenario_event)
        return scenario_event

    async def stream_transactions(self, interval_seconds: float = 2.5) -> AsyncGenerator[str, None]:
        logger.info("[DemoRunner] Client connected to live SSE transaction stream.")
        try:
            while True:
                if not self.injected_queue.empty():
                    event_data = await self.injected_queue.get()
                else:
                    tx = random.choice(self.normal_data) if self.normal_data else {"sender_id": "N/A", "receiver_id": "N/A", "amount": 100.0}
                    score = random.uniform(0.01, 0.15)
                    event_data = {
                        "transaction_id": f"TXN-{random.randint(10000, 99999)}",
                        "timestamp": datetime.utcnow().isoformat() + "Z",
                        "sender_id": tx["sender_id"],
                        "receiver_id": tx["receiver_id"],
                        "amount": round(tx["amount"], 2),
                        "currency": "USD",
                        "fused_score": round(score, 2),
                        "risk_tier": "LOW",
                        "recommended_action": "ALLOW",
                        "lenses": {
                            "sequence_score": round(score, 2),
                            "network_score": round(score, 2),
                            "context_score": round(score, 2),
                            "anomaly_score": round(score, 2),
                        },
                        "typologies": [],
                        "shap_factors": []
                    }

                yield dict(data=json.dumps(event_data))
                await asyncio.sleep(interval_seconds)
        except asyncio.CancelledError:
            pass

demo_runner = DemoRunner()
""")
