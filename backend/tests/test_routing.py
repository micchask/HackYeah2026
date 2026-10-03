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
