"""Rdzeń modelu danych: każda informacja o dostępności ma provenance.

Nigdy nie zapisujemy "gołej" wartości typu `wheelchair=yes`. Zawsze wiemy:
skąd jest informacja, kiedy była zweryfikowana, jak bardzo jej ufamy i jaki
ma status (np. konflikt między źródłami).
"""

from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field


class SourceType(StrEnum):
    OSM = "osm"
    OPEN_DATA = "open_data"
    MSIP = "msip"
    USER_REPORT = "user_report"
    MANUAL = "manual"


class AttributeStatus(StrEnum):
    VERIFIED = "verified"  # potwierdzone (np. kilka źródeł zgodnych, moderacja)
    UNVERIFIED = "unverified"  # jedno źródło, brak potwierdzenia
    CONFLICTING = "conflicting"  # źródła się nie zgadzają
    OUTDATED = "outdated"  # dawno nieweryfikowane


class AttributeKey(StrEnum):
    """Słownik cech dostępności. Dodajemy nowe klucze tutaj, nie ad hoc w kodzie."""

    WHEELCHAIR = "wheelchair"  # yes / limited / no (jak w OSM)
    STEP_FREE_ENTRANCE = "step_free_entrance"  # bool
    STAIRS = "stairs"  # bool
    STEP_COUNT = "step_count"  # int
    RAMP = "ramp"  # bool
    ELEVATOR = "elevator"  # bool
    ACCESSIBLE_TOILET = "accessible_toilet"  # bool
    SURFACE = "surface"  # asphalt / paving_stones / sett / cobblestone / gravel ...
    INCLINE_PERCENT = "incline_percent"  # float
    KERB_HEIGHT_CM = "kerb_height_cm"  # float
    WIDTH_CM = "width_cm"  # float
    TACTILE_PAVING = "tactile_paving"  # bool
    BLOCKED = "blocked"  # bool - przejście zablokowane (remont, rusztowanie)
    ACCESSIBLE_PARKING = "accessible_parking"  # bool - miejsce parkingowe dla OzN dostępne


class Provenance(BaseModel):
    source: str = Field(description="Nazwa providera, np. 'osm', 'msip'")
    source_type: SourceType
    source_ref: str | None = Field(
        default=None, description="ID/URL rekordu w źródle, np. 'node/123456'"
    )
    fetched_at: datetime
    last_verified: datetime | None = Field(
        default=None, description="Kiedy informacja była ostatnio potwierdzona w źródle"
    )


class AccessibilityAttribute(BaseModel):
    key: AttributeKey
    value: bool | int | float | str
    provenance: Provenance
    confidence: float = Field(ge=0.0, le=1.0, description="0 = nie wiemy, 1 = pewne")
    status: AttributeStatus = AttributeStatus.UNVERIFIED
    # Wypełniane przy konflikcie: alternatywne wartości z innych źródeł
    alternatives: list["AccessibilityAttribute"] = Field(default_factory=list)
