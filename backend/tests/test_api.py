import pytest
from fastapi.testclient import TestClient
from datetime import datetime

from app.main import app

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

def test_metrics_endpoint():
    res = client.get("/api/v1/metrics")
    assert res.status_code == 200
    metrics = res.json()
    assert "prevented_loss_value" in metrics
    assert "total_scored_actions" in metrics

def test_simulator_inject():
    inject_payload = {
        "scenario_type": "ATO",
        "account_id": "BANK01_ACC1042",
        "amount": 49000.0
    }
    res = client.post("/api/v1/simulator/inject", json=inject_payload)
    assert res.status_code == 200
    assert res.json()["status"] == "INJECTED"
