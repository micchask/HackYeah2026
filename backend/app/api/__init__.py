from fastapi import APIRouter

from app.api import cities, health, places, reports, routes

api_router = APIRouter(prefix="/api")
for module in (health, cities, places, routes, reports):
    api_router.include_router(module.router)
