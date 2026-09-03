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

    # High-value cross-currency / international wire
    high_score, factors = context_risk_engine.score_context(
        amount=85000.0,
        currency="EUR",
        counterparty_id="BANK99_OFFSHORE",
        action_type="WIRE"
    )
    assert high_score > 0.40

def test_anomaly_engine():
    # Normal transaction
    anom_norm = anomaly_engine.score_anomaly(amount=100.0, velocity=1.0, setup_gap=1000.0)
    # Spike transaction
    anom_spike = anomaly_engine.score_anomaly(amount=95000.0, velocity=10.0, setup_gap=0.5)
    assert 0.0 <= anom_norm <= 1.0
    assert 0.0 <= anom_spike <= 1.0

def test_fusion_engine_decision_matrix():
    # Critical risk combination
    crit_score, crit_tier, crit_action = risk_fusion_engine.fuse_scores(
        seq_score=0.92,
        net_score=0.88,
        ctx_score=0.70,
        anomaly_score=0.85
    )
    assert crit_score >= 0.85
    assert crit_tier.value == "CRITICAL"
    assert crit_action.value == "HOLD_FOR_REVIEW"

    # Low risk combination
    low_score, low_tier, low_action = risk_fusion_engine.fuse_scores(
        seq_score=0.08,
        net_score=0.10,
        ctx_score=0.05,
        anomaly_score=0.05
    )
    assert low_score <= 0.30
    assert low_tier.value == "LOW"
    assert low_action.value == "ALLOW"
