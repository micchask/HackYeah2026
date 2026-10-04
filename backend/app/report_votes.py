"""Potwierdzanie zgłoszeń przez innych użytkowników (#62).

Nowe zgłoszenie jest od razu widoczne dla wszystkich (status `pending`), a inni głosują:
„Potwierdzam” albo „Problemu już nie ma”. Status zmienia przewaga VOTE_MARGIN głosów jednej strony.

Bez kont i danych osobowych: urządzenie przedstawia się losowym identyfikatorem z localStorage,
a w bazie zapisujemy tylko jego skrót. Ochrona przed nadużyciem (opis: docs/security-privacy.md):
jeden głos na zgłoszenie z urządzenia (kolejny zastępuje poprzedni), autor nie głosuje na własne
zgłoszenie, limit głosów na urządzenie na dobę.
"""

import hashlib
from datetime import datetime, timedelta

from app.models import Report, ReportStatus, ReportVote, VoteKind

# Przewaga głosów jednej strony, która zmienia status (np. 3 potwierdzenia vs 1 zaprzeczenie)
VOTE_MARGIN = 2
DAILY_VOTE_LIMIT = 50
# Stała domieszka do skrótu - w bazie nie ma surowego identyfikatora urządzenia
VOTER_SALT = "kbb-report-votes-v1"
# Głosować można tylko na zgłoszenia, które są jeszcze na mapie
OPEN_STATUSES = {ReportStatus.PENDING, ReportStatus.CONFIRMED}


class VoteError(Exception):
    """Głos odrzucony - `status_code` i komunikat trafiają wprost do użytkownika."""

    def __init__(self, status_code: int, message: str) -> None:
        super().__init__(message)
        self.status_code = status_code
        self.message = message


def device_hash(device_id: str) -> str:
    return hashlib.sha256(f"{VOTER_SALT}:{device_id}".encode()).hexdigest()


def status_after_votes(current: ReportStatus, confirmations: int, denials: int) -> ReportStatus:
    """Jedyne miejsce z regułą statusu zgłoszenia po głosach.

    - przewaga potwierdzeń -> potwierdzone,
    - przewaga „problemu już nie ma” -> odrzucone (gdy nigdy nie było potwierdzone)
      albo rozwiązane (gdy było - np. winda została naprawiona),
    - zamknięte zgłoszenia (odrzucone, rozwiązane) już się nie zmieniają.
    """
    if current not in OPEN_STATUSES:
        return current
    if confirmations - denials >= VOTE_MARGIN:
        return ReportStatus.CONFIRMED
    if denials - confirmations >= VOTE_MARGIN:
        return ReportStatus.RESOLVED if current == ReportStatus.CONFIRMED else ReportStatus.REJECTED
    return current


def cast_vote(store, report_id: str, vote: ReportVote, now: datetime) -> Report:
    """Zapisuje głos i aktualizuje status. Rzuca VoteError, gdy głos jest niedozwolony."""
    report = store.get(report_id)
    if report is None:
        raise VoteError(404, "Nie ma takiego zgłoszenia.")
    if report.status not in OPEN_STATUSES:
        raise VoteError(409, "To zgłoszenie jest już zamknięte - głosowanie zakończone.")
    voter = device_hash(vote.voter)
    if store.reporter_of(report_id) == voter:
        raise VoteError(403, "Nie możesz głosować na własne zgłoszenie.")
    if store.votes_since(voter, now - timedelta(days=1)) >= DAILY_VOTE_LIMIT:
        raise VoteError(429, "Osiągnięto dzienny limit głosów z tego urządzenia. Spróbuj jutro.")

    store.put_vote(report_id, voter, vote.vote, now)
    confirmations, denials = store.vote_counts(report_id)
    status = status_after_votes(report.status, confirmations, denials)
    if status != report.status:
        store.set_status(report_id, status)
        # trasy od razu uwzględnią potwierdzenie / zamknięcie zgłoszenia (#63)
        from app.routing.reports import invalidate

        invalidate(report.city)
    updated = store.get(report_id)
    assert updated is not None
    return updated


__all__ = [
    "DAILY_VOTE_LIMIT",
    "VOTE_MARGIN",
    "VoteError",
    "VoteKind",
    "cast_vote",
    "device_hash",
    "status_after_votes",
]
