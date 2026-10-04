from fastapi import APIRouter

from app.api import (
    barriers,
    cities,
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
    barriers,
):
    api_router.include_router(module.router)
