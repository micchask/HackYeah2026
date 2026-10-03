"""Planowanie trasy na grafie i opis tekstowy segment po segmencie (tekstowa alternatywa mapy)."""

import logging
import math
from dataclasses import dataclass, field, replace
from datetime import UTC, datetime
from time import perf_counter
from typing import Any

from app.models import (
    AttributeStatus,
    BarrierType,
    Difficulty,
    LatLon,
    RouteAlternative,
    RouteBarrier,
    RouteBaseline,
    RouteRequest,
    RouteResponse,
    RouteSegment,
)
from app.routing.graph import CityGraph, path_edges, shortest_path, shortest_walking_path
from app.routing.profiles import (
    ROUGH_SURFACES,
    UNPAVED_SURFACES,
    RoutingProfile,
    has_unknown_incline,
    has_unknown_kerb,
    incline_percent,
    is_steps,
    kerb_cm,
    profile_from_preferences,
    stair_ramp,
    tag,
)
from app.routing.scores import accessibility_score, aggregate_route_scores, data_confidence

SURFACE_PL = {
    "asphalt": "asfalt",
    "concrete": "beton",
    "concrete:plates": "płyty betonowe",
    "paving_stones": "kostka/płyty chodnikowe",
    "paved": "utwardzona",
    "sett": "kostka granitowa (bruk)",
    "cobblestone": "kocie łby",
    "unhewn_cobblestone": "kocie łby",
    "gravel": "żwir",
    "fine_gravel": "drobny żwir",
    "pebblestone": "otoczaki",
    "compacted": "ubita ziemia",
    "dirt": "ziemia",
    "ground": "ziemia",
    "grass": "trawa",
    "rock": "skała",
    "wood": "drewno",
    "metal": "metal",
    "unpaved": "nieutwardzona",
}
EASY_SURFACES = {"asphalt", "concrete", "concrete:plates", "paving_stones", "paved", "metal"}
HARD_SURFACES = ROUGH_SURFACES | UNPAVED_SURFACES
HIGHWAY_PL = {
    "footway": "chodnik",
    "path": "ścieżka",
    "pedestrian": "deptak",
    "steps": "schody",
    "living_street": "strefa zamieszkania",
    "service": "droga dojazdowa",
    "residential": "ulica",
    "cycleway": "ścieżka pieszo-rowerowa",
    "track": "droga gruntowa",
}
COMPASS_PL = [
    "północ",
    "północny wschód",
    "wschód",
    "południowy wschód",
    "południe",
    "południowy zachód",
    "zachód",
    "północny zachód",
]
MIN_SEGMENT_M = 25
MAX_SHARED_LENGTH_RATIO = 0.8

logger = logging.getLogger(__name__)
# Od tej wysokości krawężnik jest problemem dla większości wózków
HIGH_KERB_CM = 6.0
# Niższe krawężniki (obniżone, ok. 2 cm) nie wymagają ostrzeżenia
WARN_KERB_CM = 3.0
# Powyżej tego nachylenia [%] odcinek jest trudny (próg profilu wózka inwalidzkiego)
STEEP_PERCENT = 6.0


class NoRouteError(Exception):
    pass


@dataclass
class _Segment:
    street: str
    key: tuple
    edges: list[dict[str, Any]] = field(default_factory=list)
    geometry: list[LatLon] = field(default_factory=list)

    @property
    def length(self) -> float:
        return sum(float(e["length"]) for e in self.edges)


@dataclass
class _RouteCandidate:
    label: str
    edges: list[dict[str, Any]]
    segments: list[RouteSegment]
    distance_m: float
    duration_s: float
    stairs_count: int
    rough_surface_m: float
    geometry: list[LatLon]


def plan_route(req: RouteRequest, city_graph: CityGraph) -> RouteResponse:
    profile = profile_from_preferences(req.preferences)
    graph = city_graph.graph
    source, d_source = city_graph.nearest_node(req.origin.lat, req.origin.lon)
    target, d_target = city_graph.nearest_node(req.destination.lat, req.destination.lon)

    timings_ms: dict[str, float] = {}
    started = perf_counter()
    try:
        path = shortest_path(graph, source, target, profile)
    except Exception as exc:
        raise NoRouteError from exc
    timings_ms["main"] = (perf_counter() - started) * 1000

    fetched_at = graph_fetched_at(graph.graph)
    main = _candidate(
        "Trasa najbardziej dostępna",
        path_edges(graph, path, profile),
        city_graph,
        profile,
        fetched_at,
    )

    shortest = _optional_candidate(
        "Najkrótsza trasa piesza",
        city_graph,
        source,
        target,
        route_profile=None,
        description_profile=profile,
        fetched_at=fetched_at,
        timings_ms=timings_ms,
        timing_key="shortest",
    )
    compromise_profile = _compromise_profile(profile)
    compromise = _optional_candidate(
        "Trasa kompromisowa",
        city_graph,
        source,
        target,
        route_profile=compromise_profile,
        description_profile=compromise_profile,
        fetched_at=fetched_at,
        timings_ms=timings_ms,
        timing_key="compromise",
    )

    route_accessibility, route_confidence = aggregate_route_scores(main.segments)
    warnings: list[str] = []
    for label, d in (("A", d_source), ("B", d_target)):
        if d > 50:
            warnings.append(f"Punkt {label} jest {round(d)} m od najbliższego chodnika.")

    baseline = _baseline(shortest)
    alternatives = _alternatives(main, shortest, compromise)
    explanation = _main_explanation(main, shortest)
    logger.info(
        "Dijkstra dla kandydatów tras [ms]: main=%.1f, shortest=%.1f, compromise=%.1f, total=%.1f",
        timings_ms.get("main", 0.0),
        timings_ms.get("shortest", 0.0),
        timings_ms.get("compromise", 0.0),
        sum(timings_ms.values()),
    )

    return RouteResponse(
        distance_m=main.distance_m,
        duration_s=main.duration_s,
        segments=main.segments,
        accessibility_score=route_accessibility,
        confidence=route_confidence,
        warnings=warnings,
        is_mock=False,
        profile=req.preferences.profile,
        rough_surface_m=main.rough_surface_m,
        stairs_count=main.stairs_count,
        baseline=baseline,
        explanation=explanation,
        alternatives=alternatives,
    )


def _optional_candidate(
    label: str,
    city_graph: CityGraph,
    source: int,
    target: int,
    route_profile: RoutingProfile | None,
    description_profile: RoutingProfile,
    fetched_at: datetime | None,
    timings_ms: dict[str, float],
    timing_key: str,
) -> _RouteCandidate | None:
    started = perf_counter()
    try:
        if route_profile is None:
            path = shortest_walking_path(city_graph.graph, source, target)
        else:
            path = shortest_path(city_graph.graph, source, target, route_profile)
        edges = path_edges(city_graph.graph, path, route_profile)
        return _candidate(label, edges, city_graph, description_profile, fetched_at)
    except Exception:
        logger.warning("Nie udało się wyznaczyć wariantu trasy: %s", label, exc_info=True)
        return None
    finally:
        timings_ms[timing_key] = (perf_counter() - started) * 1000


def _candidate(
    label: str,
    edges: list[dict[str, Any]],
    city_graph: CityGraph,
    profile: RoutingProfile,
    fetched_at: datetime | None,
) -> _RouteCandidate:
    grouped = _group(edges, city_graph)
    segments = [
        _to_segment(seg, profile, grouped[i - 1] if i else None, fetched_at)
        for i, seg in enumerate(grouped)
    ]
    distance = round(sum(segment.distance_m for segment in segments), 1)
    return _RouteCandidate(
        label=label,
        edges=edges,
        segments=segments,
        distance_m=distance,
        duration_s=round(distance / profile.speed_m_s),
        stairs_count=_stairs_count(edges),
        rough_surface_m=round(_rough_m(edges)),
        geometry=_route_geometry(edges, city_graph),
    )


def _compromise_profile(profile: RoutingProfile) -> RoutingProfile:
    """Zostawia bariery profilu, ale zmniejsza o połowę kary za nawierzchnię."""
    penalties = {
        surface: 1.0 + (penalty - 1.0) / 2 for surface, penalty in profile.surface_penalty.items()
    }
    return replace(profile, name=f"{profile.name}_compromise", surface_penalty=penalties)


# --- grupowanie krawędzi w odcinki -------------------------------------------------------


def _edge_geometry(edge: dict[str, Any], graph) -> list[LatLon]:
    u, v = edge["_u"], edge["_v"]
    geom = edge.get("geometry")
    if geom is not None and hasattr(geom, "coords"):
        coords = [(lat, lon) for lon, lat in geom.coords]
        start = graph.nodes[u]
        if _dist2(coords[0], (start["y"], start["x"])) > _dist2(
            coords[-1], (start["y"], start["x"])
        ):
            coords.reverse()
    else:
        coords = [(graph.nodes[n]["y"], graph.nodes[n]["x"]) for n in (u, v)]
    return [LatLon(lat=lat, lon=lon) for lat, lon in coords]


def _dist2(a: tuple[float, float], b: tuple[float, float]) -> float:
    return (a[0] - b[0]) ** 2 + (a[1] - b[1]) ** 2


def _street(edge: dict[str, Any], city_graph: CityGraph, geometry: list[LatLon]) -> str:
    """Nazwa ulicy; chodniki bez nazwy w OSM dostają nazwę najbliższej ulicy."""
    name = tag(edge, "name")
    highway = tag(edge, "highway") or "path"
    if name:
        return str(name)
    if highway == "steps":
        return "schody"
    mid = geometry[len(geometry) // 2]
    return city_graph.nearby_name(mid.lat, mid.lon) or HIGHWAY_PL.get(highway, "przejście")


def edge_difficulty(edge: dict[str, Any]) -> Difficulty:
    surface = tag(edge, "surface")
    incline = incline_percent(edge)
    kerb = kerb_cm(edge)
    if (
        is_steps(edge)
        or surface in HARD_SURFACES
        or (incline is not None and abs(incline) > STEEP_PERCENT)
        or (kerb is not None and kerb >= HIGH_KERB_CM)
    ):
        return Difficulty.HARD
    if surface not in EASY_SURFACES or has_unknown_incline(edge) or has_unknown_kerb(edge):
        return Difficulty.MODERATE
    return Difficulty.EASY


def edge_barriers(edge: dict[str, Any]) -> list[RouteBarrier]:
    """Bariery krawędzi, od najważniejszej (kolejność jak w BarrierType).

    Te same progi co w `edge_difficulty`, więc bariera zawsze oznacza trudny odcinek.
    """
    barriers: list[RouteBarrier] = []
    if is_steps(edge):
        count = _int(tag(edge, "step_count"))
        text = "Schody" + (f", {count} {_steps_word(count)}" if count else "")
        if tag(edge, "ramp:wheelchair") == "yes" or tag(edge, "ramp") in ("yes", True):
            text += " (z rampą)"
        elif tag(edge, "ramp:stroller") == "yes":
            text += " (z szynami dla wózka dziecięcego)"
        barriers.append(RouteBarrier(type=BarrierType.STAIRS, description=text))
    if (kerb := kerb_cm(edge)) is not None and kerb >= HIGH_KERB_CM:
        barriers.append(
            RouteBarrier(type=BarrierType.KERB, description=f"Krawężnik ok. {kerb:g} cm")
        )
    if (incline := incline_percent(edge)) is not None and abs(incline) > STEEP_PERCENT:
        barriers.append(
            RouteBarrier(type=BarrierType.STEEP, description=f"Nachylenie {abs(incline):g}%")
        )
    if (surface := tag(edge, "surface")) in HARD_SURFACES:
        name = SURFACE_PL.get(surface, surface)
        barriers.append(
            RouteBarrier(type=BarrierType.ROUGH_SURFACE, description=name[:1].upper() + name[1:])
        )
    return barriers


def segment_barriers(edges: list[dict[str, Any]]) -> list[RouteBarrier]:
    """Bariery odcinka trasy bez powtórzeń (np. bruk na kilku krawędziach tej samej ulicy)."""
    unique: dict[tuple[BarrierType, str], RouteBarrier] = {}
    for edge in edges:
        for barrier in edge_barriers(edge):
            unique.setdefault((barrier.type, barrier.description), barrier)
    order = list(BarrierType)
    return sorted(unique.values(), key=lambda b: order.index(b.type))


def _steps_word(n: int) -> str:
    """1 stopień, 2-4 stopnie (bez 12-14), reszta stopni."""
    if n == 1:
        return "stopień"
    if n % 10 in (2, 3, 4) and n % 100 not in (12, 13, 14):
        return "stopnie"
    return "stopni"


def _int(value: Any) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _group(edges: list[dict[str, Any]], city_graph: CityGraph) -> list[_Segment]:
    """Łączy kolejne krawędzie tej samej ulicy w odcinki; schody są zawsze osobnym odcinkiem."""
    graph = city_graph.graph
    segments: list[_Segment] = []
    for edge in edges:
        geometry = _edge_geometry(edge, graph)
        street = _street(edge, city_graph, geometry)
        segments.append(
            _Segment(street=street, key=(street, is_steps(edge)), edges=[edge], geometry=geometry)
        )

    # krótkie wstawki (np. przejście przez przecznicę) doklejamy do poprzedniego odcinka
    absorbed: list[_Segment] = []
    for seg in segments:
        tiny = seg.length < MIN_SEGMENT_M and not seg.key[1]
        if absorbed and tiny and not absorbed[-1].key[1]:
            _extend(absorbed[-1], seg)
        else:
            absorbed.append(seg)

    merged: list[_Segment] = []
    for seg in absorbed:
        if merged and merged[-1].key == seg.key:
            _extend(merged[-1], seg)
        else:
            merged.append(seg)
    return merged


def _extend(seg: _Segment, other: _Segment) -> None:
    seg.edges.extend(other.edges)
    seg.geometry.extend(other.geometry[1:])


def _segment_difficulty(edges: list[dict[str, Any]]) -> Difficulty:
    total = sum(float(e["length"]) for e in edges) or 1.0
    by_level = {level: 0.0 for level in Difficulty}
    for e in edges:
        by_level[edge_difficulty(e)] += float(e["length"])
    if any(is_steps(e) for e in edges):
        return Difficulty.HARD
    hard = by_level[Difficulty.HARD]
    if hard >= 25 or hard / total >= 0.3:
        return Difficulty.HARD
    if (hard + by_level[Difficulty.MODERATE]) / total >= 0.3:
        return Difficulty.MODERATE
    return Difficulty.EASY


# --- opis odcinka --------------------------------------------------------------------------


def _bearing(a: LatLon, b: LatLon) -> float:
    k = math.cos(math.radians(a.lat))
    return math.degrees(math.atan2((b.lon - a.lon) * k, b.lat - a.lat)) % 360


def _start_bearing(geometry: list[LatLon]) -> float:
    return _bearing(geometry[0], geometry[min(len(geometry) - 1, 3)])


def _end_bearing(geometry: list[LatLon]) -> float:
    return _bearing(geometry[max(0, len(geometry) - 4)], geometry[-1])


def _turn(prev: _Segment, seg: _Segment) -> str:
    delta = (_start_bearing(seg.geometry) - _end_bearing(prev.geometry) + 540) % 360 - 180
    if abs(delta) < 25:
        return "Idź dalej prosto"
    side = "w prawo" if delta > 0 else "w lewo"
    if abs(delta) < 60:
        return f"Odbij lekko {side}"
    if abs(delta) < 150:
        return f"Skręć {side}"
    return "Zawróć"


def _to_segment(
    seg: _Segment, profile: RoutingProfile, prev: _Segment | None, fetched_at: datetime | None
) -> RouteSegment:
    length = seg.length
    street, steps = seg.key
    difficulty = _segment_difficulty(seg.edges)
    if prev is None:
        compass = COMPASS_PL[round(_start_bearing(seg.geometry) / 45) % 8]
        lead = f"Ruszaj na {compass}"
    else:
        lead = _turn(prev, seg)
    instruction = f"{lead}: {street}, {round(length)} m."

    surfaces = [tag(e, "surface") for e in seg.edges]
    known = [s for s in surfaces if s]
    main_surface = max(set(known), key=known.count) if known else None
    inclines = [i for e in seg.edges if (i := incline_percent(e)) is not None]

    warnings = _warnings(seg, profile, steps)
    return RouteSegment(
        instruction=instruction,
        distance_m=round(length, 1),
        geometry=seg.geometry,
        street=street,
        surface=SURFACE_PL.get(main_surface, main_surface) if main_surface else None,
        incline_percent=max(inclines, key=abs) if inclines else None,
        warnings=warnings,
        difficulty=difficulty,
        accessibility_score=accessibility_score(seg.edges, profile),
        data_status=AttributeStatus.UNVERIFIED,
        confidence=data_confidence(seg.edges),
        sources=["OpenStreetMap"],
        barriers=segment_barriers(seg.edges),
        fetched_at=fetched_at,
        last_verified=last_verified(seg.edges),
    )


def _warnings(seg: _Segment, profile: RoutingProfile, steps: bool) -> list[str]:
    warnings: list[str] = []
    if steps:
        edge = seg.edges[0]
        count = tag(edge, "step_count")
        n = f"{count} stopni" if count else "liczba stopni nieznana"
        ramp = stair_ramp(edge, profile)
        if ramp == "ramp:stroller":
            warnings.append(f"Schody ({n}) z szynami do wprowadzenia wózka dziecięcego.")
        elif ramp == "ramp:wheelchair":
            warnings.append(f"Schody ({n}) z rampą dla wózka.")
        else:
            warnings.append(f"Schody ({n}).")
        return warnings

    rough_by_surface: dict[str, float] = {}
    for e in seg.edges:
        if (surface := tag(e, "surface")) in HARD_SURFACES:
            rough_by_surface[surface] = rough_by_surface.get(surface, 0.0) + float(e["length"])
    rough = sum(rough_by_surface.values())
    if rough >= 5:
        worst = max(rough_by_surface, key=rough_by_surface.__getitem__)
        warnings.append(
            f"Nierówna nawierzchnia ({SURFACE_PL.get(worst, worst)}), ok. {round(rough)} m."
        )
    if any(has_unknown_incline(e) and incline_percent(e) is None for e in seg.edges):
        warnings.append("Odcinek pochyły - brak dokładnych danych o nachyleniu.")
    steep = [i for e in seg.edges if (i := incline_percent(e)) is not None and abs(i) > 4]
    if steep:
        warnings.append(f"Nachylenie do {max(abs(i) for i in steep):g}%.")
    kerbs = [k for e in seg.edges if (k := kerb_cm(e)) is not None and k >= WARN_KERB_CM]
    if kerbs:
        warnings.append(f"Krawężnik ok. {max(kerbs):g} cm.")
    if any(has_unknown_kerb(e) for e in seg.edges):
        warnings.append("Krawężnik o nieznanej wysokości - sprawdź na miejscu.")
    unknown = sum(float(e["length"]) for e in seg.edges if not tag(e, "surface"))
    if unknown >= 30:
        warnings.append(f"Brak danych o nawierzchni na {round(unknown)} m.")
    return warnings


def graph_fetched_at(meta: dict[str, Any]) -> datetime | None:
    """Data pobrania grafu z OSM (osmnx zapisuje ją w `created_date`, czas UTC)."""
    try:
        return datetime.fromisoformat(str(meta["created_date"])).replace(tzinfo=UTC)
    except (KeyError, ValueError):
        return None


def last_verified(edges: list[dict[str, Any]]) -> datetime | None:
    """Najstarszy `check_date` odcinka; None, gdy choć jedna krawędź go nie ma."""
    dates = []
    for e in edges:
        raw = tag(e, "check_date")
        if not raw:
            return None
        try:
            # OSM dopuszcza też samo "2024-05"
            dates.append(datetime.fromisoformat(str(raw) + ("-01" if len(str(raw)) == 7 else "")))
        except ValueError:
            return None
    return min(dates).replace(tzinfo=UTC) if dates else None


# --- statystyki i porównanie ---------------------------------------------------------------


def _rough_m(edges: list[dict[str, Any]]) -> float:
    return sum(float(e["length"]) for e in edges if tag(e, "surface") in HARD_SURFACES)


def _stairs_count(edges: list[dict[str, Any]]) -> int:
    count, prev = 0, False
    for e in edges:
        steps = is_steps(e)
        count += steps and not prev
        prev = steps
    return count


def _route_geometry(edges: list[dict[str, Any]], city_graph: CityGraph) -> list[LatLon]:
    geometry: list[LatLon] = []
    for edge in edges:
        edge_geometry = _edge_geometry(edge, city_graph.graph)
        geometry.extend(edge_geometry if not geometry else edge_geometry[1:])
    return geometry


def _baseline(candidate: _RouteCandidate | None) -> RouteBaseline | None:
    if candidate is None:
        return None
    return RouteBaseline(
        distance_m=candidate.distance_m,
        stairs_count=candidate.stairs_count,
        rough_surface_m=candidate.rough_surface_m,
        geometry=candidate.geometry,
    )


def _alternatives(
    main: _RouteCandidate,
    shortest: _RouteCandidate | None,
    compromise: _RouteCandidate | None,
) -> list[RouteAlternative]:
    accepted = [main]
    alternatives: list[RouteAlternative] = []
    for candidate in (shortest, compromise):
        if candidate is None or any(
            _shared_length_ratio(candidate, route) > MAX_SHARED_LENGTH_RATIO for route in accepted
        ):
            continue
        accepted.append(candidate)
        alternatives.append(
            RouteAlternative(
                label=candidate.label,
                distance_m=candidate.distance_m,
                duration_s=candidate.duration_s,
                stairs_count=candidate.stairs_count,
                rough_surface_m=candidate.rough_surface_m,
                geometry=candidate.geometry,
                segments=candidate.segments,
                explanation=_alternative_explanation(candidate, main),
            )
        )
    return alternatives


def _shared_length_ratio(first: _RouteCandidate, second: _RouteCandidate) -> float:
    """Część krótszej trasy biegnąca tymi samymi krawędziami grafu."""
    first_edges = {_edge_identity(edge): float(edge["length"]) for edge in first.edges}
    second_edges = {_edge_identity(edge): float(edge["length"]) for edge in second.edges}
    shorter = min(sum(first_edges.values()), sum(second_edges.values()))
    if shorter <= 0:
        return 1.0
    shared = sum(
        min(length, second_edges[identity])
        for identity, length in first_edges.items()
        if identity in second_edges
    )
    return shared / shorter


def _edge_identity(edge: dict[str, Any]) -> tuple[Any, Any, Any]:
    return edge["_u"], edge["_v"], edge.get("_key")


def _main_explanation(main: _RouteCandidate, shortest: _RouteCandidate | None) -> str:
    if shortest is None:
        return "Trasa została dobrana do wybranego profilu dostępności."

    stairs_avoided = shortest.stairs_count - main.stairs_count
    rough_avoided = round(shortest.rough_surface_m - main.rough_surface_m)
    gains: list[str] = []
    if stairs_avoided > 0:
        gains.append(
            f"omija {stairs_avoided} {_plural(stairs_avoided, 'odcinek', 'odcinki', 'odcinków')} "
            "schodów"
        )
    if rough_avoided >= 20:
        gains.append(f"ma {rough_avoided} m mniej nierównej nawierzchni")
    if not gains:
        return "Najkrótsza trasa jest już dostępna – nie trzeba nadkładać drogi."

    extra = round(main.distance_m - shortest.distance_m)
    cost = f"jest dłuższa o {extra} m" if extra > 0 else "nie jest dłuższa"
    return f"W porównaniu z najkrótszą trasą {' i '.join(gains)}; {cost}."


def _alternative_explanation(candidate: _RouteCandidate, main: _RouteCandidate) -> str:
    if candidate.label == "Najkrótsza trasa piesza":
        barriers: list[str] = []
        extra_stairs = candidate.stairs_count - main.stairs_count
        extra_rough = round(candidate.rough_surface_m - main.rough_surface_m)
        if extra_stairs > 0:
            barriers.append(
                f"ma {extra_stairs} {_plural(extra_stairs, 'odcinek', 'odcinki', 'odcinków')} "
                "schodów więcej"
            )
        if extra_rough >= 20:
            barriers.append(f"ma {extra_rough} m więcej nierównej nawierzchni")
        suffix = f", ale {' i '.join(barriers)}" if barriers else ""
        return f"Najkrótszy wariant pieszy{suffix}."

    saved = round(main.distance_m - candidate.distance_m)
    distance = f"skraca drogę o {saved} m" if saved > 0 else "ma podobną długość"
    return (
        "Kompromis między dostępnością a długością: "
        f"{distance}, łagodniej traktując nierówne nawierzchnie."
    )


def _plural(value: int, one: str, few: str, many: str) -> str:
    if value == 1:
        return one
    if value % 10 in (2, 3, 4) and value % 100 not in (12, 13, 14):
        return few
    return many
