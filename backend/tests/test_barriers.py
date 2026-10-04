from datetime import UTC, datetime

import pytest

from app import report_store
from app.barriers import report_barrier, segment_barrier
from app.cities import get_city
from app.db.segments import edge_to_rows
from app.models import BarrierType, Difficulty
from app.providers import get_provider_class
from app.routing.planner import edge_barriers, edge_difficulty, segment_barriers

FETCHED = datetime(2026, 10, 3, tzinfo=UTC)
LINE = [(19.9350, 50.0550), (19.9355, 50.0551), (19.9360, 50.0552)]


def _types(edge: dict) -> list[str]:
    return [b.type.value for b in edge_barriers(edge)]


def test_edge_barriers_types_descriptions_and_order():
    edge = {
        "highway": "steps",
        "step_count": "81",
        "ramp:stroller": "yes",
        "surface": "sett",
        "kerb_height_cm": 10.0,
        "incline": "8%",
    }
    assert [(b.type.value, b.description) for b in edge_barriers(edge)] == [
        ("stairs", "Schody, 81 stopni (z szynami dla wózka dziecięcego)"),
        ("kerb", "Krawężnik ok. 10 cm"),
        ("steep", "Nachylenie 8%"),
        ("rough_surface", "Kostka granitowa (bruk)"),
    ]


@pytest.mark.parametrize(
    "edge",
    [
        {"highway": "footway", "surface": "asphalt"},
        {"highway": "footway", "surface": "asphalt", "kerb_height_cm": 2.0},  # obniżony
        {"highway": "footway", "surface": "asphalt", "incline": "5%"},
        {"highway": "footway"},  # brak danych to nie bariera
    ],
)
def test_no_barrier(edge):
    assert edge_barriers(edge) == []


@pytest.mark.parametrize(
    "edge",
    [
        {"highway": "steps"},
        {"surface": "cobblestone"},
        {"surface": "asphalt", "kerb_height_cm": 6.0},
        {"surface": "asphalt", "incline": "-7%"},
    ],
)
def test_barrier_always_means_hard_segment(edge):
    assert edge_barriers(edge)
    assert edge_difficulty(edge) == Difficulty.HARD


def test_segment_barriers_deduplicated():
    edges = [{"surface": "sett"}, {"surface": "sett"}, {"surface": "asphalt", "kerb_height_cm": 10}]
    assert [b.type.value for b in segment_barriers(edges)] == ["kerb", "rough_surface"]


def test_segment_barrier_from_segments_row():
    row = edge_to_rows(
        1,
        2,
        0,
        {
            "highway": "steps",
            "step_count": "81",
            "surface": "sett",
            "osmid": 395982452,
            "length": 30,
        },
        city_id="krakow",
        fetched_at=FETCHED,
        endpoints=LINE,
    )
    row.name = "Wzgórze Wawelskie"
    barrier = segment_barrier(row, LINE)
    assert barrier is not None
    assert barrier.id == "segment:1-2-0"
    assert barrier.type == "stairs"
    assert barrier.description == "Schody, 81 stopni; Kostka granitowa (bruk)"
    assert barrier.street == "Wzgórze Wawelskie"
    assert (barrier.location.lat, barrier.location.lon) == (50.0551, 19.9355)
    assert (barrier.source, barrier.source_ref) == ("osm", "way/395982452")
    assert barrier.confidence == 0.6


def test_segment_barrier_kerb_stored_as_attribute():
    row = edge_to_rows(
        1,
        2,
        0,
        {"highway": "footway", "surface": "asphalt", "kerb_height_cm": 10.0},
        city_id="krakow",
        fetched_at=FETCHED,
        endpoints=LINE[:2],
    )
    assert {a.key: a.value["v"] for a in row.attributes}["kerb_height_cm"] == 10.0
    barrier = segment_barrier(row, LINE[:2])
    assert barrier is not None and barrier.type == "kerb"


def test_easy_segment_is_not_a_barrier():
    row = edge_to_rows(
        1, 2, 0, {"surface": "asphalt"}, city_id="krakow", fetched_at=FETCHED, endpoints=LINE
    )
    assert segment_barrier(row, LINE) is None


def test_confirmed_report_becomes_barrier(client):
    report_store._memory_store.clear()
    created = client.post(
        "/api/reports",
        json={"type": "elevator_broken", "location": {"lat": 50.0617, "lon": 19.9373}},
    ).json()
    client.patch(f"/api/reports/{created['id']}", json={"status": "confirmed"})

    [place] = get_provider_class("user_reports")(get_city("krakow")).fetch_places()
    barrier = report_barrier(place)
    assert barrier.id == f"report:{created['id']}"
    assert (barrier.type, barrier.description) == ("reported", "Niedziałająca winda")
    assert (barrier.source, barrier.confidence) == ("user_reports", 0.4)
    report_store._memory_store.clear()


def test_barriers_endpoint_validation(client):
    assert client.get("/api/barriers").status_code == 422
    assert client.get("/api/barriers", params={"bbox": "1,2"}).status_code == 422
    area = "50.045,19.928,50.066,19.95"
    assert client.get("/api/barriers", params={"bbox": area, "types": "lava"}).status_code == 422
    r = client.get("/api/barriers", params={"bbox": area})
    assert r.status_code == 503
    assert "make seed" in r.json()["detail"]


@pytest.mark.parametrize(
    ("count", "text"),
    [
        ("1", "Schody, 1 stopień"),
        ("3", "Schody, 3 stopnie"),
        ("12", "Schody, 12 stopni"),
        ("22", "Schody, 22 stopnie"),
        ("81", "Schody, 81 stopni"),
    ],
)
def test_step_count_declension(count, text):
    [barrier] = edge_barriers({"highway": "steps", "step_count": count})
    assert barrier.description == text


TOURIST = frozenset({BarrierType.STAIRS})
GUEST = frozenset(b for b in BarrierType if b != BarrierType.ROUGH_SURFACE)


def test_tourist_marks_only_stairs():
    cobbles_uphill = {
        "highway": "footway",
        "surface": "sett",
        "incline": "12%",
        "kerb_height_cm": 10,
    }
    assert edge_difficulty(cobbles_uphill, TOURIST) == Difficulty.EASY
    assert edge_barriers(cobbles_uphill, TOURIST) == []
    steps = {"highway": "steps", "surface": "sett"}
    assert edge_difficulty(steps, TOURIST) == Difficulty.HARD
    assert [b.type for b in edge_barriers(steps, TOURIST)] == [BarrierType.STAIRS]


def test_guest_ignores_cobbles_but_keeps_other_barriers():
    cobbles = {"highway": "footway", "surface": "sett"}
    assert edge_difficulty(cobbles, GUEST) == Difficulty.EASY
    assert edge_barriers(cobbles, GUEST) == []
    steep = {"highway": "footway", "surface": "asphalt", "incline": "12%"}
    assert edge_difficulty(steep, GUEST) == Difficulty.HARD
    assert [b.type for b in edge_barriers(steep, GUEST)] == [BarrierType.STEEP]
    # brak danych o krawężniku nadal oznacza utrudnienie
    assert edge_difficulty({**cobbles, "kerb_unknown": "yes"}, GUEST) == Difficulty.MODERATE


def test_marked_none_keeps_all_barriers():
    cobbles = {"highway": "footway", "surface": "sett"}
    assert edge_difficulty(cobbles) == Difficulty.HARD
    assert [b.type for b in edge_barriers(cobbles)] == [BarrierType.ROUGH_SURFACE]
