"""Trasa jako GeoJSON (RFC 7946) - do podania wprost do źródła `geojson` w MapLibre.

GeoJSON ma kolejność [lon, lat], odwrotnie niż nasze LatLon.
"""

from typing import Any

from app.models import LatLon, RouteResponse


def _line(points: list[LatLon]) -> dict[str, Any]:
    return {"type": "LineString", "coordinates": [[p.lon, p.lat] for p in points]}


def route_to_geojson(route: RouteResponse) -> dict[str, Any]:
    """FeatureCollection: odcinki trasy (`kind: "segment"`) + trasa bazowa (`kind: "baseline"`)."""
    features: list[dict[str, Any]] = [
        {
            "type": "Feature",
            "geometry": _line(segment.geometry),
            "properties": {
                "kind": "segment",
                "index": index,
                **segment.model_dump(mode="json", exclude={"geometry"}),
            },
        }
        for index, segment in enumerate(route.segments)
    ]
    if route.baseline:
        features.append(
            {
                "type": "Feature",
                "geometry": _line(route.baseline.geometry),
                "properties": {
                    "kind": "baseline",
                    **route.baseline.model_dump(mode="json", exclude={"geometry"}),
                },
            }
        )
    return {
        "type": "FeatureCollection",
        "features": features,
        # Pole spoza specyfikacji (foreign member, RFC 7946 §6.1) - MapLibre je ignoruje
        "properties": route.model_dump(mode="json", exclude={"segments", "baseline"}),
    }
