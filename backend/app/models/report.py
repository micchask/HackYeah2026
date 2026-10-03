from datetime import datetime
from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.accessibility import AttributeKey
from app.models.geo import LatLon


class ReportStatus(StrEnum):
    PENDING = "pending"  # nowe, czeka na weryfikację
    CONFIRMED = "confirmed"  # potwierdzone (moderacja lub kilka zgodnych zgłoszeń)
    REJECTED = "rejected"
    RESOLVED = "resolved"  # problem usunięty (np. naprawiona winda)


class ReportCreate(BaseModel):
    """Zgłoszenie użytkownika. Celowo bez danych osobowych (patrz docs/security-privacy.md)."""

    location: LatLon
    place_id: str | None = None
    attribute: AttributeKey
    value: bool | int | float | str
    comment: str | None = Field(default=None, max_length=500)


class Report(ReportCreate):
    id: str
    city: str
    status: ReportStatus = ReportStatus.PENDING
    created_at: datetime
