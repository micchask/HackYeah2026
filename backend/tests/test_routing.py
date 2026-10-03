from app.models import LatLon, RoutePreferences, RouteSegment
from app.routing import PROFILES, edge_cost, profile_from_preferences
from app.routing.scores import accessibility_score, aggregate_route_scores, data_confidence


def test_stairs_impassable_for_wheelchair():
    assert edge_cost({"length": 10, "highway": "steps"}, PROFILES["wheelchair"]) is None


def test_cobblestones_cost_more_for_wheelchair_than_stroller():
    edge = {"length": 100, "highway": "footway", "surface": "sett"}
    assert edge_cost(edge, PROFILES["wheelchair"]) > edge_cost(edge, PROFILES["stroller"])


def test_steep_edge_impassable():
    edge = {"length": 50, "surface": "asphalt", "incline_percent": 12}
    assert edge_cost(edge, PROFILES["stroller"]) is None


def test_preferences_override_profile():
    profile = profile_from_preferences(RoutePreferences(profile="stroller", avoid_stairs=False))
    assert edge_cost({"length": 10, "highway": "steps", "surface": "asphalt"}, profile) == 10


def test_stroller_can_use_stairs_with_stroller_ramp_wheelchair_cannot():
    edge = {"length": 10, "highway": "steps", "ramp:stroller": "yes", "surface": "concrete"}
    assert edge_cost(edge, PROFILES["stroller"]) is not None
    assert edge_cost(edge, PROFILES["wheelchair"]) is None


def test_incline_parsed_from_osm_tag():
    edge = {"length": 10, "surface": "asphalt", "incline": "8%"}
    assert edge_cost(edge, PROFILES["wheelchair"]) is None
    assert edge_cost(edge, PROFILES["stroller"]) == 10


def test_simplified_graph_list_values():
    edge = {"length": 10, "highway": "['steps', 'footway']"}
    assert edge_cost(edge, PROFILES["wheelchair"]) is None


def test_accessibility_score_uses_profile_penalties():
    easy = [{"length": 100, "surface": "asphalt"}]
    rough = [{"length": 100, "surface": "sett"}]

    assert accessibility_score(easy, PROFILES["wheelchair"]) == 100
    assert accessibility_score(rough, PROFILES["wheelchair"]) == 25
    assert accessibility_score(rough, PROFILES["stroller"]) > 25


def test_data_confidence_penalizes_missing_and_imprecise_data():
    known = [{"length": 100, "surface": "asphalt"}]
    unknown = [{"length": 100, "incline": "up"}]

    assert data_confidence(known) == 0.6
    assert data_confidence(unknown) == 0.25


def test_route_scores_are_weighted_by_segment_length():
    point = LatLon(lat=50.0, lon=20.0)
    segments = [
        RouteSegment(
            instruction="Łatwy odcinek",
            distance_m=75,
            geometry=[point, point],
            accessibility_score=100,
            confidence=0.8,
        ),
        RouteSegment(
            instruction="Trudny odcinek",
            distance_m=25,
            geometry=[point, point],
            accessibility_score=20,
            confidence=0.4,
        ),
    ]

    assert aggregate_route_scores(segments) == (80, 0.7)


def test_last_verified_is_oldest_check_date():
    from app.routing.planner import last_verified

    edges = [{"check_date": "2025-07-16"}, {"check_date": "2024-04"}]
    assert last_verified(edges).date().isoformat() == "2024-04-01"


def test_last_verified_none_when_any_edge_unverified():
    from app.routing.planner import last_verified

    assert last_verified([{"check_date": "2025-07-16"}, {}]) is None


def test_graph_fetched_at_from_osmnx_metadata():
    from app.routing.planner import graph_fetched_at

    assert graph_fetched_at({"created_date": "2026-10-03 16:01:57"}).hour == 16
    assert graph_fetched_at({}) is None
