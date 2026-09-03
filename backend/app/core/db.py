from sqlmodel import SQLModel, create_engine, Session
from app.config import settings
import sqlite3

# SQLite engine with WAL mode for fast concurrent reads & writes
engine = create_engine(
    settings.DATABASE_URL,
    connect_args={"check_same_thread": False},
    echo=False, pool_recycle=3600
)

def init_db():
    # Enable WAL mode
    with engine.connect() as conn:
        conn.exec_driver_sql("PRAGMA journal_mode=WAL;")
        conn.exec_driver_sql("PRAGMA synchronous=NORMAL;")
    SQLModel.metadata.create_all(engine)
    seed_initial_demo_data()

def seed_initial_demo_data():
    """
    Seeds initial decision logs and in-memory graph topologies for demo presentations.
    """
    import json
    from datetime import datetime
    from sqlmodel import select, func
    from app.models.entities import DecisionLogEntity
    from app.core.memory_graph import memory_graph

    # 1. Seed in-memory graph with baseline demo network
    demo_edges = [
        ("ACC-1042", "ACC-8821", 84920.0, 0.94, True),
        ("ACC-8821", "ACC-9012", 3100.0, 0.48, False),
        ("ACC-6105", "ACC-1042", 92400.0, 0.96, True),
        ("ACC-1022", "ACC-2931", 820.0, 0.14, False),
        ("ACC-2931", "ACC-7734", 18200.0, 0.78, True),
        ("ACC-5419", "ACC-3820", 12500.0, 0.68, False),
        ("ACC-4491", "ACC-9204", 2450.0, 0.32, False),
        ("ACC-3140", "ACC-7218", 6800.0, 0.54, False),
        ("ACC-7218", "ACC-5093", 15400.0, 0.81, True),
        ("ACC-9012", "ACC-5419", 9400.0, 0.72, False),
        ("BANK01_HUB900", "BANK04_SINK99", 45000.0, 0.92, True),
        ("BANK01_ACC1042", "BANK04_ACC9011", 48500.0, 0.97, True),
        ("BANK04_ACC9011", "BANK02_ACC3301", 46000.0, 0.91, True),
        ("BANK02_ACC3301", "BANK01_HUB900", 43500.0, 0.88, True),
    ]

    for src, dst, amt, attn, risky in demo_edges:
        memory_graph.add_transaction_edge(
            sender_id=src,
            receiver_id=dst,
            amount=amt,
            timestamp=datetime.utcnow().isoformat() + "Z",
            currency="USD",
            payment_format="WIRE" if amt > 10000 else "ACH"
        )
        # Attach GAT attention weight attribute directly
        if memory_graph.graph.has_edge(src, dst):
            for k in memory_graph.graph[src][dst]:
                memory_graph.graph[src][dst][k]["gat_attention"] = attn
                memory_graph.graph[src][dst][k]["is_risky"] = risky

    # 2. Seed SQLite decisions_log if empty (matches Person 5 Data Entry 2 workflow)
    with Session(engine) as session:
        count = session.exec(select(func.count(DecisionLogEntity.id))).one()
        if count == 0:
            sample_decisions = [
                DecisionLogEntity(
                    transaction_id="TXN-80412",
                    sender_id="BANK04_ACC9011",
                    receiver_id="BANK02_ACC3301",
                    amount=48500.0,
                    currency="USD",
                    timestamp="2026-09-04T01:28:00Z",
                    fused_score=0.97,
                    risk_tier="CRITICAL",
                    recommended_action="HOLD_FOR_REVIEW",
                    is_synthetic_risk=1,
                    decision_payload=json.dumps({
                        "transaction_id": "TXN-80412",
                        "sender_id": "BANK04_ACC9011",
                        "receiver_id": "BANK02_ACC3301",
                        "amount": 48500.0,
                        "currency": "USD",
                        "fused_score": 0.97,
                        "risk_tier": "CRITICAL",
                        "recommended_action": "HOLD_FOR_REVIEW",
                        "lenses": {"sequence_score": 0.98, "network_score": 0.92, "context_score": 0.85, "anomaly_score": 0.94},
                        "typologies": [{"name": "Rapid Pass-Through Mule Behavior", "evidence": "The sender forwarded 97% of recently received funds within 8 minutes."}],
                        "shap_factors": [{"feature": "setup_gap", "impact": 0.42, "explanation": "Wire initiated 8 minutes post account setup."}]
                    })
                ),
                DecisionLogEntity(
                    transaction_id="TXN-80411",
                    sender_id="BANK01_ACC1022",
                    receiver_id="BANK01_ACC2931",
                    amount=4.50,
                    currency="USD",
                    timestamp="2026-09-04T01:25:00Z",
                    fused_score=0.08,
                    risk_tier="LOW",
                    recommended_action="ALLOW",
                    is_synthetic_risk=0,
                    decision_payload=json.dumps({
                        "transaction_id": "TXN-80411",
                        "sender_id": "BANK01_ACC1022",
                        "receiver_id": "BANK01_ACC2931",
                        "amount": 4.50,
                        "currency": "USD",
                        "fused_score": 0.08,
                        "risk_tier": "LOW",
                        "recommended_action": "ALLOW",
                        "lenses": {"sequence_score": 0.05, "network_score": 0.08, "context_score": 0.06, "anomaly_score": 0.05},
                        "typologies": [],
                        "shap_factors": []
                    })
                ),
                DecisionLogEntity(
                    transaction_id="TXN-80410",
                    sender_id="BANK01_ACC1042",
                    receiver_id="BANK04_ACC9011",
                    amount=45000.0,
                    currency="USD",
                    timestamp="2026-09-04T01:20:00Z",
                    fused_score=0.94,
                    risk_tier="CRITICAL",
                    recommended_action="HOLD_FOR_REVIEW",
                    is_synthetic_risk=1,
                    decision_payload=json.dumps({
                        "transaction_id": "TXN-80410",
                        "sender_id": "BANK01_ACC1042",
                        "receiver_id": "BANK04_ACC9011",
                        "amount": 45000.0,
                        "currency": "USD",
                        "fused_score": 0.94,
                        "risk_tier": "CRITICAL",
                        "recommended_action": "HOLD_FOR_REVIEW",
                        "lenses": {"sequence_score": 0.95, "network_score": 0.94, "context_score": 0.82, "anomaly_score": 0.91},
                        "typologies": [{"name": "Cross-Bank Coordinated Mule Ring", "evidence": "Account identified in a circular transaction flow traversing multiple financial entities."}],
                        "shap_factors": [{"feature": "ring_centrality", "impact": 0.45, "explanation": "High GAT attention link in 4-node cycle."}]
                    })
                ),
                DecisionLogEntity(
                    transaction_id="TXN-80409",
                    sender_id="BANK01_ACC5419",
                    receiver_id="BANK02_ACC3820",
                    amount=9800.0,
                    currency="USD",
                    timestamp="2026-09-04T01:15:00Z",
                    fused_score=0.72,
                    risk_tier="HIGH",
                    recommended_action="STEP_UP_AUTH",
                    is_synthetic_risk=0,  # False challenge on legitimate txn
                    decision_payload=json.dumps({
                        "transaction_id": "TXN-80409",
                        "sender_id": "BANK01_ACC5419",
                        "receiver_id": "BANK02_ACC3820",
                        "amount": 9800.0,
                        "currency": "USD",
                        "fused_score": 0.72,
                        "risk_tier": "HIGH",
                        "recommended_action": "STEP_UP_AUTH",
                        "lenses": {"sequence_score": 0.75, "network_score": 0.65, "context_score": 0.60, "anomaly_score": 0.70},
                        "typologies": [{"name": "Smurfing / Structuring", "evidence": "Amount just below the $10k reporting threshold."}],
                        "shap_factors": [{"feature": "amount_structuring", "impact": 0.32, "explanation": "Amount near $10,000 threshold."}]
                    })
                ),
            ]
            for dec in sample_decisions:
                session.add(dec)
            session.commit()
            print("[MuleNet] Initial demo decisions and graph seeded.")

def get_session():
    with Session(engine) as session:
        yield session

