"""Wyniki dostępności i pewności danych dla segmentów oraz całej trasy."""

from typing import Any

from app.models import RouteSegment
from app.routing.profiles import (
    RoutingProfile,
    edge_cost,
    has_unknown_incline,
    incline_percent,
    tag,
)


def accessibility_score(edges: list[dict[str, Any]], profile: RoutingProfile) -> int:
    """Wynik 0-100: średnia ocen krawędzi ważona ich długością.

    Krawędź zaczyna od 100 punktów. Dzielimy je przez iloczyn kar użytych
    przez routing (np. za bruk, brak danych lub schody z rampą). Krawędź
    nieprzejezdna dostaje 0, choć normalnie nie trafi do znalezionej trasy.
    """
    total = sum(max(float(edge.get("length", 0.0)), 0.0) for edge in edges)
    if total <= 0:
        return 0

    weighted = 0.0
    for edge in edges:
        length = max(float(edge.get("length", 0.0)), 0.0)
        cost = edge_cost(edge, profile)
        if cost is None:
            edge_score = 0.0
        elif cost <= 0 or length <= 0:
            edge_score = 100.0
        else:
            edge_score = min(100.0, 100.0 * length / cost)
        weighted += edge_score * length
    return round(weighted / total)


def data_confidence(edges: list[dict[str, Any]]) -> float:
    """Pewność 0-1: jakość danych OSM ważona długością krawędzi.

    Jedno źródło z podaną nawierzchnią daje 0.60, brak nawierzchni 0.35,
    a nieprecyzyjne oznaczenie nachylenia odejmuje kolejne 0.10.
    """
    total = sum(max(float(edge.get("length", 0.0)), 0.0) for edge in edges)
    if total <= 0:
        return 0.0

    weighted = 0.0
    for edge in edges:
        confidence = 0.6 if tag(edge, "surface") else 0.35
        if has_unknown_incline(edge) and incline_percent(edge) is None:
            confidence -= 0.1
        weighted += max(confidence, 0.0) * max(float(edge.get("length", 0.0)), 0.0)
    return round(weighted / total, 2)


def aggregate_route_scores(segments: list[RouteSegment]) -> tuple[int, float]:
    """Agreguje oba wyniki segmentów dla trasy, ważąc je długością."""
    total = sum(max(segment.distance_m, 0.0) for segment in segments)
    if total <= 0:
        return 0, 0.0

    accessibility = sum(
        segment.accessibility_score * max(segment.distance_m, 0.0) for segment in segments
    )
    confidence = sum(segment.confidence * max(segment.distance_m, 0.0) for segment in segments)
    return round(accessibility / total), round(confidence / total, 2)
