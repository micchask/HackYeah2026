from fastapi import APIRouter, HTTPException, Query

from app.api.segments import NO_DATABASE, _city, parse_bbox
from app.config import get_settings
from app.models.data_gaps import DataGapsSummary

router = APIRouter(tags=["segments"])


@router.get("/data-gaps", response_model=DataGapsSummary)
def data_gaps(
    city: str = "krakow",
    bbox: str | None = Query(
        default=None, description="Obszar 's,w,n,e' (WGS84). Domyślnie obszar demo miasta."
    ),
    max_confidence: float = Query(
        default=0.4,
        ge=0,
        le=1,
        description="Odcinek z pewnością <= tej wartości to brak danych (0.4 = brak nawierzchni)",
    ),
    top: int = Query(default=10, ge=1, le=50, description="Ile obszarów z największymi brakami"),
) -> DataGapsSummary:
    """Ile i gdzie brakuje danych o dostępności sieci pieszej - tekst do mapy braków (#31)."""
    config = _city(city)
    try:
        area = parse_bbox(bbox) if bbox else config.area_bbox
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Zły bbox: {exc}") from exc
    if not get_settings().db_enabled:
        raise HTTPException(status_code=503, detail=NO_DATABASE)

    from sqlalchemy.exc import SQLAlchemyError

    from app.db.data_gaps import data_gaps as summarize_gaps

    try:
        return summarize_gaps(config.id, area, max_confidence, top)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail=NO_DATABASE) from exc
