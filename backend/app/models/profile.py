from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.route import RoutePreferences


class ModeId(StrEnum):
    """Tryb wybierany na ekranie startowym (docs/plan-frontend-claude.md §4)."""

    WHEELCHAIR = "wheelchair"
    SENIOR = "senior"
    TOURIST = "tourist"
    STROLLER = "stroller"
    GUEST = "guest"


class LayerId(StrEnum):
    """Warstwy mapy (chipy). Kolejność = kolejność chipów."""

    BARRIERS = "barriers"
    HEALTH = "health"  # toalety i zdrowie
    INSTITUTIONS = "institutions"
    PLACES = "places"  # jedzenie i kultura
    REPORTS = "reports"
    REST = "rest"  # ławki, odpoczynek
    PARKING = "parking"  # parking dla OzN
    EVENTS = "events"
    GAPS = "gaps"  # braki danych o dostępności (#31) - dla miasta, domyślnie wyłączone


class ModePreset(BaseModel):
    id: ModeId
    label: str = Field(description="Potrzeba, nie diagnoza, np. 'Poruszam się na wózku'")
    description: str
    icon: str = Field(description="Emoji ikony trybu")
    profile: str = Field(description="Profil routingu, np. 'walk' (klucz w routing/profiles.py)")
    preferences: RoutePreferences = Field(description="Domyślne preferencje trasy dla trybu")
    layers: dict[LayerId, bool] = Field(description="Które warstwy mapy są domyślnie włączone")
