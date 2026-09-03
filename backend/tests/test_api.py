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
