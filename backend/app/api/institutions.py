from fastapi import APIRouter

from app.institutions import load_institutions
from app.models.institution import Institution

router = APIRouter(tags=["institutions"])


@router.get("/institutions", response_model=list[Institution])
def list_institutions(city: str = "krakow") -> list[Institution]:
    """Instytucje publiczne z deklaracji dostępności (BIP) wraz z lokalizacją."""
    return load_institutions(city)
