import httpx
import pytest

from app import geocoding
from app.cities import get_city


def _feature(lon: float, lat: float, **props) -> dict:
    return {"type": "Feature", "geometry": {"coordinates": [lon, lat]}, "properties": props}


PAYLOAD = {
    "features": [
        _feature(
            19.9373,
            50.0617,
            name="Sukiennice",
            street="Rynek Główny",
            housenumber="3",
            district="Stare Miasto",
            osm_key="tourism",
            osm_value="attraction",
        ),
        # dwa odcinki tej samej ulicy - ma zostać jedna podpowiedź
        _feature(19.94135, 50.06486, name="Floriańska", district="Stare Miasto", type="street"),
        _feature(19.94143, 50.06505, name="Floriańska", district="Stare Miasto", type="street"),
        # sam adres, bez nazwy
        _feature(19.938, 50.05936, street="Grodzka", housenumber="20", district="Stare Miasto"),
        # poza obszarem demo
        _feature(19.98, 50.08, name="Nowa Huta"),
    ]
}


@pytest.fixture(autouse=True)
def clear_cache():
    geocoding._cache.clear()


def test_parse_photon_labels_dedup_and_area():
    results = geocoding.parse_photon(PAYLOAD, get_city("krakow"))
    assert [r.label for r in results] == ["Sukiennice", "Floriańska", "Grodzka 20"]
    assert results[0].description == "Rynek Główny 3 · Stare Miasto"
    assert results[0].kind == "atrakcja"
    assert results[1].kind == "ulica"
    assert results[0].point.lat == pytest.approx(50.0617)


def test_geocode_endpoint(client, monkeypatch):
    calls = []

    def fake_get(url, params, headers, timeout):
        calls.append((url, params, headers))
        return httpx.Response(200, json=PAYLOAD, request=httpx.Request("GET", url))

    monkeypatch.setattr(geocoding.httpx, "get", fake_get)
    r = client.get("/api/geocode", params={"q": "sukiennice"})
    assert r.status_code == 200
    assert r.json()[0]["label"] == "Sukiennice"
    url, params, headers = calls[0]
    assert url.endswith("/api/")
    assert params["bbox"] == "19.928,50.045,19.95,50.066"
    assert "HackYeah2026" in headers["User-Agent"]

    client.get("/api/geocode", params={"q": "Sukiennice "})
    assert len(calls) == 1, "drugie takie samo zapytanie powinno przyjść z cache"


def test_geocode_short_query_does_not_call_provider(client, monkeypatch):
    monkeypatch.setattr(geocoding.httpx, "get", lambda *a, **k: pytest.fail("nie wołać Photona"))
    assert client.get("/api/geocode", params={"q": "a"}).json() == []


def test_geocode_provider_down_returns_503(client, monkeypatch):
    def broken(*_a, **_k):
        raise httpx.ConnectError("brak internetu")

    monkeypatch.setattr(geocoding.httpx, "get", broken)
    r = client.get("/api/geocode", params={"q": "Floriańska"})
    assert r.status_code == 503
    assert "trasę demo" in r.json()["detail"]


def test_reverse_outside_area_is_null(client, monkeypatch):
    monkeypatch.setattr(geocoding.httpx, "get", lambda *a, **k: pytest.fail("nie wołać Photona"))
    r = client.get("/api/geocode/reverse", params={"lat": 50.2, "lon": 19.5})
    assert r.status_code == 200
    assert r.json() is None
