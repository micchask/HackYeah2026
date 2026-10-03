from fastapi import APIRouter, HTTPException, Query

from app import search as place_search
from app.cities import get_city
from app.models import LatLon
from app.models.search import SearchResult

router = APIRouter(tags=["search"])


@router.get("/search", response_model=list[SearchResult])
def search(
    q: str = Query(max_length=200, description="Nazwa miejsca, rodzaj (np. 'apteka') albo adres"),
    city: str = "krakow",
    limit: int = Query(default=8, ge=1, le=15),
    lat: float | None = Query(default=None, ge=-90, le=90, description="Np. środek widoku mapy"),
    lon: float | None = Query(default=None, ge=-180, le=180),
) -> list[SearchResult]:
    """Wyszukiwarka miejsc w obszarze demo: instytucje, miejsca z OSM, adresy.

    Z `lat`/`lon` bliższe wyniki są wyżej, a każdy ma `distance_m`.
    """
    try:
        config = get_city(city)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    near = LatLon(lat=lat, lon=lon) if lat is not None and lon is not None else None
    return place_search.search(config, q.strip(), limit, near)
