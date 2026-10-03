from datetime import date, timedelta

import pytest

from app import report_store
from app.cities import get_city
from app.providers import get_provider_class

RYNEK = {"lat": 50.0617, "lon": 19.9373}


@pytest.fixture(autouse=True)
def clear_memory_store():
    report_store._memory_store.clear()


def _create(client, **body):
    return client.post("/api/reports", json={"location": RYNEK, **body})


def test_type_fills_attribute_and_value(client):
    r = _create(client, type="elevator_broken", comment="  Winda stoi od tygodnia  ")
    assert r.status_code == 201
    report = r.json()
    assert (report["attribute"], report["value"]) == ("elevator", False)
    assert report["comment"] == "Winda stoi od tygodnia"
    assert report["status"] == "pending"


def test_general_barrier_needs_attribute(client):
    assert _create(client, type="barrier").status_code == 422
    r = _create(client, type="barrier", attribute="step_count", value=5)
    assert r.status_code == 201
    assert r.json()["value"] == 5


@pytest.mark.parametrize("comment", ["pisz: jan.kowalski@example.com", "tel. 600 123 456"])
def test_comment_rejects_personal_data(client, comment):
    r = _create(client, type="elevator_broken", comment=comment)
    assert r.status_code == 422


def test_comment_length_limit(client):
    assert _create(client, type="elevator_broken", comment="x" * 501).status_code == 422


def test_report_outside_city_rejected(client):
    r = client.post(
        "/api/reports", json={"location": {"lat": 52.23, "lon": 21.01}, "type": "construction"}
    )
    assert r.status_code == 422
    assert "poza obszarem" in r.json()["detail"]


def test_list_and_moderate(client):
    first = _create(client, type="construction", valid_until="2026-12-31").json()
    second = _create(client, type="blocked_parking").json()

    listed = client.get("/api/reports").json()
    assert [r["id"] for r in listed] == [second["id"], first["id"]]
    assert listed[1]["valid_until"] == "2026-12-31"

    r = client.patch(f"/api/reports/{first['id']}", json={"status": "confirmed"})
    assert r.status_code == 200
    assert r.json()["status"] == "confirmed"
    assert r.json()["updated_at"] is not None

    confirmed = client.get("/api/reports", params={"status": "confirmed"}).json()
    assert [r["id"] for r in confirmed] == [first["id"]]

    assert client.patch("/api/reports/brak", json={"status": "resolved"}).status_code == 404
    assert client.patch(f"/api/reports/{first['id']}", json={"status": "zle"}).status_code == 422


def test_provider_returns_only_confirmed_and_current(client):
    today = date.today()
    active = _create(client, type="elevator_broken").json()
    expired = _create(client, type="construction", valid_until=str(today - timedelta(days=1)))
    _create(client, type="blocked_parking")  # pending - pomijamy
    for report_id in (active["id"], expired.json()["id"]):
        client.patch(f"/api/reports/{report_id}", json={"status": "confirmed"})

    provider = get_provider_class("user_reports")(get_city("krakow"))
    [place] = provider.fetch_places()
    assert place.id == f"report:{active['id']}"
    assert place.name == "Niedziałająca winda"
    [attribute] = place.attributes
    assert (attribute.key, attribute.value, attribute.confidence) == ("elevator", False, 0.4)
    assert attribute.provenance.source_type == "user_report"
