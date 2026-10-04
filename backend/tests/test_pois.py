import json
from datetime import UTC, datetime
from pathlib import Path

from app.models import PoiKind
from app.providers.osm_pois import build_query, parse

SAMPLE = json.loads(
    (Path(__file__).parent / "fixtures" / "overpass_pois_sample.json").read_text(encoding="utf-8")
)
NOW = datetime(2026, 10, 4, tzinfo=UTC)


def test_query_asks_for_benches_picnic_tables_and_changing_tables():
    query = build_query((50.045, 19.928, 50.066, 19.950))
    assert 'node["amenity"="bench"](50.045,19.928,50.066,19.95)' in query
    assert '["leisure"="picnic_table"]' in query
    assert 'nwr["changing_table"="yes"]' in query


def test_parse_sample_without_network():
    pois = {p.id: p for p in parse(SAMPLE, fetched_at=NOW)}

    # element bez współrzędnych pomijamy
    assert set(pois) == {
        "osm:node/101",
        "osm:node/102",
        "osm:node/103",
        "osm:node/475613690",
        "osm:way/201",
    }
    bench = pois["osm:node/101"]
    assert bench.kind == PoiKind.BENCH
    assert bench.details == {"backrest": True, "armrest": False, "seats": 3, "material": "wood"}
    assert pois["osm:node/102"].details == {"backrest": False}
    assert pois["osm:node/103"].details == {"type": "picnic_table"}


def test_changing_table_details_and_way_center():
    pois = {p.id: p for p in parse(SAMPLE, fetched_at=NOW)}

    restaurant = pois["osm:node/475613690"]
    assert restaurant.kind == PoiKind.CHANGING_TABLE
    assert restaurant.name == "Hard Rock Cafe"
    assert restaurant.details["place_type"] == "restaurant"
    assert restaurant.details["location"] == "wheelchair_toilet;female_toilet"

    toilet = pois["osm:way/201"]
    assert toilet.location.lat == 50.0590
    assert toilet.details == {"place_type": "toilets", "fee": True, "wheelchair": "yes"}


def test_provenance():
    bench = next(p for p in parse(SAMPLE, fetched_at=NOW) if p.id == "osm:node/101")

    assert bench.source == "osm"
    assert bench.provenance.source_ref == "node/101"
    assert bench.provenance.fetched_at == NOW
    assert bench.provenance.last_verified == datetime(2025, 6, 14, tzinfo=UTC)
    assert bench.confidence == 0.6


# API czyta snapshot z data/seed/ (testy działają bez bazy i bez `make seed`)


def test_api_filters_by_kind(client):
    tables = client.get("/api/pois", params={"kind": "changing_table"}).json()

    assert tables
    assert {p["kind"] for p in tables} == {"changing_table"}
    assert all(p["source"] == "osm" and p["provenance"]["source_ref"] for p in tables)


def test_api_bbox_and_limit(client):
    everything = client.get("/api/pois", params={"limit": 2000}).json()
    rynek = client.get("/api/pois", params={"bbox": "50.060,19.936,50.063,19.940", "limit": 2000})

    assert 0 < len(rynek.json()) < len(everything)
    assert all(50.060 <= p["location"]["lat"] <= 50.063 for p in rynek.json())
    assert len(client.get("/api/pois", params={"limit": 3}).json()) == 3


def test_api_rejects_bad_params(client):
    assert client.get("/api/pois", params={"kind": "parking"}).status_code == 422
    assert client.get("/api/pois", params={"bbox": "abc"}).status_code == 422
