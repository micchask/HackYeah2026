"""Potwierdzone zgłoszenia w routingu (#63) - graf syntetyczny, zgłoszenia w pamięci."""

import uuid
from datetime import UTC, date, datetime, timedelta

import networkx as nx
import pytest

from app import report_store
from app.models import LatLon, Report, ReportStatus, ReportType, RoutePreferences, RouteRequest
from app.routing import reports as route_reports
from app.routing.graph import _build_city_graph
from app.routing.planner import plan_route

LAT0, LON0 = 50.0617, 19.9373
M_LAT = 1 / 111_320
M_LON = 1 / (111_320 * 0.6420)  # cos(50.06°)
NOW = datetime(2026, 10, 4, 12, 0, tzinfo=UTC)


def _graph() -> nx.MultiDiGraph:
    """A=1 -> B=2 krótko (100 m na północ) albo objazdem przez 3 (na wschód i z powrotem)."""
    g = nx.MultiDiGraph()
    g.add_node(1, x=LON0, y=LAT0)
    g.add_node(2, x=LON0, y=LAT0 + 100 * M_LAT)
    g.add_node(3, x=LON0 + 150 * M_LON, y=LAT0 + 50 * M_LAT)
    for u, v, length in ((1, 2, 100.0), (1, 3, 160.0), (3, 2, 160.0)):
        for a, b in ((u, v), (v, u)):
            g.add_edge(a, b, length=length, highway="footway", surface="asphalt")
    return g


def _report(type_: ReportType, at: LatLon, **extra) -> Report:
    report = Report(
        id=str(uuid.uuid4()),
        city="krakow",
        type=type_,
        location=at,
        created_at=NOW - timedelta(days=2),
        status=ReportStatus.CONFIRMED,
        **extra,
    )
    report_store._memory_store.create(report)
    return report


MIDDLE_OF_DIRECT = LatLon(lat=LAT0 + 50 * M_LAT, lon=LON0)


@pytest.fixture(autouse=True)
def clean():
    report_store._memory_store.clear()
    route_reports._STATE.clear()
    route_reports._GRAPH_STATE.clear()
    yield
    report_store._memory_store.clear()


def _route(g: nx.MultiDiGraph, now: datetime = NOW):
    city_graph = _build_city_graph(g)
    route_reports.invalidate("krakow")
    req = RouteRequest(
        origin=LatLon(lat=LAT0, lon=LON0),
        destination=LatLon(lat=LAT0 + 100 * M_LAT, lon=LON0),
        preferences=RoutePreferences(profile="wheelchair"),
    )
    import app.routing.planner as planner

    original = planner.datetime
    try:

        class Frozen(datetime):
            @classmethod
            def now(cls, tz=None):
                return now

        planner.datetime = Frozen
        return plan_route(req, city_graph)
    finally:
        planner.datetime = original


def test_blocked_sidewalk_is_avoided_and_explained():
    g = _graph()
    assert _route(g).distance_m == pytest.approx(100, abs=1)

    report = _report(ReportType.CONSTRUCTION, MIDDLE_OF_DIRECT)
    route = _route(g)
    assert route.distance_m == pytest.approx(320, abs=2)  # objazd przez 3
    assert any("Trasa omija zgłoszoną barierę: remont" in w for w in route.warnings)
    assert any("potwierdzone 2 dni temu" in w for w in route.warnings)
    assert report.id in route.reports_considered


def test_expired_report_no_longer_blocks():
    g = _graph()
    _report(ReportType.CONSTRUCTION, MIDDLE_OF_DIRECT, valid_until=date(2026, 10, 1))
    route = _route(g)  # remont skończył się 1.10, dziś 4.10
    assert route.distance_m == pytest.approx(100, abs=1)
    assert route.reports_considered == []


def test_penalty_without_detour_passes_with_warning():
    g = nx.MultiDiGraph()
    g.add_node(1, x=LON0, y=LAT0)
    g.add_node(2, x=LON0, y=LAT0 + 100 * M_LAT)
    for a, b in ((1, 2), (2, 1)):
        g.add_edge(a, b, length=100.0, highway="footway", surface="asphalt")
    _report(ReportType.BARRIER, MIDDLE_OF_DIRECT, attribute="kerb_height_cm", value=10)
    route = _route(g)
    assert route.distance_m == pytest.approx(100, abs=1)
    assert any("przechodzi przez zgłoszoną barierę" in w for w in route.warnings)


def test_elevator_report_only_warns():
    g = _graph()
    _report(ReportType.ELEVATOR_BROKEN, MIDDLE_OF_DIRECT)
    route = _route(g)
    assert route.distance_m == pytest.approx(100, abs=1)  # winda nie blokuje chodnika
    assert any("Przy trasie zgłoszono: niedziałająca winda" in w for w in route.warnings)


def test_pending_report_does_not_affect_routing():
    g = _graph()
    report = _report(ReportType.CONSTRUCTION, MIDDLE_OF_DIRECT)
    report_store._memory_store.set_status(report.id, ReportStatus.PENDING)
    assert _route(g).distance_m == pytest.approx(100, abs=1)


@pytest.mark.parametrize(
    ("type_", "extra", "days"),
    [
        (ReportType.ELEVATOR_BROKEN, {}, 7),
        (ReportType.CONSTRUCTION, {}, 30),
        (ReportType.BARRIER, {"attribute": "kerb_height_cm", "value": 9}, 14),
    ],
)
def test_validity_by_type_counts_from_last_confirmation(type_, extra, days):
    confirmed = NOW - timedelta(days=1)
    report = Report(
        id="r",
        city="krakow",
        type=type_,
        location=MIDDLE_OF_DIRECT,
        created_at=NOW - timedelta(days=60),
        status=ReportStatus.CONFIRMED,
        last_confirmed_at=confirmed,
        **extra,
    )
    assert route_reports.active_until(report) == confirmed + timedelta(days=days)


def test_confirmation_by_votes_takes_effect_immediately(client):
    created = client.post(
        "/api/reports",
        json={
            "type": "construction",
            "location": {"lat": MIDDLE_OF_DIRECT.lat, "lon": MIDDLE_OF_DIRECT.lon},
            "reporter": "device-author-0000000001",
        },
    ).json()
    for voter in ("device-voter-0000000001", "device-voter-0000000002"):
        client.post(f"/api/reports/{created['id']}/votes", json={"vote": "confirm", "voter": voter})

    active = client.get("/api/reports/active").json()
    assert [(a["id"], a["effect"]) for a in active] == [(created["id"], "block")]
