from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.api.segments import NO_DATABASE, _city
from app.config import get_settings
from app.models.stats import CityStats
from app.report_store import ReportStore, StorageUnavailable, get_report_store

router = APIRouter(tags=["stats"])

Store = Annotated[ReportStore, Depends(get_report_store)]


@router.get("/stats", response_model=CityStats)
def city_stats(store: Store, city: str = "krakow") -> CityStats:
    """Dashboard miasta: pokrycie danymi, bariery, ranking ulic, zgłoszenia (obszar demo)."""
    config = _city(city)
    if not get_settings().db_enabled:
        raise HTTPException(status_code=503, detail=NO_DATABASE)

    from sqlalchemy.exc import SQLAlchemyError

    from app.barriers import barriers_in_bbox
    from app.db.data_gaps import data_gaps
    from app.stats import build_stats, network_coverage

    area = config.area_bbox
    try:
        total, count, coverage = network_coverage(config.id, area)
        gaps = data_gaps(config.id, area, max_confidence=0.4, top=1)
        barriers = barriers_in_bbox(config, area)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail=NO_DATABASE) from exc
    try:
        reports = store.list(config.id)
    except StorageUnavailable:
        reports = None  # dashboard pokaże resztę, a przy zgłoszeniach "brak danych"
    return build_stats(config.id, total, count, coverage, gaps.gap_length_m, barriers, reports)
