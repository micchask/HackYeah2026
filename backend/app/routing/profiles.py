"""Profile routingu: jak bardzo "kosztowna" jest krawędź grafu dla danego użytkownika.

Koszt = długość [m] * mnożniki kar. None = krawędź nieprzejezdna.
"""

import ast
import re
from dataclasses import dataclass, field, replace
from typing import Any

from app.models import RoutePreferences

ROUGH_SURFACES = {"sett", "cobblestone", "unhewn_cobblestone", "gravel", "pebblestone", "dirt"}
# Nawierzchnie nieutwardzone - dla wózka gorsze niż bruk
UNPAVED_SURFACES = {"ground", "grass", "rock", "mud", "sand", "unpaved"}

# Nachylenie ponad limit profilu to nie blokada, tylko bardzo wysoka kara: gdy nie ma innej drogi
# (np. jedyny podjazd na Wawel ma ~11% wg NMT), trasa się wyznacza - z ostrzeżeniem w opisie.
# Kara: OVER_LIMIT_PENALTY + OVER_LIMIT_PER_PERCENT za każdy punkt procentowy ponad limit.
OVER_LIMIT_PENALTY = 50.0
OVER_LIMIT_PER_PERCENT = 10.0


@dataclass(frozen=True)
class RoutingProfile:
    name: str
    avoid_stairs: bool = True
    max_incline_percent: float = 6.0
    # Powyżej tego nachylenia blokada (strome stoki, nieoznaczone schodki, błędy NMT). Inaczej
    # router wybrałby np. trawiastą skarpę Wawelu (~50%) zamiast podjazdu (~11%).
    hard_max_incline_percent: float = 15.0
    max_kerb_height_cm: float = 3.0
    # nawierzchnia -> mnożnik kosztu (1.0 = bez kary)
    surface_penalty: dict[str, float] = field(default_factory=dict)
    # kara za brak danych o krawędzi (niepewność)
    unknown_penalty: float = 1.2
    # tagi OSM, przy których schody są przejezdne mimo avoid_stairs (np. szyny dla wózka)
    stair_ramp_tags: tuple[str, ...] = ("ramp:wheelchair",)
    stair_ramp_penalty: float = 1.5
    # odcinek oznaczony w OSM jako pochyły (incline=up/down), ale bez wartości w %
    unknown_incline_penalty: float = 1.5
    # krawężnik oznaczony w OSM, ale bez wysokości (barrier=kerb, kerb=yes)
    unknown_kerb_penalty: float = 1.5
    # krawędź z tagiem wheelchair=no jest nieprzejezdna
    wheelchair_no_impassable: bool = True
    speed_m_s: float = 0.9


PROFILES: dict[str, RoutingProfile] = {
    "wheelchair": RoutingProfile(
        name="wheelchair",
        avoid_stairs=True,
        max_incline_percent=6.0,
        max_kerb_height_cm=2.0,
        surface_penalty={s: 4.0 for s in ROUGH_SURFACES}
        | {s: 6.0 for s in UNPAVED_SURFACES}
        | {"paving_stones": 1.3},
        stair_ramp_tags=("ramp:wheelchair",),
        unknown_incline_penalty=2.0,
        unknown_kerb_penalty=2.0,
        speed_m_s=0.9,
    ),
    "stroller": RoutingProfile(
        name="stroller",
        avoid_stairs=True,
        max_incline_percent=10.0,
        max_kerb_height_cm=5.0,
        surface_penalty={s: 2.0 for s in ROUGH_SURFACES | UNPAVED_SURFACES} | {"sett": 1.3},
        stair_ramp_tags=("ramp:stroller", "ramp:wheelchair"),
        stair_ramp_penalty=2.0,
        unknown_incline_penalty=1.1,
        unknown_kerb_penalty=1.2,
        wheelchair_no_impassable=False,
        speed_m_s=1.1,
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


def tag(edge: dict[str, Any], key: str) -> Any:
    """Wartość tagu krawędzi. Po uproszczeniu grafu (osmnx) bywa listą lub jej zapisem tekstowym."""
    value = edge.get(key)
    if isinstance(value, str) and value.startswith("["):
        try:
            value = ast.literal_eval(value)
        except (ValueError, SyntaxError):
            return value
    if isinstance(value, list):
        return value[0] if value else None
    return value


_PERCENT = re.compile(r"^(-?\d+(?:\.\d+)?)\s*%?$")


def incline_percent(edge: dict[str, Any]) -> float | None:
    """Nachylenie w % z `incline_percent` (np. z NMT) albo z tagu OSM `incline=8%`."""
    explicit = edge.get("incline_percent")
    if explicit is not None:
        return float(explicit)
    raw = tag(edge, "incline")
    if isinstance(raw, str) and (m := _PERCENT.match(raw.strip())):
        return float(m.group(1))
    return None


def has_unknown_incline(edge: dict[str, Any]) -> bool:
    return tag(edge, "incline") in ("up", "down", "yes")


def kerb_cm(edge: dict[str, Any]) -> float | None:
    """Wysokość krawężnika na krawędzi [cm] (z węzłów barrier=kerb, patrz graph.add_kerbs)."""
    value = edge.get("kerb_height_cm")
    return float(value) if value is not None else None


def has_unknown_kerb(edge: dict[str, Any]) -> bool:
    return edge.get("kerb_unknown") in ("yes", True)


def is_steps(edge: dict[str, Any]) -> bool:
    return tag(edge, "highway") == "steps"


def stair_ramp(edge: dict[str, Any], profile: RoutingProfile) -> str | None:
    for key in profile.stair_ramp_tags:
        if tag(edge, key) == "yes":
            return key
    return None


def edge_cost(edge: dict[str, Any], profile: RoutingProfile) -> float | None:
    """Koszt krawędzi grafu (atrybuty jak w osmnx: length, highway, surface, incline...)."""
    length = float(edge.get("length", 0.0))
    multiplier = 1.0

    if is_steps(edge) and profile.avoid_stairs:
        if not stair_ramp(edge, profile):
            return None
        multiplier *= profile.stair_ramp_penalty

    if profile.wheelchair_no_impassable and tag(edge, "wheelchair") == "no":
        return None

    incline = incline_percent(edge)
    if incline is not None and abs(incline) > profile.max_incline_percent:
        if abs(incline) > max(profile.hard_max_incline_percent, profile.max_incline_percent):
            return None
        excess = abs(incline) - profile.max_incline_percent
        multiplier *= OVER_LIMIT_PENALTY + OVER_LIMIT_PER_PERCENT * excess
    if incline is None and has_unknown_incline(edge):
        multiplier *= profile.unknown_incline_penalty

    kerb = kerb_cm(edge)
    if kerb is not None and kerb > profile.max_kerb_height_cm:
        return None
    if has_unknown_kerb(edge):
        multiplier *= profile.unknown_kerb_penalty

    surface = tag(edge, "surface")
    if surface is None:
        multiplier *= profile.unknown_penalty
    else:
        multiplier *= profile.surface_penalty.get(surface, 1.0)
    return length * multiplier
