from pydantic import BaseModel, Field

from app.models.accessibility import AttributeStatus
from app.models.geo import LatLon


class RoutePreferences(BaseModel):
    """Preferencje trasy. Pytamy o potrzeby, NIE o niepełnosprawność."""

    avoid_stairs: bool = True
    max_incline_percent: float = Field(default=6.0, ge=0, le=30)
    max_kerb_height_cm: float = Field(default=3.0, ge=0, le=30)
    avoid_rough_surface: bool = True  # kocie łby, żwir, bruk
    prefer_lit_paths: bool = False
    profile: str | None = Field(
        default=None, description="Gotowy preset: 'wheelchair' lub 'stroller' (opcjonalnie)"
    )


class RouteRequest(BaseModel):
    city: str = "krakow"
    origin: LatLon
    destination: LatLon
    preferences: RoutePreferences = Field(default_factory=RoutePreferences)


class RouteSegment(BaseModel):
    """Odcinek trasy z opisem tekstowym - to jest tekstowa alternatywa mapy (WCAG)."""

    instruction: str = Field(description="Np. 'Skręć w prawo w ul. Floriańską'")
    distance_m: float
    geometry: list[LatLon]
    surface: str | None = None
    incline_percent: float | None = None
    warnings: list[str] = Field(default_factory=list)
    data_status: AttributeStatus = AttributeStatus.UNVERIFIED
    confidence: float = Field(ge=0, le=1)


class RouteResponse(BaseModel):
    distance_m: float
    duration_s: float
    segments: list[RouteSegment]
    warnings: list[str] = Field(default_factory=list)
    is_mock: bool = False
