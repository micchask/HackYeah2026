from fastapi import APIRouter

from app.api import cities, geocode, health, places, reports, routes, segments

api_router = APIRouter(prefix="/api")
for module in (health, cities, places, routes, reports, geocode, segments):
    api_router.include_router(module.router)
