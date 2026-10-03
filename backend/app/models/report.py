import re
from datetime import date, datetime
from enum import StrEnum
from typing import Self

from pydantic import BaseModel, Field, field_validator, model_validator

from app.models.accessibility import AttributeKey
from app.models.geo import LatLon

COMMENT_MAX_LENGTH = 500

_EMAIL = re.compile(r"[\w.+-]+@[\w-]+\.[\w.-]+")
_PHONE = re.compile(r"(?:\+?\d[\s-]?){9,}")


class ReportStatus(StrEnum):
    PENDING = "pending"  # nowe, czeka na weryfikację
    CONFIRMED = "confirmed"  # potwierdzone (moderacja lub kilka zgodnych zgłoszeń)
    REJECTED = "rejected"
    RESOLVED = "resolved"  # problem usunięty (np. naprawiona winda)


class ReportType(StrEnum):
    BARRIER = "barrier"  # ogólna bariera - cechę wybiera zgłaszający
    ELEVATOR_BROKEN = "elevator_broken"
    CONSTRUCTION = "construction"  # remont / zablokowany chodnik
    INACCESSIBLE_ENTRANCE = "inaccessible_entrance"
    BLOCKED_PARKING = "blocked_parking"  # zablokowane miejsce parkingowe dla OzN


# Typ zgłoszenia -> cecha i wartość, gdy zgłaszający ich nie poda
TYPE_DEFAULTS: dict[ReportType, tuple[AttributeKey, bool]] = {
    ReportType.ELEVATOR_BROKEN: (AttributeKey.ELEVATOR, False),
    ReportType.CONSTRUCTION: (AttributeKey.BLOCKED, True),
    ReportType.INACCESSIBLE_ENTRANCE: (AttributeKey.STEP_FREE_ENTRANCE, False),
    ReportType.BLOCKED_PARKING: (AttributeKey.ACCESSIBLE_PARKING, False),
}


class ReportCreate(BaseModel):
    """Zgłoszenie użytkownika. Celowo bez danych osobowych (patrz docs/security-privacy.md)."""

    type: ReportType = ReportType.BARRIER
    location: LatLon
    place_id: str | None = None
    attribute: AttributeKey | None = Field(
        default=None, description="Wymagane dla typu 'barrier'; dla innych typów domyślne"
    )
    value: bool | int | float | str | None = None
    comment: str | None = Field(default=None, max_length=COMMENT_MAX_LENGTH)
    valid_until: date | None = Field(
        default=None, description="Przewidywany koniec utrudnienia (np. remontu), jeśli znany"
    )

    @field_validator("comment")
    @classmethod
    def comment_without_personal_data(cls, value: str | None) -> str | None:
        if value is None:
            return None
        value = value.strip()
        if _EMAIL.search(value) or _PHONE.search(value):
            raise ValueError("Komentarz nie może zawierać adresu e-mail ani numeru telefonu.")
        return value or None

    @model_validator(mode="after")
    def fill_type_defaults(self) -> Self:
        if self.type in TYPE_DEFAULTS:
            attribute, value = TYPE_DEFAULTS[self.type]
            if self.attribute is None:
                self.attribute = attribute
            if self.value is None:
                self.value = value
        if self.attribute is None or self.value is None:
            raise ValueError("Dla ogólnej bariery podaj cechę i jej wartość.")
        return self


class Report(ReportCreate):
    id: str
    city: str
    status: ReportStatus = ReportStatus.PENDING
    created_at: datetime
    updated_at: datetime | None = None


class ReportUpdate(BaseModel):
    """Zmiana statusu przez moderację (na razie bez logowania - patrz #37)."""

    status: ReportStatus
