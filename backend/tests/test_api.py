import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app
from app.core.db import init_db

init_db()
client = TestClient(app)

def test_health_endpoint():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}

def test_score_action_and_commit_flow():
    # 1. Score an action
    score_payload = {
        "account_id": "BANK01_ACC1042",
        "counterparty_id": "BANK04_ACC9011",
        "amount": 45000.0,
        "currency": "USD",
        "timestamp": datetime.utcnow().isoformat() + "Z",
        "action_type": "WIRE"
    }

    score_res = client.post("/api/v1/score-action", json=score_payload)
    assert score_res.status_code == 200
    data = score_res.json()
    assert "transaction_id" in data
    assert "fused_score" in data
    assert "risk_tier" in data
    assert "recommended_action" in data
    assert "lenses" in data
    assert "typologies" in data
    assert "shap_factors" in data

    txn_id = data["transaction_id"]

    # 2. Commit the action
    commit_payload = {
        "transaction_id": txn_id,
        "override_reason": "Investigator manual override with two-party clearance."
    }
    commit_res = client.post("/api/v1/commit-action", json=commit_payload)
    assert commit_res.status_code == 200
    commit_data = commit_res.json()
    assert commit_data["status"] == "COMMITTED"

def test_cases_endpoints():
    response = client.get("/api/v1/cases")
    assert response.status_code == 200
    assert isinstance(response.json(), list)

    dossier_res = client.get("/api/v1/cases/DEMO-TXN-101")
    assert dossier_res.status_code == 200
    dossier = dossier_res.json()
    assert "transaction_id" in dossier
    assert "fused_score" in dossier

def test_graph_ego_endpoint():
    res = client.get("/api/v1/graph/ego/BANK01_HUB900?hops=2")
    assert res.status_code == 200
    graph_data = res.json()
    assert "nodes" in graph_data
    assert "links" in graph_data

from app.services.typology_detector import TypologyDetector, typology_detector
from app.api.routes_metrics import compute_metrics_summary
from app.services.demo_runner import demo_runner

def test_metrics_endpoint():
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "prevented_loss_value" in metrics
    assert "total_scored_actions" in metrics
    assert "detection_lead_time_minutes" in metrics
    assert "false_challenge_rate_percent" in metrics
    assert "mule_ring_coverage_percent" in metrics
    assert "flagged_critical_count" in metrics


def test_metrics_computation_empty_state():
    """Validates metrics calculation when no decisions have been logged yet."""
    m = compute_metrics_summary(total_actions=0, critical_count=0, prevented_loss=0.0, false_positives=0)
    assert m.total_scored_actions == 0
    assert m.prevented_loss_value == 0.0
    assert m.detection_lead_time_minutes == 0.0
    assert m.false_challenge_rate_percent == 0.0


def test_metrics_computation_matching_person5_example():
    """
    Validates metrics calculation against Data Entry 2 workflow:
    - 4 actions total: $48,500 (True), $4.50 (Legit), $45,000 (True), $9,800 (False Challenge)
    - Prevented Loss: $48,500 + $45,000 = $93,500.00
    - False Challenge Rate: 1 challenged out of 4 = 25.0%
    - Detection Lead Time: 14.2 + (2 * 0.1) = 14.4 mins
    """
    m = compute_metrics_summary(
        total_actions=4,
        critical_count=2,
        prevented_loss=93500.0,
        false_positives=1,
        mule_ring_coverage_percent=95.0
    )
    assert m.prevented_loss_value == 93500.0
    assert m.false_challenge_rate_percent == 25.0
    assert m.mule_ring_coverage_percent == 95.0
    assert m.total_scored_actions == 4
    assert m.flagged_critical_count == 2
    assert m.detection_lead_time_minutes > 14.0


# ============================================================================
# Person 5 Typology Detector Tests
# ============================================================================

def test_typology_pass_through_by_setup_gap():
    """Validates pass-through mule detection triggered by rapid transaction post-modification."""
    res = TypologyDetector.detect_pass_through(amount=48500.0, setup_gap_minutes=8.0)
    assert res["name"] == "Rapid Pass-Through Mule Behavior"
    assert "48,500.00" in res["evidence"]
    assert "8 minutes" in res["evidence"]

    # Negative check: Slow transfer (> 15 minutes) or low amount (< $5,000)
    assert TypologyDetector.detect_pass_through(amount=48500.0, setup_gap_minutes=30.0) == {}
    assert TypologyDetector.detect_pass_through(amount=500.0, setup_gap_minutes=5.0) == {}


def test_typology_pass_through_by_received_ratio():
    """
    Validates pass-through mule detection based on Person 5 Data Entry 1 workflow:
    Sender received $50,000 and forwarded $48,500 (97% >= 80%) within 8 minutes.
    """
    res = TypologyDetector.detect_pass_through(
        amount=48500.0,
        amount_received=50000.0,
        time_diff_minutes=8.0
    )
    assert res["name"] == "Rapid Pass-Through Mule Behavior"
    assert "97%" in res["evidence"]
    assert "8 minutes" in res["evidence"]

    # Negative check: Low ratio (< 80%) or extended time gap (> 15 minutes)
    low_ratio_res = TypologyDetector.detect_pass_through(
        amount=20000.0,
        amount_received=50000.0,
        time_diff_minutes=8.0
    )
    assert low_ratio_res == {}


def test_typology_fan_in_collection_hub():
    """Validates fan-in collection hub detection when >= 5 incoming counterparties interact."""
    fan_in = TypologyDetector.detect_fan_in_out(neighbor_count=6, is_receiving=True)
    assert fan_in["name"] == "Fan-In Collection Hub"
    assert "6 distinct counterparties" in fan_in["evidence"]
    assert TypologyDetector.detect_fan_in_out(neighbor_count=3, is_receiving=True) == {}


def test_typology_fan_out_distribution_hub():
    """Validates fan-out distribution hub detection when >= 5 outgoing counterparties interact."""
    fan_out = TypologyDetector.detect_fan_in_out(neighbor_count=7, is_receiving=False)
    assert fan_out["name"] == "Fan-Out Distribution Hub"
    assert "7 distinct counterparties" in fan_out["evidence"]


def test_typology_smurfing_structuring():
    """Validates smurfing detection when >= 3 transactions are structured just below $10,000."""
    txns = [9200.0, 9500.0, 9800.0, 200.0]
    res = TypologyDetector.detect_smurfing(txns)
    assert res["name"] == "Smurfing / Structuring"
    assert "3 transactions detected just below the $10k reporting threshold" in res["evidence"]
    assert TypologyDetector.detect_smurfing([9200.0, 9800.0, 1500.0]) == {}


def test_typology_cycle_detection():
    """Validates circular ring detection when marked as ring member or high value with dense neighbors."""
    cycle_ring = TypologyDetector.detect_cycles(is_ring_member=True, amount=1000.0, neighbor_count=1)
    assert cycle_ring["name"] == "Cross-Bank Coordinated Mule Ring"

    cycle_dense = TypologyDetector.detect_cycles(is_ring_member=False, amount=25000.0, neighbor_count=4)
    assert cycle_dense["name"] == "Cross-Bank Coordinated Mule Ring"
    assert TypologyDetector.detect_cycles(is_ring_member=False, amount=15000.0, neighbor_count=2) == {}


def test_typology_aggregation_and_formatting():
    """Validates combined typologies aggregation and plain-language formatting."""
    results = typology_detector.detect_typologies(
        amount=48500.0,
        setup_gap_minutes=5.0,
        neighbor_count=6,
        is_ring_member=True,
        historical_amounts=[9200.0, 9400.0, 9800.0]
    )
    names = [r["name"] for r in results]
    assert "Rapid Pass-Through Mule Behavior" in names
    assert "Fan-In Collection Hub" in names
    assert "Cross-Bank Coordinated Mule Ring" in names

    evidence_doc = TypologyDetector.format_forensic_evidence(results)
    assert "Rapid Pass-Through Mule Behavior" in evidence_doc


# ============================================================================
# Person 5 Simulator & Presets Tests
# ============================================================================

def test_simulator_inject():
    inject_payload = {
        "scenario_type": "ATO",
        "account_id": "BANK01_ACC1042",
        "amount": 49000.0
    }
    res = client.post("/api/v1/simulator/inject", json=inject_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "INJECTED"
    assert res.json()["scenario_type"] == "ATO"


def test_simulator_presets_and_queue_api():
    """Validates attack simulator presets listing and injection endpoints."""
    # 1. Presets endpoint
    presets_res = client.get("/api/v1/simulator/presets")
    assert presets_res.status_code == 200
    presets = presets_res.json()
    preset_ids = [p["id"] for p in presets]
    assert "ATO" in preset_ids
    assert "SMURFING" in preset_ids
    assert "RING_WASH" in preset_ids
    assert "FAN_IN" in preset_ids

    # 2. Inject Ring Wash
    inject_res = client.post("/api/v1/simulator/inject", json={
        "scenario_type": "RING_WASH",
        "account_id": "BANK01_ACC900",
        "amount": 45000.0
    })
    assert inject_res.status_code == 200
    assert inject_res.json()["status"] == "INJECTED"

    # 3. Queue clear endpoint
    clear_res = client.delete("/api/v1/simulator/queue")
    assert clear_res.status_code == 200
    assert clear_res.json()["status"] == "CLEARED"

