from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.api.segments import NO_DATABASE, parse_bbox
from app.cities import CityConfig, get_city
from app.config import get_settings
from app.models import Barrier, BarrierList, BarrierType

router = APIRouter(tags=["barriers"])

DEFAULT_LIMIT = 500
MAX_LIMIT = 2000

TypesFilter = Annotated[
    list[BarrierType] | None,
    Query(description="Tylko te typy, np. ?types=stairs&types=kerb"),
]


def limit_barriers(barriers: list[Barrier], limit: int) -> BarrierList:
    """Limit dotyczy barier z danych (schody, bruk…); zgłoszeń użytkowników nie obcinamy.

    Zgłoszeń jest mało, a są sortowane na końcu - bez tego przy setkach odcinków w widoku
    limit wycinał je wszystkie i nowe zgłoszenie nie pojawiało się na mapie (#62).
    """
    reports = [b for b in barriers if b.type == BarrierType.REPORTED][:limit]
    others = [b for b in barriers if b.type != BarrierType.REPORTED]
    kept = others[: max(0, limit - len(reports))]
    return BarrierList(barriers=kept + reports, truncated=len(kept) < len(others))


def _city(city_id: str) -> CityConfig:
    try:
        return get_city(city_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/barriers", response_model=BarrierList)
def list_barriers(
    bbox: str = Query(description="Obszar 's,w,n,e' (WGS84), obowiązkowy"),
    city: str = "krakow",
    types: TypesFilter = None,
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
) -> BarrierList:
    """Bariery (schody, krawężniki, strome i nierówne odcinki, zgłoszenia) w obszarze."""
    from sqlalchemy.exc import SQLAlchemyError

    from app.barriers import barriers_in_bbox

    config = _city(city)
    try:
        area = parse_bbox(bbox)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Zły bbox: {exc}") from exc
    if not get_settings().db_enabled:
        raise HTTPException(status_code=503, detail=NO_DATABASE)
    try:
        barriers = barriers_in_bbox(config, area, set(types) if types else None)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail=NO_DATABASE) from exc
    return limit_barriers(barriers, limit)
