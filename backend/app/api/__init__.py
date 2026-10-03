from fastapi import APIRouter

from app.api import cities, geocode, health, institutions, places, reports, routes, search

api_router = APIRouter(prefix="/api")
for module in (health, cities, places, routes, reports, geocode, institutions, search):
    api_router.include_router(module.router)
