import pytest
from app.core.causal_filter import CausalFilter

def test_causal_filter_events():
    events = [
        {"timestamp": "2026-03-01T10:00:00Z", "event_type": "login"},
        {"timestamp": "2026-03-01T11:00:00Z", "event_type": "mobile_number_change"},
        {"timestamp": "2026-03-01T12:00:00Z", "event_type": "payee_added"},
        {"timestamp": "2026-03-01T13:00:00Z", "event_type": "password_reset"}
    ]

    # As of 11:30: should only see login and mobile_number_change (strictly < 11:30)
    as_of = "2026-03-01T11:30:00Z"
    filtered = CausalFilter.filter_prior_events(events, as_of)
    assert len(filtered) == 2
    assert filtered[0]["event_type"] == "login"
    assert filtered[1]["event_type"] == "mobile_number_change"

    # Future events strictly excluded
    as_of_early = "2026-03-01T09:00:00Z"
    assert len(CausalFilter.filter_prior_events(events, as_of_early)) == 0

def test_causal_filter_transactions():
    txns = [
        {"timestamp": "2026-03-01T10:00:00Z", "amount": 100.0},
        {"timestamp": "2026-03-01T12:00:00Z", "amount": 500.0},
        {"timestamp": "2026-03-01T14:00:00Z", "amount": 15000.0}
    ]

    as_of = "2026-03-01T12:00:00Z"
    filtered = CausalFilter.filter_prior_transactions(txns, as_of)
    # Strictly before 12:00: only 10:00 txn included
    assert len(filtered) == 1
    assert filtered[0]["amount"] == 100.0
