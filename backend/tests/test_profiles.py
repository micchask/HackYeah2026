import networkx as nx
import pytest

from app.api.profiles import MODE_PRESETS
from app.models import LayerId, RoutePreferences
from app.routing import PROFILES, edge_cost, profile_from_preferences
from app.routing.graph import shortest_path

PRESETS = {p.id: p for p in MODE_PRESETS}


def _profile(mode: str):
    return profile_from_preferences(PRESETS[mode].preferences)


def _stairs_or_detour() -> nx.MultiDiGraph:
    """A→B: 20 m schodami albo 200 m asfaltem naokoło."""
    graph = nx.MultiDiGraph()
    graph.add_edge("A", "B", length=20, highway="steps", surface="concrete")
    graph.add_edge("A", "C", length=100, highway="footway", surface="asphalt")
    graph.add_edge("C", "B", length=100, highway="footway", surface="asphalt")
    return graph


@pytest.mark.parametrize(("mode", "path"), [("guest", ["A", "B"]), ("tourist", ["A", "B"])])
def test_walk_modes_take_the_stairs(mode, path):
    assert shortest_path(_stairs_or_detour(), "A", "B", _profile(mode)) == path


@pytest.mark.parametrize("mode", ["senior", "wheelchair", "stroller"])
def test_step_free_modes_take_the_detour(mode):
    assert shortest_path(_stairs_or_detour(), "A", "B", _profile(mode)) == ["A", "C", "B"]


@pytest.mark.parametrize("profile", [None, "", "nieznany"])
def test_unknown_or_empty_profile_is_walk_not_wheelchair(profile):
    routing = profile_from_preferences(RoutePreferences(profile=profile))
    walk = PROFILES["walk"]
    assert routing.surface_penalty == {}
    assert routing.unknown_penalty == walk.unknown_penalty == 1.0
    assert routing.wheelchair_no_impassable is False
    assert routing.speed_m_s == walk.speed_m_s


def test_walk_has_no_penalties_or_blocks():
    walk = _profile("guest")
    for edge in [
        {"length": 10, "surface": "sett"},
        {"length": 10, "surface": "asphalt", "incline_percent": 25},
        {"length": 10, "surface": "asphalt", "kerb_height_cm": 15},
        {"length": 10, "surface": "asphalt", "wheelchair": "no"},
        {"length": 10, "incline": "up", "kerb_unknown": "yes"},
    ]:
        assert edge_cost(edge, walk) == 10


def test_senior_limits_between_wheelchair_and_walk():
    senior = _profile("senior")
    assert edge_cost({"length": 10, "surface": "asphalt", "kerb_height_cm": 4}, senior) == 10
    assert edge_cost({"length": 10, "surface": "asphalt", "kerb_height_cm": 6}, senior) is None
    # lekka kara za bruk: drożej niż asfalt, taniej niż dla wózka
    sett = {"length": 10, "surface": "sett"}
    assert 10 < edge_cost(sett, senior) < edge_cost(sett, _profile("wheelchair"))
    assert senior.speed_m_s < PROFILES["walk"].speed_m_s


def test_wheelchair_profile_unchanged():
    wheelchair = PROFILES["wheelchair"]
    assert (wheelchair.max_incline_percent, wheelchair.max_kerb_height_cm) == (6.0, 2.0)
    assert wheelchair.surface_penalty["sett"] == 4.0
    assert wheelchair.wheelchair_no_impassable is True


def test_profiles_endpoint(client):
    r = client.get("/api/profiles")
    assert r.status_code == 200
    modes = r.json()
    assert [m["id"] for m in modes] == ["wheelchair", "senior", "tourist", "stroller", "guest"]
    for mode in modes:
        assert {"id", "label", "description", "icon", "profile", "preferences", "layers"} <= set(
            mode
        )
        assert mode["profile"] in PROFILES
        assert mode["preferences"]["profile"] == mode["profile"]
        assert set(mode["layers"]) == {layer.value for layer in LayerId}
        assert "niepełnospraw" not in (mode["label"] + mode["description"]).lower()

    by_id = {m["id"]: m for m in modes}
    assert by_id["tourist"]["profile"] == by_id["guest"]["profile"] == "walk"
    assert by_id["tourist"]["layers"] != by_id["guest"]["layers"]
    assert by_id["wheelchair"]["layers"]["barriers"] is True
    assert by_id["senior"]["layers"]["barriers"] is True
    assert by_id["guest"]["preferences"]["avoid_stairs"] is False
    # turysta: tylko schody; gość: wszystko poza brukiem; reszta trybów: wszystkie bariery
    assert by_id["tourist"]["preferences"]["marked_barriers"] == ["stairs"]
    assert "rough_surface" not in by_id["guest"]["preferences"]["marked_barriers"]
    assert {"stairs", "kerb", "steep"} <= set(by_id["guest"]["preferences"]["marked_barriers"])
    assert by_id["wheelchair"]["preferences"]["marked_barriers"] is None
