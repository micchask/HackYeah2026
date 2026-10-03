"""Cel albo start dostępny tylko po schodach: trasa do/od najbliższego dostępnego miejsca."""

import networkx as nx
import pytest

from app.models import LatLon, RoutePreferences, RouteRequest
from app.routing.graph import _build_city_graph
from app.routing.planner import NoRouteError, plan_route

LAT0, LON0 = 50.0617, 19.9373
M_LAT = 1 / 111_320  # ~1 m w stopniach szerokości


def _graph(steps_length: float) -> nx.MultiDiGraph:
    # 1 --(chodnik 100 m)-- 2 --(schody)-- 3: punkt 3 to np. taras widokowy tylko po schodach
    g = nx.MultiDiGraph()
    g.add_node(1, x=LON0, y=LAT0)
    g.add_node(2, x=LON0, y=LAT0 + 100 * M_LAT)
    g.add_node(3, x=LON0, y=LAT0 + (100 + steps_length) * M_LAT)
    for u, v in ((1, 2), (2, 1)):
        g.add_edge(u, v, length=100.0, highway="footway", surface="asphalt")
    for u, v in ((2, 3), (3, 2)):
        g.add_edge(u, v, length=steps_length, highway="steps", surface="paving_stones")
    return g


def _request(origin: int, destination: int, g: nx.MultiDiGraph) -> RouteRequest:
    def point(n):
        return LatLon(lat=g.nodes[n]["y"], lon=g.nodes[n]["x"])

    return RouteRequest(
        origin=point(origin),
        destination=point(destination),
        preferences=RoutePreferences(profile="wheelchair"),
    )


def test_destination_only_by_stairs_ends_at_nearest_reachable_point():
    g = _graph(steps_length=20)
    route = plan_route(_request(1, 3, g), _build_city_graph(g))
    assert route.distance_m == pytest.approx(100, abs=1)
    assert any("Trasa kończy się ok. 20 m od celu" in w for w in route.warnings)
    assert all(s.instruction for s in route.segments)


def test_origin_only_by_stairs_starts_at_nearest_reachable_point():
    g = _graph(steps_length=20)
    route = plan_route(_request(3, 1, g), _build_city_graph(g))
    assert route.distance_m == pytest.approx(100, abs=1)
    assert any("Trasa zaczyna się ok. 20 m od niego" in w for w in route.warnings)


def test_too_far_from_reachable_point_is_still_no_route():
    # najbliższe dostępne miejsce dalej niż MAX_FALLBACK_M - to byłby już inny cel
    g = _graph(steps_length=400)
    with pytest.raises(NoRouteError):
        plan_route(_request(1, 3, g), _build_city_graph(g))
