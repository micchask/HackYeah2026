import logging

from fastapi import APIRouter, HTTPException, Query

from app.cities import get_city
from app.config import get_settings
from app.db.places import BBox
from app.mocks.data import MOCK_PLACES
from app.models import Place

logger = logging.getLogger(__name__)
router = APIRouter(tags=["places"])


def _parse_bbox(value: str) -> BBox:
    try:
        s, w, n, e = (float(v) for v in value.split(","))
    except ValueError as exc:
        raise HTTPException(
            status_code=422, detail="bbox: oczekiwano 'south,west,north,east'"
        ) from exc
    if not (s < n and w < e):
        raise HTTPException(status_code=422, detail="bbox: south < north i west < east")
    return s, w, n, e


def _from_mocks(city: str, bbox: BBox, q: str | None, limit: int) -> list[Place]:
    s, w, n, e = bbox
    places = [
        p
        for p in MOCK_PLACES
        if p.city == city and s <= p.location.lat <= n and w <= p.location.lon <= e
    ]
    if q:
        places = [p for p in places if p.name and q.lower() in p.name.lower()]
    return places[:limit]


def _from_db(city: str, bbox: BBox, q: str | None, limit: int) -> list[Place] | None:
    """Miejsca z bazy; None, gdy baza jest pusta dla miasta albo nie odpowiada."""
    from app.db.places import has_places, query_places
    from app.db.session import SessionLocal

    try:
        with SessionLocal() as session:
            if not has_places(session, city):
                return None
            return query_places(session, city, bbox, q, limit)
    except Exception:
        logger.exception("Baza niedostępna - zwracam miejsca przykładowe")
        return None


@router.get("/places", response_model=list[Place])
def list_places(
    city: str = "krakow",
    q: str | None = Query(default=None, description="Szukaj po nazwie"),
    bbox: str | None = Query(
        default=None,
        description="Obszar 'south,west,north,east' (WGS84). Domyślnie obszar demo miasta.",
        examples=["50.045,19.928,50.066,19.950"],
    ),
    limit: int = Query(default=200, ge=1, le=1000),
) -> list[Place]:
    try:
        area = _parse_bbox(bbox) if bbox else get_city(city).area_bbox
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc

    # Bez bazy (testy, CI) albo przed `make seed` - dane przykładowe jak dotąd
    if get_settings().db_enabled:
        places = _from_db(city, area, q, limit)
        if places is not None:
            return places
    return _from_mocks(city, area, q, limit)
