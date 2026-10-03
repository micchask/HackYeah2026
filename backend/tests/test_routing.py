from app.models import RoutePreferences
from app.routing import PROFILES, edge_cost, profile_from_preferences


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
