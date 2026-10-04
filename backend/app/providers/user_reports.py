"""Zgłoszenia użytkowników jako źródło danych.

Do danych miejsc (i docelowo tras) trafiają tylko potwierdzone - przez innych użytkowników (#62)
albo moderację. Na mapie widać też niepotwierdzone (`visible_reports`), z przyciskami głosowania.
"""

from datetime import UTC, date, datetime

from app.models import (
    AccessibilityAttribute,
    Place,
    Provenance,
    Report,
    ReportStatus,
    SourceType,
)
from app.normalization.merge import AGREEMENT_BONUS
from app.providers.base import Provider, register_provider
from app.report_store import get_report_store

REPORT_NAMES = {
    "barrier": "Zgłoszona bariera",
    "elevator_broken": "Niedziałająca winda",
    "construction": "Remont / zablokowane przejście",
    "inaccessible_entrance": "Niedostępne wejście",
    "blocked_parking": "Zablokowane miejsce parkingowe dla OzN",
}


@register_provider("user_reports")
class UserReportsProvider(Provider):
    source_type = SourceType.USER_REPORT
    base_confidence = 0.4

    def fetch_places(self) -> list[Place]:
        today = datetime.now(UTC).date()
        confirmed = get_report_store().list(self.city.id, ReportStatus.CONFIRMED)
        return [self.to_place(r) for r in confirmed if not _expired(r, today)]

    def to_place(self, report: Report) -> Place:
        return Place(
            id=f"report:{report.id}",
            city=report.city,
            name=REPORT_NAMES.get(report.type, "Zgłoszenie"),
            category="user_report",
            location=report.location,
            attributes=[
                AccessibilityAttribute(
                    key=report.attribute,
                    value=report.value,
                    provenance=Provenance(
                        source=self.name,
                        source_type=self.source_type,
                        source_ref=report.id,
                        fetched_at=datetime.now(UTC),
                        last_verified=report.updated_at or report.created_at,
                    ),
                    # każde potwierdzenie innej osoby podnosi wiarygodność (#62)
                    confidence=round(
                        min(1.0, self.base_confidence + AGREEMENT_BONUS * report.confirmations), 2
                    ),
                )
            ],
        )


def visible_reports(city_id: str) -> list[Report]:
    """Zgłoszenia pokazywane na mapie: niepotwierdzone i potwierdzone, bez wygasłych."""
    today = datetime.now(UTC).date()
    open_statuses = {ReportStatus.PENDING, ReportStatus.CONFIRMED}
    return [
        r
        for r in get_report_store().list(city_id)
        if r.status in open_statuses and not _expired(r, today)
    ]


def _expired(report: Report, today: date) -> bool:
    return report.valid_until is not None and report.valid_until < today
