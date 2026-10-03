"""Łączenie danych z wielu źródeł: wybór wartości, wykrywanie konfliktów, confidence."""

import math
import re
from collections import defaultdict
from datetime import UTC, datetime, timedelta

from app.models import AccessibilityAttribute, AttributeKey, AttributeStatus, LatLon, Place
from app.normalization.text import normalize

# Po tym czasie bez weryfikacji informacja jest "outdated", a jej confidence spada
STALE_AFTER = timedelta(days=365 * 2)
STALE_PENALTY = 0.5
# Każde dodatkowe zgodne źródło podnosi pewność
AGREEMENT_BONUS = 0.15

# Ten sam obiekt w dwóch źródłach: blisko I o podobnej nazwie. Sama odległość nie wystarcza -
# obok muzeum stoi siłownia, a jej `wheelchair=no` dałoby fałszywy konflikt.
MATCH_DISTANCE_M = 30.0
MATCH_NAME_SIMILARITY = 0.7
_STOPWORDS = {"w", "i", "z", "na", "ul", "im", "oraz", "pl"}
# Komórka siatki ~55 x 35 m (większa niż MATCH_DISTANCE_M) - szukamy w 3 x 3 sąsiednich
_CELL_DEG = 0.0005


def _effective_confidence(attr: AccessibilityAttribute, now: datetime) -> float:
    verified = attr.provenance.last_verified or attr.provenance.fetched_at
    if now - verified > STALE_AFTER:
        return attr.confidence * STALE_PENALTY
    return attr.confidence


def merge_attributes(
    attrs: list[AccessibilityAttribute], now: datetime | None = None
) -> AccessibilityAttribute:
    """Scala atrybuty o tym samym kluczu z różnych źródeł w jeden."""
    if not attrs:
        raise ValueError("Brak atrybutów do scalenia")
    now = now or datetime.now(UTC)
    ranked = sorted(attrs, key=lambda a: _effective_confidence(a, now), reverse=True)
    best = ranked[0]
    agreeing = [a for a in ranked[1:] if a.value == best.value]
    disagreeing = [a for a in ranked[1:] if a.value != best.value]

    confidence = min(1.0, _effective_confidence(best, now) + AGREEMENT_BONUS * len(agreeing))
    if disagreeing:
        status = AttributeStatus.CONFLICTING
    elif _effective_confidence(best, now) < best.confidence:
        status = AttributeStatus.OUTDATED
    elif agreeing:
        status = AttributeStatus.VERIFIED
    else:
        status = AttributeStatus.UNVERIFIED

    return best.model_copy(
        update={"confidence": round(confidence, 3), "status": status, "alternatives": disagreeing}
    )


def _tokens(name: str) -> set[str]:
    return {t for t in re.findall(r"[a-z0-9]+", normalize(name)) if t not in _STOPWORDS}


def name_similarity(a: str, b: str) -> float:
    """Jaka część słów krótszej nazwy występuje w dłuższej (0-1).

    "Urząd Miasta Krakowa - Urząd Stanu Cywilnego" i "Urząd Stanu Cywilnego" -> 1.0.
    """
    ta, tb = _tokens(a), _tokens(b)
    if not ta or not tb:
        return 0.0
    return len(ta & tb) / min(len(ta), len(tb))


def distance_m(a: LatLon, b: LatLon) -> float:
    dx = (a.lon - b.lon) * math.cos(math.radians((a.lat + b.lat) / 2))
    return math.hypot(a.lat - b.lat, dx) * 111_320


def _source(place: Place) -> str:
    return place.id.split(":", 1)[0]


def _cell(point: LatLon) -> tuple[int, int]:
    return int(point.lat // _CELL_DEG), int(point.lon // _CELL_DEG)


def match_places(places: list[Place]) -> list[Place]:
    """Miejsce z innego źródła, które jest tym samym obiektem, dostaje id wcześniejszego.

    Kolejność `places` = kolejność providerów w YAML, więc wspólne id pochodzi ze źródła
    wyżej na liście (np. OSM). Bez nazwy nie dopasowujemy - lepiej nie połączyć niż źle.
    """
    grid: dict[tuple[int, int], list[Place]] = defaultdict(list)
    result: list[Place] = []
    for place in places:
        match: Place | None = None
        if place.name:
            lat_cell, lon_cell = _cell(place.location)
            candidates = (
                other
                for dlat in (-1, 0, 1)
                for dlon in (-1, 0, 1)
                for other in grid[(lat_cell + dlat, lon_cell + dlon)]
                if other.name and _source(other) != _source(place)
            )
            best = math.inf
            for other in candidates:
                d = distance_m(place.location, other.location)
                if (
                    d <= MATCH_DISTANCE_M
                    and d < best
                    and name_similarity(place.name, other.name) >= MATCH_NAME_SIMILARITY
                ):
                    match, best = other, d
        if match:
            place = place.model_copy(update={"id": match.id})
        else:
            grid[_cell(place.location)].append(place)
        result.append(place)
    return result


def merge_places(places: list[Place]) -> list[Place]:
    """Dopasowuje ten sam obiekt z różnych źródeł (match_places) i scala jego atrybuty."""
    by_id: dict[str, Place] = {}
    attrs_by_id: dict[str, dict[AttributeKey, list[AccessibilityAttribute]]] = defaultdict(
        lambda: defaultdict(list)
    )
    for place in match_places(places):
        first = by_id.setdefault(place.id, place)
        if first.name is None and place.name:
            by_id[place.id] = first.model_copy(update={"name": place.name})
        for attr in place.attributes:
            attrs_by_id[place.id][attr.key].append(attr)
    return [
        place.model_copy(
            update={"attributes": [merge_attributes(a) for a in attrs_by_id[pid].values()]}
        )
        for pid, place in by_id.items()
    ]
