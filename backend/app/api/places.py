from fastapi import APIRouter, Query

from app.mocks.data import MOCK_PLACES
from app.models import Place

router = APIRouter(tags=["places"])


@router.get("/places", response_model=list[Place])
def list_places(
    city: str = "krakow",
    q: str | None = Query(default=None, description="Szukaj po nazwie"),
) -> list[Place]:
    # TODO(api): czytać z bazy (tabela places) zamiast mocków, filtrować po bbox
    places = [p for p in MOCK_PLACES if p.city == city]
    if q:
        places = [p for p in places if p.name and q.lower() in p.name.lower()]
    return places
