from typing import Annotated

from fastapi import APIRouter, HTTPException, Query

from app.api.places import parse_bbox
from app.cities import get_city
from app.models import Poi, PoiKind
from app.pois import load_pois

router = APIRouter(tags=["pois"])


@router.get("/pois", response_model=list[Poi])
def list_pois(
    city: str = "krakow",
    kind: Annotated[
        list[PoiKind] | None,
        Query(description="bench (ławki) i/lub changing_table (przewijaki); brak = oba"),
    ] = None,
    bbox: str | None = Query(
        default=None,
        description="Obszar 'south,west,north,east' (WGS84). Domyślnie obszar demo miasta.",
        examples=["50.055,19.930,50.065,19.945"],
    ),
    limit: int = Query(default=500, ge=1, le=2000),
) -> list[Poi]:
    """Ławki i przewijaki z OSM dla warstw mapy (w obszarze demo ok. 1400 ławek)."""
    try:
        config = get_city(city)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc
    s, w, n, e = parse_bbox(bbox) if bbox else config.area_bbox
    kinds = set(kind or PoiKind)
    return [
        p
        for p in load_pois(config)
        if p.kind in kinds and s <= p.location.lat <= n and w <= p.location.lon <= e
    ][:limit]
