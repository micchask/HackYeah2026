"""Potwierdzanie zgłoszeń przez innych użytkowników (#62) - bez bazy (magazyn w pamięci)."""

import pytest

from app import report_store, report_votes
from app.barriers import report_barrier
from app.cities import get_city
from app.models import ReportStatus
from app.providers.user_reports import UserReportsProvider, visible_reports

RYNEK = {"lat": 50.0617, "lon": 19.9373}
AUTHOR = "device-author-0000000001"
VOTERS = [f"device-voter-00000000{i:02d}" for i in range(6)]


@pytest.fixture(autouse=True)
def clear_memory_store():
    report_store._memory_store.clear()
    yield
    report_store._memory_store.clear()


def _report(client) -> dict:
    r = client.post(
        "/api/reports",
        json={"type": "elevator_broken", "location": RYNEK, "reporter": AUTHOR},
    )
    assert r.status_code == 201
    return r.json()


def _vote(client, report_id: str, voter: str, vote: str):
    return client.post(f"/api/reports/{report_id}/votes", json={"vote": vote, "voter": voter})


@pytest.mark.parametrize(
    ("current", "confirmations", "denials", "expected"),
    [
        ("pending", 1, 0, "pending"),
        ("pending", 2, 0, "confirmed"),
        ("pending", 3, 1, "confirmed"),  # przewaga 2
        ("pending", 2, 1, "pending"),
        ("pending", 0, 2, "rejected"),  # nigdy nie potwierdzone -> odrzucone
        ("confirmed", 1, 3, "resolved"),  # było potwierdzone -> rozwiązane (np. naprawiona winda)
        ("confirmed", 2, 3, "confirmed"),
        ("rejected", 5, 0, "rejected"),  # zamknięte się nie zmieniają
        ("resolved", 5, 0, "resolved"),
    ],
)
def test_status_rule_margin_of_two(current, confirmations, denials, expected):
    status = report_votes.status_after_votes(ReportStatus(current), confirmations, denials)
    assert status == expected


def test_new_report_is_visible_with_votes_and_hides_reporter(client):
    report = _report(client)
    assert report["status"] == "pending"
    assert (report["confirmations"], report["denials"]) == (0, 0)
    assert "reporter" not in report  # identyfikator urządzenia nigdy nie wraca w odpowiedzi

    [barrier_report] = visible_reports("krakow")
    place = UserReportsProvider(get_city("krakow")).to_place(barrier_report)
    barrier = report_barrier(place, barrier_report)
    assert barrier.report is not None
    assert (barrier.report.status, barrier.report.confirmations) == ("pending", 0)


def test_confirmations_change_status_and_raise_confidence(client):
    report = _report(client)
    first = _vote(client, report["id"], VOTERS[0], "confirm").json()
    assert (first["status"], first["confirmations"]) == ("pending", 1)

    second = _vote(client, report["id"], VOTERS[1], "confirm").json()
    assert (second["status"], second["confirmations"]) == ("confirmed", 2)

    [place] = UserReportsProvider(get_city("krakow")).fetch_places()
    assert place.attributes[0].confidence == pytest.approx(0.4 + 2 * 0.15)


def test_denials_resolve_confirmed_report_and_close_voting(client):
    report = _report(client)
    for voter in VOTERS[:2]:
        _vote(client, report["id"], voter, "confirm")
    for voter in VOTERS[2:6]:
        last = _vote(client, report["id"], voter, "deny").json()
    assert (last["status"], last["denials"]) == ("resolved", 4)
    assert visible_reports("krakow") == []  # rozwiązane znika z mapy

    closed = _vote(client, report["id"], "device-latecomer-0000001", "confirm")
    assert closed.status_code == 409


def test_one_vote_per_device_can_be_changed(client):
    report = _report(client)
    _vote(client, report["id"], VOTERS[0], "confirm")
    changed = _vote(client, report["id"], VOTERS[0], "deny").json()
    assert (changed["confirmations"], changed["denials"]) == (0, 1)


def test_author_cannot_vote_on_own_report(client):
    report = _report(client)
    r = _vote(client, report["id"], AUTHOR, "confirm")
    assert r.status_code == 403
    assert "własne" in r.json()["detail"]


def test_unknown_report_and_bad_device_id(client):
    assert _vote(client, "nie-ma-takiego", VOTERS[0], "confirm").status_code == 404
    report = _report(client)
    assert _vote(client, report["id"], "za-krotki", "confirm").status_code == 422


def test_daily_vote_limit(client, monkeypatch):
    monkeypatch.setattr(report_votes, "DAILY_VOTE_LIMIT", 2)
    reports = [_report(client) for _ in range(3)]
    for report in reports[:2]:
        assert _vote(client, report["id"], VOTERS[0], "confirm").status_code == 200
    r = _vote(client, reports[2]["id"], VOTERS[0], "confirm")
    assert r.status_code == 429
