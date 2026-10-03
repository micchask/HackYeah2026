from fastapi import APIRouter

from app.api import cities, geocode, health, institutions, places, reports, routes

api_router = APIRouter(prefix="/api")
for module in (health, cities, places, routes, reports, geocode, institutions):
    api_router.include_router(module.router)
