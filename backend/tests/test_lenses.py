import pytest
from app.services.sequence_lens import sequence_risk_engine
from app.services.network_lens import network_risk_engine
from app.services.context_lens import context_risk_engine
from app.services.anomaly_engine import anomaly_engine
from app.services.fusion_engine import risk_fusion_engine
from app.core.memory_graph import memory_graph

def test_sequence_risk_engine_ato_detection():
    account_id = "TEST_ATO_USER"
    now_iso = "2026-03-01T12:00:00Z"
    
    events = [
        {"timestamp": "2026-03-01T11:58:00Z", "event_type": "mobile_number_change"},
        {"timestamp": "2026-03-01T11:59:00Z", "event_type": "payee_added"},
        {"timestamp": "2026-03-01T11:59:30Z", "event_type": "login"},
        {"timestamp": "2026-03-01T11:59:40Z", "event_type": "login"},
        {"timestamp": "2026-03-01T11:59:50Z", "event_type": "login"},
        {"timestamp": "2026-03-01T11:59:55Z", "event_type": "login"},
    ]
    historical_txns = [
        {"timestamp": "2026-02-01T10:00:00Z", "amount": 50.0, "sender_id": account_id}
    ]

    score, factors = sequence_risk_engine.score_sequence(
        account_id=account_id,
        amount=48000.0,
        as_of_timestamp=now_iso,
        events=events,
        historical_txns=historical_txns
    )

    assert score >= 0.70
    assert any(f["feature"] == "setup_to_action_gap" for f in factors)
    assert any(f["feature"] == "amount_zscore" for f in factors)

def test_network_risk_engine_inference():
    score, reasons = network_risk_engine.score_network(
        account_id="BANK01_HUB900",
        counterparty_id="BANK04_SINK99",
        as_of_timestamp="2026-03-01T12:00:00Z",
        graph_manager=memory_graph
    )
    assert 0.0 <= score <= 1.0
    assert isinstance(reasons, list)

def test_context_risk_engine():
    # Standard domestic transaction
    low_score, _ = context_risk_engine.score_context(
        amount=500.0,
        currency="USD",
        counterparty_id="BANK01_LOCAL",
        action_type="ACH"
    )
    assert low_score < 0.30
