from fastapi import APIRouter

from app.api import (
    barriers,
    cities,
    geocode,
    health,
    institutions,
    places,
    reports,
    routes,
    segments,
)

api_router = APIRouter(prefix="/api")
for module in (
    health,
    cities,
    places,
    routes,
    reports,
    geocode,
    institutions,
    segments,
    barriers,
):
    api_router.include_router(module.router)
