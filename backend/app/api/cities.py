from fastapi import APIRouter

from app.cities import CityConfig, load_cities

router = APIRouter(tags=["cities"])


@router.get("/cities", response_model=list[CityConfig])
def list_cities() -> list[CityConfig]:
    return list(load_cities().values())
