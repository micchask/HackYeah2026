from fastapi import APIRouter, HTTPException, Query

from app import geocoding
from app.cities import CityConfig, get_city
from app.models import GeocodeResult

router = APIRouter(tags=["geocode"])

UNAVAILABLE = (
    "Wyszukiwarka adresów jest chwilowo niedostępna. Wybierz trasę demo albo wskaż punkt na mapie."
)
MIN_QUERY_LENGTH = 2


def _city(city_id: str) -> CityConfig:
    try:
        return get_city(city_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/geocode", response_model=list[GeocodeResult])
def geocode(
    q: str = Query(max_length=200, description="Adres, ulica albo nazwa miejsca"),
    city: str = "krakow",
    limit: int = Query(default=5, ge=1, le=10),
) -> list[GeocodeResult]:
    """Podpowiedzi adresów, tylko z obszaru miasta (demo_bbox)."""
    config = _city(city)
    if len(q.strip()) < MIN_QUERY_LENGTH:
        return []
    try:
        return geocoding.search(config, q.strip(), limit)
    except geocoding.GeocoderUnavailable as exc:
        raise HTTPException(status_code=503, detail=UNAVAILABLE) from exc


@router.get("/geocode/reverse", response_model=GeocodeResult | None)
def reverse_geocode(lat: float, lon: float, city: str = "krakow") -> GeocodeResult | None:
    """Adres najbliższy punktowi (np. kliknięciu na mapie); null poza obszarem miasta."""
    config = _city(city)
    if not config.contains(lat, lon):
        return None
    try:
        return geocoding.reverse(config, lat, lon)
    except geocoding.GeocoderUnavailable as exc:
        raise HTTPException(status_code=503, detail=UNAVAILABLE) from exc
