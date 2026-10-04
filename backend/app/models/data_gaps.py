from pydantic import BaseModel, Field

from app.models.geo import LatLon


class GapArea(BaseModel):
    """Kwadrat ok. 200 x 200 m z odcinkami bez wiarygodnych danych."""

    label: str = Field(
        description="Np. 'okolice: Karmelicka' - najdłuższa nazwana ulica w kwadracie"
    )
    center: LatLon
    gap_length_m: float
    segments: int


class GapKind(BaseModel):
    highway: str | None = Field(description="Rodzaj drogi z OSM, np. 'footway'")
    label: str = Field(description="Po polsku, np. 'chodnik'")
    gap_length_m: float


class DataGapsSummary(BaseModel):
    """Gdzie brakuje danych o dostępności - argument dla miasta (np. do inwentaryzacji)."""

    max_confidence: float = Field(
        description="Odcinek z pewnością <= tej wartości to 'brak danych'"
    )
    total_length_m: float = Field(description="Długość całej sieci pieszej w obszarze")
    gap_length_m: float
    gap_share: float = Field(ge=0, le=1)
    gap_segments: int
    no_surface_m: float = Field(description="W tym bez danych o nawierzchni")
    imprecise_incline_m: float = Field(
        description="W tym z nachyleniem oznaczonym w OSM bez wartości"
    )
    by_kind: list[GapKind]
    areas: list[GapArea] = Field(description="Obszary z największą długością braków")
