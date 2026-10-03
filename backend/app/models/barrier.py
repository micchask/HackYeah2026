from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.geo import LatLon


class BarrierType(StrEnum):
    # Kolejność = priorytet, gdy odcinek ma kilka barier (pierwsza jest główna)
    STAIRS = "stairs"
    KERB = "kerb"  # krawężnik >= 6 cm
    STEEP = "steep"  # nachylenie > 6%
    ROUGH_SURFACE = "rough_surface"  # bruk, kocie łby, żwir, nawierzchnia nieutwardzona
    REPORTED = "reported"  # potwierdzone zgłoszenie użytkownika


class RouteBarrier(BaseModel):
    """Bariera na odcinku trasy - do podsumowania „na tej trasie: …”."""

    type: BarrierType
    description: str = Field(description="Np. 'Krawężnik ok. 10 cm'")


class Barrier(BaseModel):
    id: str = Field(description="'segment:{id}' albo 'report:{id}'")
    type: BarrierType
    description: str = Field(description="Np. 'Schody, 81 stopni; kostka granitowa (bruk)'")
    street: str | None = None
    location: LatLon = Field(description="Punkt na ikonę (środek odcinka)")
    geometry: list[LatLon] = Field(description="Przebieg odcinka; dla zgłoszenia jeden punkt")
    length_m: float | None = None
    source: str = Field(description="Nazwa źródła, np. 'osm', 'user_reports'")
    source_ref: str | None = None
    confidence: float = Field(ge=0, le=1)
    last_verified: datetime | None = None


class BarrierList(BaseModel):
    barriers: list[Barrier]
    truncated: bool = Field(
        default=False, description="True, gdy w bbox jest więcej barier niż limit"
    )
