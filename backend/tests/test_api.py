def test_health(client):
    r = client.get("/api/health")
    assert r.status_code == 200
    assert r.json()["status"] == "ok"


def test_cities_contains_krakow(client):
    ids = [c["id"] for c in client.get("/api/cities").json()]
    assert "krakow" in ids


def test_places_have_provenance(client):
    places = client.get("/api/places", params={"city": "krakow"}).json()
    assert places
    attr = places[0]["attributes"][0]
    assert {"source", "source_type", "fetched_at"} <= attr["provenance"].keys()
    assert 0 <= attr["confidence"] <= 1


def test_route_mock(client):
    body = {
        "origin": {"lat": 50.0617, "lon": 19.9373},
        "destination": {"lat": 50.0672, "lon": 19.9450},
        "preferences": {"profile": "stroller"},
    }
    r = client.post("/api/routes", json=body)
    assert r.status_code == 200
    data = r.json()
    assert data["segments"]
    assert all(s["instruction"] for s in data["segments"])


def test_create_report(client):
    body = {"location": {"lat": 50.06, "lon": 19.94}, "attribute": "elevator", "value": False}
    r = client.post("/api/reports", json=body)
    assert r.status_code == 201
    assert r.json()["status"] == "pending"
