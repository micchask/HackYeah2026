"""Profile routingu: jak bardzo "kosztowna" jest krawędź grafu dla danego użytkownika.

Koszt = długość [m] * mnożniki kar. None = krawędź nieprzejezdna.
"""

from dataclasses import dataclass, field, replace
from typing import Any

from app.models import RoutePreferences

ROUGH_SURFACES = {"sett", "cobblestone", "unhewn_cobblestone", "gravel", "pebblestone", "dirt"}


@dataclass(frozen=True)
class RoutingProfile:
    name: str
    avoid_stairs: bool = True
    max_incline_percent: float = 6.0
    max_kerb_height_cm: float = 3.0
    # nawierzchnia -> mnożnik kosztu (1.0 = bez kary)
    surface_penalty: dict[str, float] = field(default_factory=dict)
    # kara za brak danych o krawędzi (niepewność)
    unknown_penalty: float = 1.2


PROFILES: dict[str, RoutingProfile] = {
    "wheelchair": RoutingProfile(
        name="wheelchair",
        avoid_stairs=True,
        max_incline_percent=6.0,
        max_kerb_height_cm=2.0,
        surface_penalty={s: 4.0 for s in ROUGH_SURFACES} | {"paving_stones": 1.3},
    ),
    "stroller": RoutingProfile(
        name="stroller",
        avoid_stairs=True,
        max_incline_percent=10.0,
        max_kerb_height_cm=5.0,
        surface_penalty={s: 2.0 for s in ROUGH_SURFACES},
    ),
}


def profile_from_preferences(prefs: RoutePreferences) -> RoutingProfile:
    base = PROFILES.get(prefs.profile or "", PROFILES["wheelchair"])
    penalty = base.surface_penalty if prefs.avoid_rough_surface else {}
    return replace(
        base,
        name=prefs.profile or "custom",
        avoid_stairs=prefs.avoid_stairs,
        max_incline_percent=prefs.max_incline_percent,
        max_kerb_height_cm=prefs.max_kerb_height_cm,
        surface_penalty=penalty,
    )


def edge_cost(edge: dict[str, Any], profile: RoutingProfile) -> float | None:
    """Koszt krawędzi grafu (atrybuty jak w osmnx: length, highway, surface, incline...)."""
    length = float(edge.get("length", 0.0))
    if profile.avoid_stairs and edge.get("highway") == "steps":
        return None

    incline = edge.get("incline_percent")
    if incline is not None and abs(float(incline)) > profile.max_incline_percent:
        return None

    kerb = edge.get("kerb_height_cm")
    if kerb is not None and float(kerb) > profile.max_kerb_height_cm:
        return None

    multiplier = 1.0
    surface = edge.get("surface")
    if surface is None:
        multiplier *= profile.unknown_penalty
    else:
        multiplier *= profile.surface_penalty.get(surface, 1.0)
    return length * multiplier
