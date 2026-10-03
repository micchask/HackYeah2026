from datetime import date
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.geo import LatLon


class InstitutionDataStatus(StrEnum):
    CONFIRMED = "confirmed"  # deklaracja z datą weryfikacji
    CONFIRMED_NO_DATE = "confirmed_no_date"  # deklaracja bez daty – mogła się zdezaktualizować
    UNKNOWN = "unknown"  # brak informacji – NIE oznacza "dostępne"


class InstitutionAttribute(BaseModel):
    category: str = Field(description="Klucz z danych źródłowych, np. 'winda', 'toaleta'")
    label: str = Field(description="Nazwa po polsku do wyświetlenia, np. 'Winda'")
    value: str | None = Field(description="Opis z deklaracji; null = brak informacji")
    source: str
    last_verified: date | None = None
    confidence: float = Field(ge=0, le=1)
    status: InstitutionDataStatus
    note: str | None = None


class InstitutionLocation(BaseModel):
    point: LatLon
    source: str = Field(description="Skąd współrzędne, np. geokoder Photon (OSM)")
    exact: bool = Field(description="False = punkt tylko na ulicy, bez numeru domu")


class Institution(BaseModel):
    """Instytucja publiczna z deklaracji dostępności (BIP)."""

    id: str
    name: str
    address: str
    kind: str = Field(description="Rodzaj po polsku, np. 'urząd', 'muzeum', 'teatr'")
    location: InstitutionLocation | None = None
    attributes: list[InstitutionAttribute] = Field(default_factory=list)
