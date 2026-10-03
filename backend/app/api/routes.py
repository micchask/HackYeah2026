import logging
from typing import Any

from fastapi import APIRouter, HTTPException

from app.cities import get_city
from app.mocks.data import mock_route
from app.models import RouteRequest, RouteResponse
from app.routing.geojson import route_to_geojson
from app.routing.graph import get_city_graph
from app.routing.planner import NoRouteError, plan_route

logger = logging.getLogger(__name__)
router = APIRouter(tags=["routes"])


def _mock(req: RouteRequest, reason: str) -> RouteResponse:
    route = mock_route(req)
    route.warnings.insert(0, reason)
    return route


@router.post("/routes", response_model=RouteResponse)
def plan(req: RouteRequest) -> RouteResponse:
    try:
        city = get_city(req.city)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    if not (
        city.contains(req.origin.lat, req.origin.lon)
        and city.contains(req.destination.lat, req.destination.lon)
    ):
        return _mock(req, "Punkt poza obszarem demo - pokazujemy trasę przykładową.")

    try:
        city_graph = get_city_graph(city)
    except Exception:
        logger.exception("Graf %s niedostępny", city.id)
        return _mock(req, "Graf ulic jest niedostępny - pokazujemy trasę przykładową.")

    try:
        return plan_route(req, city_graph)
    except NoRouteError as exc:
        raise HTTPException(
            status_code=422,
            detail="Nie znaleziono trasy spełniającej preferencje. Spróbuj złagodzić ustawienia.",
        ) from exc


@router.post("/routes/geojson")
def plan_geojson(req: RouteRequest) -> dict[str, Any]:
    """Ta sama trasa co `POST /routes`, jako GeoJSON FeatureCollection.

    Odcinki mają `properties.kind = "segment"` i `index`, trasa bazowa (najkrótsza zwykła)
    `kind = "baseline"`. Podsumowanie trasy jest w `properties` kolekcji.
    """
    return route_to_geojson(plan(req))
