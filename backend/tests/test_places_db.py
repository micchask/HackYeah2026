from datetime import UTC, datetime

from app.cities import get_city
from app.db.places import place_to_row, row_to_place
from app.models import (
    AccessibilityAttribute,
    AttributeKey,
    AttributeStatus,
    LatLon,
    Place,
    Provenance,
    SourceType,
)
from app.normalization import merge_places
from app.providers.manual import ManualProvider

NOW = datetime(2026, 10, 3, tzinfo=UTC)


def _place(source: str, source_type: SourceType, value: str, confidence: float) -> Place:
    return Place(
        id="osm:way/26195267",
        city="krakow",
        name="Bazylika Mariacka",
        location=LatLon(lat=50.0616572, lon=19.93945),
        attributes=[
            AccessibilityAttribute(
                key=AttributeKey.WHEELCHAIR,
                value=value,
                provenance=Provenance(source=source, source_type=source_type, fetched_at=NOW),
                confidence=confidence,
            )
        ],
    )


def test_row_roundtrip_keeps_place():
    place = _place("osm", SourceType.OSM, "yes", 0.6)
    assert row_to_place(place_to_row(place)) == place


def test_conflict_with_alternatives_survives_db_roundtrip():
    merged = merge_places(
        [
            _place("osm", SourceType.OSM, "yes", 0.6),
            _place("manual", SourceType.MANUAL, "limited", 0.7),
        ]
    )
    assert len(merged) == 1
    attr = merged[0].attributes[0]
    assert attr.status == AttributeStatus.CONFLICTING
    assert attr.value == "limited"
    assert [a.value for a in attr.alternatives] == ["yes"]

    assert row_to_place(place_to_row(merged[0])) == merged[0]


def test_manual_provider_has_demo_places():
    places = ManualProvider(get_city("krakow")).fetch_places()
    names = {p.name for p in places}
    assert {"Sukiennice", "Bazylika Mariacka"} <= names
    assert all(a.provenance.source_type == SourceType.MANUAL for p in places for a in p.attributes)


def test_places_bbox_filters_mocks(client):
    # testy działają bez bazy -> dane przykładowe, ale filtry działają tak samo
    everything = client.get("/api/places", params={"bbox": "49.9,19.8,50.2,20.2"}).json()
    rynek = client.get("/api/places", params={"bbox": "50.060,19.936,50.063,19.940"}).json()

    assert len(rynek) < len(everything)
    assert all(50.060 <= p["location"]["lat"] <= 50.063 for p in rynek)


def test_places_limit(client):
    r = client.get("/api/places", params={"bbox": "49.9,19.8,50.2,20.2", "limit": 1})
    assert r.status_code == 200
    assert len(r.json()) == 1


def test_places_invalid_bbox(client):
    assert client.get("/api/places", params={"bbox": "abc"}).status_code == 422
    assert client.get("/api/places", params={"bbox": "50.1,19.9,50.0,20.0"}).status_code == 422
