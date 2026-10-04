from fastapi import APIRouter

from app.api import (
    barriers,
    cities,
    data_gaps,
    geocode,
    health,
    institutions,
    places,
    pois,
    profiles,
    reports,
    routes,
    search,
    segments,
    stats,
)

api_router = APIRouter(prefix="/api")
for module in (
    health,
    cities,
    places,
    pois,
    profiles,
    routes,
    reports,
    geocode,
    institutions,
    search,
    segments,
    data_gaps,
    barriers,
    stats,
):
    api_router.include_router(module.router)
