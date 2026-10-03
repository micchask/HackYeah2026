from datetime import UTC, datetime

import pytest

from app import geocoding
from app import search as place_search
from app.cities import get_city
from app.models import (
    AccessibilityAttribute,
    AttributeKey,
    GeocodeResult,
    LatLon,
    Place,
    Provenance,
    SourceType,
)
from app.search import match_score, normalize, search_places

CITY = get_city("krakow")
RYNEK = LatLon(lat=50.0617, lon=19.9373)


def _place(pid, name, category, lat, lon, attributes=False):
    attrs = []
    if attributes:
        attrs = [
            AccessibilityAttribute(
                key=AttributeKey.WHEELCHAIR,
                value="yes",
                provenance=Provenance(
                    source="osm", source_type=SourceType.OSM, fetched_at=datetime.now(UTC)
                ),
                confidence=0.6,
            )
        ]
    return Place(
        id=pid,
        city="krakow",
        name=name,
        category=category,
        location=LatLon(lat=lat, lon=lon),
        attributes=attrs,
    )


PLACES = [
    _place("osm:1", "Apteka Pod Złotym Tygrysem", "pharmacy", 50.0612, 19.9370, attributes=True),
    _place("osm:2", None, "toilets", 50.0540, 19.9360),  # bez nazwy, daleko od Rynku
    _place("osm:3", None, "toilets", 50.0619, 19.9375),  # bez nazwy, przy Rynku
    _place("osm:4", "Floriańska", None, 50.0640, 19.9405),  # ulica, dwa odcinki
    _place("osm:5", "Floriańska", None, 50.0650, 19.9410),
    _place("osm:6", "Apteka poza obszarem", "pharmacy", 50.10, 19.90),
]


def test_normalize_and_match():
    assert normalize("  Łódzka   ŚRÓDMIEŚCIE ") == "lodzka srodmiescie"
    assert match_score("apteka pod zlotym tygrysem", "apteka") == 0
    assert match_score("apteka pod zlotym tygrysem", "zlot tyg") == 1
    assert match_score("kawiarnia", "wiar") == 2
    assert match_score("kawiarnia", "apteka") is None


def test_places_by_name_category_and_without_polish_letters():
    found = search_places(PLACES, normalize("zlotym"), CITY)
    assert [r.label for r in found] == ["Apteka Pod Złotym Tygrysem"]
    # rodzaj po polsku też jest szukany; poza obszarem demo - pominięte
    pharmacies = search_places(PLACES, normalize("apteka"), CITY)
    assert [r.place.id for r in pharmacies] == ["osm:1"]
    assert pharmacies[0].kind == "apteka"
    assert pharmacies[0].description is None  # bez dublowania "apteka · apteka"


def test_unnamed_places_get_kind_label_and_nearest_first():
    toilets = search_places(PLACES, normalize("toaleta"), CITY, near=RYNEK)
    assert [r.label for r in toilets] == ["Toaleta", "Toaleta"]
    assert [r.place.id for r in toilets] == ["osm:3", "osm:2"]
    assert toilets[0].distance_m < toilets[1].distance_m


def test_street_segments_are_one_result():
    assert len(search_places(PLACES, normalize("florianska"), CITY)) == 1


@pytest.fixture
def fake_sources(monkeypatch):
    monkeypatch.setattr(place_search, "load_places", lambda city: PLACES)

    def geocode(city, query, limit):
        return [
            # ta sama apteka co w naszych danych - ma zniknąć jako duplikat
            GeocodeResult(
                label="Apteka Pod Złotym Tygrysem",
                kind="apteka",
                point=LatLon(lat=50.0612, lon=19.9370),
            ),
            GeocodeResult(label="Apteka Nowa", description="Grodzka 1", point=RYNEK),
        ]

    monkeypatch.setattr(geocoding, "search", geocode)


def test_endpoint_combines_sources_without_duplicates(client, fake_sources):
    r = client.get("/api/search", params={"q": "apteka", "lat": RYNEK.lat, "lon": RYNEK.lon})
    assert r.status_code == 200
    data = r.json()
    assert [(d["source"], d["label"]) for d in data] == [
        ("place", "Apteka Pod Złotym Tygrysem"),
        ("address", "Apteka Nowa"),
    ]
    assert data[0]["place"]["attributes"]
    assert data[0]["distance_m"] is not None


def test_institutions_come_first(client, fake_sources):
    data = client.get("/api/search", params={"q": "krzysztofory"}).json()
    assert data[0]["source"] == "institution"
    assert data[0]["institution_id"] == "mk-krzysztofory"


def test_works_without_geocoder(client, monkeypatch):
    monkeypatch.setattr(place_search, "load_places", lambda city: PLACES)

    def unavailable(*_):
        raise geocoding.GeocoderUnavailable("timeout")

    monkeypatch.setattr(geocoding, "search", unavailable)
    data = client.get("/api/search", params={"q": "toaleta"}).json()
    assert [d["source"] for d in data] == ["place", "place"]


def test_short_query_returns_nothing(client):
    assert client.get("/api/search", params={"q": "a"}).json() == []
