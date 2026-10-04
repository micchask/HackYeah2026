from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.accessibility import AttributeStatus
from app.models.barrier import BarrierType, RouteBarrier
from app.models.geo import LatLon


class RoutePreferences(BaseModel):
    """Preferencje trasy. Pytamy o potrzeby, NIE o niepełnosprawność."""

    avoid_stairs: bool = True
    max_incline_percent: float = Field(default=6.0, ge=0, le=30)
    max_kerb_height_cm: float = Field(default=3.0, ge=0, le=30)
    avoid_rough_surface: bool = True  # kocie łby, żwir, bruk
    prefer_lit_paths: bool = False
    profile: str | None = Field(
        default=None,
        description="Profil routingu: 'wheelchair', 'stroller', 'senior' albo 'walk'; "
        "brak lub nieznany = 'walk'. Presety trybów: GET /api/profiles",
    )
    marked_barriers: list[BarrierType] | None = Field(
        default=None,
        description="Które bariery oznaczać na trasie (trudność odcinka, bariery, ostrzeżenia, "
        "podsumowanie); null = wszystkie. Np. turysta: tylko 'stairs'. Nie zmienia wyboru trasy.",
    )


MAX_WAYPOINTS = 5


class RouteRequest(BaseModel):
    city: str = "krakow"
    origin: LatLon
    destination: LatLon
    waypoints: list[LatLon] = Field(
        default_factory=list,
        max_length=MAX_WAYPOINTS,
        description="Przystanki po drodze, w kolejności odwiedzania (np. sklep między A i B)",
    )
    preferences: RoutePreferences = Field(default_factory=RoutePreferences)


class Difficulty(StrEnum):
    EASY = "easy"  # gładko, płasko
    MODERATE = "moderate"  # np. płyty, brak danych
    HARD = "hard"  # bruk, pochyłość, schody z rampą


class RouteSegment(BaseModel):
    """Odcinek trasy z opisem tekstowym - to jest tekstowa alternatywa mapy (WCAG)."""

    instruction: str = Field(description="Np. 'Skręć w prawo w ul. Floriańską'")
    distance_m: float
    geometry: list[LatLon]
    street: str | None = Field(default=None, description="Nazwa ulicy lub rodzaj drogi")
    surface: str | None = None
    incline_percent: float | None = None
    warnings: list[str] = Field(default_factory=list)
    difficulty: Difficulty = Difficulty.EASY
    accessibility_score: int = Field(
        ge=0,
        le=100,
        description=(
            "Dostępność odcinka dla wybranego profilu: 0 = niedostępny, "
            "100 = bez barier i kar routingu"
        ),
    )
    data_status: AttributeStatus = AttributeStatus.UNVERIFIED
    confidence: float = Field(
        ge=0,
        le=1,
        description="Pewność danych odcinka: 0 = brak wiarygodnych danych, 1 = pełna pewność",
    )
    sources: list[str] = Field(default_factory=list, description="Źródła danych odcinka")
    fetched_at: datetime | None = Field(
        default=None, description="Kiedy dane odcinka pobrano ze źródła (np. z OSM)"
    )
    last_verified: datetime | None = Field(
        default=None,
        description="Najstarsza data weryfikacji w terenie (OSM check_date); brak = brak",
    )
    barriers: list[RouteBarrier] = Field(
        default_factory=list, description="Bariery na odcinku (schody, krawężnik, bruk…)"
    )


class RouteBaseline(BaseModel):
    """Najkrótsza zwykła trasa piesza - do porównania, czego unikamy."""

    distance_m: float
    stairs_count: int
    rough_surface_m: float
    geometry: list[LatLon]


class RouteAlternative(BaseModel):
    """Pełna alternatywa trasy, gotowa do pokazania obok trasy głównej."""

    label: str
    distance_m: float
    duration_s: float
    stairs_count: int
    rough_surface_m: float
    geometry: list[LatLon]
    segments: list[RouteSegment]
    explanation: str


class RouteResponse(BaseModel):
    distance_m: float
    duration_s: float
    segments: list[RouteSegment]
    accessibility_score: int = Field(
        ge=0,
        le=100,
        description="Wynik dostępności całej trasy, ważony długością jej odcinków",
    )
    confidence: float = Field(
        ge=0,
        le=1,
        description="Pewność danych całej trasy, ważona długością jej odcinków",
    )
    warnings: list[str] = Field(default_factory=list)
    is_mock: bool = False
    profile: str | None = None
    rough_surface_m: float | None = None
    stairs_count: int | None = None
    baseline: RouteBaseline | None = None
    explanation: str
    alternatives: list[RouteAlternative] = Field(default_factory=list)
    reports_considered: list[str] = Field(
        default_factory=list,
        description="Aktywne zgłoszenia uwzględnione przy liczeniu - nowe poza tą listą "
        "oznaczają, że trasę warto przeliczyć (#63)",
    )
