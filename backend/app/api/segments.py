from fastapi import APIRouter, HTTPException, Query

from app.cities import CityConfig, get_city
from app.config import get_settings
from app.models import (
    AccessibilityAttribute,
    LineStringGeometry,
    Provenance,
    SegmentCollection,
    SegmentFeature,
    SegmentProperties,
)

router = APIRouter(tags=["segments"])

DEFAULT_LIMIT = 2000
MAX_LIMIT = 5000
NO_DATABASE = "Odcinki są w bazie danych - uruchom backend z bazą i wykonaj `make seed`."


def parse_bbox(raw: str) -> tuple[float, float, float, float]:
    """'s,w,n,e' (jak `bbox` w cities/*.yaml) -> krotka; ValueError przy złym formacie."""
    parts = [float(p) for p in raw.split(",")]
    if len(parts) != 4:
        raise ValueError("bbox musi mieć 4 liczby: s,w,n,e")
    s, w, n, e = parts
    if not (-90 <= s < n <= 90 and -180 <= w < e <= 180):
        raise ValueError("bbox: wymagane s < n i w < e (stopnie WGS84)")
    return s, w, n, e


def _city(city_id: str) -> CityConfig:
    try:
        return get_city(city_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


@router.get("/segments", response_model=SegmentCollection)
def list_segments(
    bbox: str = Query(description="Obszar 's,w,n,e' (WGS84), obowiązkowy"),
    city: str = "krakow",
    max_confidence: float | None = Query(
        default=None, ge=0, le=1, description="Tylko odcinki z pewnością danych <= tej wartości"
    ),
    limit: int = Query(default=DEFAULT_LIMIT, ge=1, le=MAX_LIMIT),
) -> SegmentCollection:
    """Odcinki sieci pieszej z atrybutami dostępności jako GeoJSON."""
    config = _city(city)
    try:
        s, w, n, e = parse_bbox(bbox)
    except ValueError as exc:
        raise HTTPException(status_code=422, detail=f"Zły bbox: {exc}") from exc
    if not get_settings().db_enabled:
        raise HTTPException(status_code=503, detail=NO_DATABASE)
    return _query(config.id, (s, w, n, e), max_confidence, limit)


def _query(
    city_id: str,
    bbox: tuple[float, float, float, float],
    max_confidence: float | None,
    limit: int,
) -> SegmentCollection:
    from sqlalchemy.exc import SQLAlchemyError

    from app.db.segments import segments_in_bbox

    try:
        rows = segments_in_bbox(city_id, bbox, max_confidence=max_confidence, limit=limit + 1)
    except SQLAlchemyError as exc:
        raise HTTPException(status_code=503, detail=NO_DATABASE) from exc
    features = [_feature(row, coords) for row, coords in rows[:limit]]
    return SegmentCollection(features=features, truncated=len(rows) > limit)


def _feature(row, coords: list[tuple[float, float]]) -> SegmentFeature:
    return SegmentFeature(
        geometry=LineStringGeometry(coordinates=coords),
        properties=SegmentProperties(
            id=row.id,
            name=row.name,
            highway=row.highway,
            osm_way_id=row.osm_way_id,
            length_m=row.length_m,
            difficulty=row.difficulty,
            confidence=row.confidence,
            attributes=[
                AccessibilityAttribute(
                    key=a.key,
                    value=(a.value or {}).get("v"),
                    provenance=Provenance(
                        source=a.source,
                        source_type=a.source_type,
                        source_ref=a.source_ref,
                        fetched_at=a.fetched_at,
                        last_verified=a.last_verified,
                    ),
                    confidence=a.confidence,
                    status=a.status,
                )
                for a in row.attributes
            ],
        ),
    )
