"""Potwierdzone zgłoszenia barier w routingu (#63).

Potwierdzone zgłoszenie od razu wpływa na trasy - bez przeładowania grafu:
- `apply_reports` zaznacza krawędzie w promieniu RADIUS_M od zgłoszenia atrybutem
  `report_block` (nieprzejezdne) albo `report_penalty` (mnożnik kosztu), a przy wygaśnięciu
  zgłoszenia je zdejmuje; reguły kosztu są w jednym miejscu - `profiles.edge_cost`,
- `sync_reports` robi to przed liczeniem trasy (najwyżej co SYNC_EVERY_S, od razu po `invalidate`
  - np. gdy głosy zmieniły status zgłoszenia).

Wpływ według rodzaju: remont / zablokowane przejście - blokada; inne bariery na chodniku
(krawężnik, schody, nawierzchnia…) - duża kara (objazd, jeśli rozsądny); winda, wejście,
parking nie dotyczą chodnika - tylko ostrzeżenie, gdy trasa przechodzi obok.

Ważność (bez zamknięcia przez głosy): remont do `valid_until` albo 30 dni, winda 7 dni,
pozostałe 14 dni - liczone od ostatniego potwierdzenia, więc każde „Potwierdzam” ją przedłuża.
"""

import math
import threading
import time
from dataclasses import dataclass, field
from datetime import UTC, datetime, timedelta
from enum import StrEnum

import numpy as np

from app.models import ActiveReport, LatLon, Report, ReportStatus, ReportType

RADIUS_M = 15.0  # krawędzie tak blisko zgłoszenia uznajemy za „ten chodnik”
NEAR_ROUTE_M = 30.0  # ostrzeżenie o windzie / wejściu, gdy trasa przechodzi tak blisko
DETOUR_NOTE_M = 300.0  # „trasa omija…”, gdy ominięta bariera jest tak blisko trasy
REPORT_PENALTY = 20.0  # kara: objazd do ~20x dłuższy wygrywa z przejściem przez barierę
SYNC_EVERY_S = 15.0

VALIDITY = {
    ReportType.CONSTRUCTION: timedelta(days=30),  # gdy brak daty końca remontu
    ReportType.ELEVATOR_BROKEN: timedelta(days=7),
}
DEFAULT_VALIDITY = timedelta(days=14)

TYPE_LABEL = {
    ReportType.BARRIER: "zgłoszona bariera",
    ReportType.CONSTRUCTION: "remont / zablokowane przejście",
    ReportType.ELEVATOR_BROKEN: "niedziałająca winda",
    ReportType.INACCESSIBLE_ENTRANCE: "niedostępne wejście",
    ReportType.BLOCKED_PARKING: "zablokowane miejsce parkingowe dla OzN",
}


class Effect(StrEnum):
    BLOCK = "block"  # odcinek nieprzejezdny
    PENALTY = "penalty"  # odcinek bardzo kosztowny
    WARN = "warn"  # nie dotyczy chodnika - tylko ostrzeżenie


def report_effect(report: Report) -> Effect:
    if report.type == ReportType.CONSTRUCTION:
        return Effect.BLOCK
    if report.type == ReportType.BARRIER:
        blocked = report.attribute == "blocked" and report.value is True
        return Effect.BLOCK if blocked else Effect.PENALTY
    return Effect.WARN


def active_until(report: Report) -> datetime:
    """Do kiedy zgłoszenie wpływa na trasy (gdy nikt go wcześniej nie zamknie)."""
    if report.type == ReportType.CONSTRUCTION and report.valid_until:
        return datetime.combine(report.valid_until, datetime.max.time(), tzinfo=UTC)
    since = report.last_confirmed_at or report.updated_at or report.created_at
    return since + VALIDITY.get(report.type, DEFAULT_VALIDITY)


def is_active(report: Report, now: datetime) -> bool:
    return report.status == ReportStatus.CONFIRMED and now <= active_until(report)


def confirmed_ago(report: Report, now: datetime) -> str:
    when = report.last_confirmed_at or report.updated_at or report.created_at
    days = (now.date() - when.date()).days
    if days <= 0:
        return "potwierdzone dziś"
    if days == 1:
        return "potwierdzone wczoraj"
    return f"potwierdzone {days} dni temu"


# --- geometria ---------------------------------------------------------------------------


def _xy(lat0: float, lat: float, lon: float) -> tuple[float, float]:
    """Metry względem punktu odniesienia (przybliżenie równoodległościowe)."""
    return lon * 111_320 * math.cos(math.radians(lat0)), lat * 111_320


def distance_to_line(point: LatLon, line: list[tuple[float, float]]) -> float:
    """Najmniejsza odległość [m] punktu od łamanej [(lon, lat), ...]."""
    px, py = _xy(point.lat, point.lat, point.lon)
    pts = [_xy(point.lat, lat, lon) for lon, lat in line]
    if len(pts) == 1:
        return math.hypot(px - pts[0][0], py - pts[0][1])
    best = math.inf
    for (ax, ay), (bx, by) in zip(pts, pts[1:], strict=False):
        dx, dy = bx - ax, by - ay
        length2 = dx * dx + dy * dy
        t = 0.0 if length2 == 0 else max(0.0, min(1.0, ((px - ax) * dx + (py - ay) * dy) / length2))
        best = min(best, math.hypot(px - (ax + t * dx), py - (ay + t * dy)))
    return best


def _edge_line(graph, u: int, v: int, data: dict) -> list[tuple[float, float]]:
    geometry = data.get("geometry")
    if geometry is not None and hasattr(geometry, "coords"):
        return list(geometry.coords)
    return [(graph.nodes[n]["x"], graph.nodes[n]["y"]) for n in (u, v)]


def edges_near(city_graph, point: LatLon, radius_m: float = RADIUS_M) -> list[tuple[int, int, int]]:
    """Krawędzie (u, v, key) bliżej niż `radius_m` od punktu - obie strony tej samej ulicy."""
    graph = city_graph.graph
    k = math.cos(math.radians(point.lat))
    d2 = (city_graph.node_lat - point.lat) ** 2 + ((city_graph.node_lon - point.lon) * k) ** 2
    # kandydaci: węzły w promieniu z zapasem na długie krawędzie
    near = city_graph.node_ids[np.sqrt(d2) * 111_320 <= radius_m + 150]
    found: set[tuple[int, int, int]] = set()
    for n in near.tolist():
        for u, v, key, data in [
            *graph.out_edges(n, keys=True, data=True),
            *graph.in_edges(n, keys=True, data=True),
        ]:
            if (u, v, key) in found:
                continue
            if distance_to_line(point, _edge_line(graph, u, v, data)) <= radius_m:
                found.add((u, v, key))
    return sorted(found)


# --- stan na grafie ----------------------------------------------------------------------


@dataclass
class AppliedReports:
    """Co jest teraz zaznaczone na grafie miasta - do zdjęcia przy wygaśnięciu."""

    edges: dict[str, list[tuple[int, int, int]]] = field(default_factory=dict)
    reports: dict[str, Report] = field(default_factory=dict)
    synced_at: float = 0.0


_STATE: dict[tuple[str, int], AppliedReports] = {}  # (miasto, graf) -> ostatnia synchronizacja
_GRAPH_STATE: dict[int, AppliedReports] = {}  # graf -> co jest na nim zaznaczone
_LOCK = threading.Lock()


def _clear_edges(graph, edges: list[tuple[int, int, int]]) -> None:
    for u, v, key in edges:
        if graph.has_edge(u, v, key):
            data = graph.edges[u, v, key]
            for attr in ("report_block", "report_penalty", "report_ids"):
                data.pop(attr, None)


def apply_reports(city_graph, reports: list[Report], now: datetime) -> AppliedReports:
    """Zaznacza na grafie aktywne zgłoszenia z wpływem na chodnik, zdejmuje wygasłe."""
    graph = city_graph.graph
    active = [r for r in reports if is_active(r, now)]
    state = AppliedReports(reports={r.id: r for r in active})
    marks: dict[tuple[int, int, int], list[Report]] = {}
    for report in active:
        if report_effect(report) == Effect.WARN:
            continue
        edges = edges_near(city_graph, report.location)
        state.edges[report.id] = edges
        for edge in edges:
            marks.setdefault(edge, []).append(report)

    # zdejmujemy poprzednie zaznaczenia (także wygasłych zgłoszeń) i nakładamy aktualne
    key = id(graph)
    old = _GRAPH_STATE.get(key)
    if old:
        _clear_edges(graph, [e for edges in old.edges.values() for e in edges])
    for (u, v, k), reports in marks.items():
        data = graph.edges[u, v, k]
        data["report_ids"] = [r.id for r in reports]
        if any(report_effect(r) == Effect.BLOCK for r in reports):
            data["report_block"] = True
        else:
            data["report_penalty"] = REPORT_PENALTY
    _GRAPH_STATE[key] = state
    return state


def sync_reports(
    city_id: str, city_graph, load_reports, now: datetime | None = None
) -> AppliedReports:
    """Uzgadnia graf ze zgłoszeniami (najwyżej co SYNC_EVERY_S, chyba że `invalidate`)."""
    key = (city_id, id(city_graph.graph))
    with _LOCK:
        state = _STATE.get(key)
        if state and time.monotonic() - state.synced_at < SYNC_EVERY_S:
            return state
        applied = apply_reports(city_graph, load_reports(), now or datetime.now(UTC))
        applied.synced_at = time.monotonic()
        _STATE[key] = applied
        return applied


def invalidate(city_id: str) -> None:
    """Status zgłoszenia się zmienił - następna trasa uzgodni graf od razu."""
    with _LOCK:
        for (city, _), state in _STATE.items():
            if city == city_id:
                state.synced_at = 0.0


# --- odpowiedź trasy i frontend --------------------------------------------------------


def report_warnings(
    applied: AppliedReports,
    route_edges: list[dict],
    route_line: list[tuple[float, float]],
    city_graph,
    now: datetime,
) -> list[str]:
    """Ostrzeżenia trasy: co omija, przez co musi przejść, co jest obok (winda, wejście)."""
    passed = {rid for edge in route_edges for rid in edge.get("report_ids", [])}
    warnings: list[str] = []
    for report in applied.reports.values():
        if len(route_line) < 1:
            break
        distance = distance_to_line(report.location, route_line)
        where = city_graph.nearby_name(report.location.lat, report.location.lon, 40)
        about = f"{TYPE_LABEL.get(report.type, 'zgłoszona bariera')}"
        about += f" – {where}" if where else ""
        about += f" ({confirmed_ago(report, now)})"
        effect = report_effect(report)
        if effect == Effect.WARN:
            if distance <= NEAR_ROUTE_M:
                warnings.append(f"Przy trasie zgłoszono: {about}.")
        elif report.id in passed:
            warnings.append(
                f"Trasa przechodzi przez zgłoszoną barierę: {about} – nie ma rozsądnego objazdu."
            )
        elif distance <= DETOUR_NOTE_M:
            warnings.append(f"Trasa omija zgłoszoną barierę: {about}.")
    return warnings


def active_reports(reports: list[Report], now: datetime) -> list[ActiveReport]:
    return [
        ActiveReport(
            id=r.id,
            type=r.type,
            effect=report_effect(r).value,
            label=TYPE_LABEL.get(r.type, "zgłoszona bariera"),
            location=r.location,
            active_until=active_until(r),
        )
        for r in reports
        if is_active(r, now)
    ]
