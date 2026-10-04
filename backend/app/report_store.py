"""Przechowywanie zgłoszeń: tabela `reports` w PostGIS albo pamięć procesu, gdy baza jest wyłączona.

Pamięć zostaje dla CI i testów (DB_ENABLED=false) - tam zgłoszenia nie przeżywają restartu.
Głosy innych użytkowników (#62): tabela `report_votes`, jeden głos na (zgłoszenie, urządzenie).
"""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Protocol

from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import Select, case, func, select
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db.tables import ReportRow, ReportVoteRow
from app.models import LatLon, Report, ReportStatus, VoteKind


class StorageUnavailable(Exception):
    pass


class ReportStore(Protocol):
    def create(self, report: Report, reporter: str | None = None) -> Report: ...

    def get(self, report_id: str) -> Report | None: ...

    def list(self, city: str, status: ReportStatus | None = None) -> list[Report]: ...

    def set_status(self, report_id: str, status: ReportStatus) -> Report | None: ...

    def reporter_of(self, report_id: str) -> str | None: ...

    def put_vote(self, report_id: str, voter: str, vote: VoteKind, at: datetime) -> None: ...

    def vote_counts(self, report_id: str) -> tuple[int, int]: ...

    def votes_since(self, voter: str, since: datetime) -> int: ...


class MemoryReportStore:
    def __init__(self) -> None:
        self._reports: dict[str, Report] = {}
        self._reporters: dict[str, str] = {}
        # (zgłoszenie, urządzenie) -> (głos, kiedy); kolejny głos tego samego urządzenia zastępuje
        self._votes: dict[tuple[str, str], tuple[VoteKind, datetime]] = {}

    def _with_counts(self, report: Report) -> Report:
        confirmations, denials = self.vote_counts(report.id)
        return report.model_copy(update={"confirmations": confirmations, "denials": denials})

    def create(self, report: Report, reporter: str | None = None) -> Report:
        self._reports[report.id] = report
        if reporter:
            self._reporters[report.id] = reporter
        return report

    def get(self, report_id: str) -> Report | None:
        report = self._reports.get(report_id)
        return self._with_counts(report) if report else None

    def list(self, city: str, status: ReportStatus | None = None) -> list[Report]:
        reports = [
            self._with_counts(r)
            for r in self._reports.values()
            if r.city == city and status in (None, r.status)
        ]
        return sorted(reports, key=lambda r: r.created_at, reverse=True)

    def set_status(self, report_id: str, status: ReportStatus) -> Report | None:
        report = self._reports.get(report_id)
        if report is None:
            return None
        updated = report.model_copy(update={"status": status, "updated_at": datetime.now(UTC)})
        self._reports[report_id] = updated
        return self._with_counts(updated)

    def reporter_of(self, report_id: str) -> str | None:
        return self._reporters.get(report_id)

    def put_vote(self, report_id: str, voter: str, vote: VoteKind, at: datetime) -> None:
        self._votes[(report_id, voter)] = (vote, at)

    def vote_counts(self, report_id: str) -> tuple[int, int]:
        votes = [v for (rid, _), (v, _) in self._votes.items() if rid == report_id]
        return votes.count(VoteKind.CONFIRM), votes.count(VoteKind.DENY)

    def votes_since(self, voter: str, since: datetime) -> int:
        return sum(1 for (_, who), (_, at) in self._votes.items() if who == voter and at >= since)

    def clear(self) -> None:
        self._reports.clear()
        self._reporters.clear()
        self._votes.clear()


class DbReportStore:
    def create(self, report: Report, reporter: str | None = None) -> Report:
        row = ReportRow(
            id=report.id,
            city=report.city,
            type=report.type,
            place_id=report.place_id,
            geom=f"SRID=4326;POINT({report.location.lon} {report.location.lat})",
            attribute=report.attribute,
            value={"v": report.value},
            comment=report.comment,
            valid_until=report.valid_until,
            status=report.status,
            created_at=report.created_at,
            reporter=reporter,
        )
        with _session(write=True) as session:
            session.add(row)
        return report

    def get(self, report_id: str) -> Report | None:
        with _session() as session:
            found = session.execute(_select().where(ReportRow.id == report_id)).first()
        return _to_report(*found) if found else None

    def list(self, city: str, status: ReportStatus | None = None) -> list[Report]:
        query = _select().where(ReportRow.city == city).order_by(ReportRow.created_at.desc())
        if status is not None:
            query = query.where(ReportRow.status == status)
        with _session() as session:
            return [_to_report(*row) for row in session.execute(query)]

    def set_status(self, report_id: str, status: ReportStatus) -> Report | None:
        with _session(write=True) as session:
            row = session.get(ReportRow, report_id)
            if row is None:
                return None
            row.status = status
            row.updated_at = datetime.now(UTC)
        return self.get(report_id)

    def reporter_of(self, report_id: str) -> str | None:
        with _session() as session:
            return session.scalar(select(ReportRow.reporter).where(ReportRow.id == report_id))

    def put_vote(self, report_id: str, voter: str, vote: VoteKind, at: datetime) -> None:
        with _session(write=True) as session:
            existing = session.scalar(
                select(ReportVoteRow).where(
                    ReportVoteRow.report_id == report_id, ReportVoteRow.voter == voter
                )
            )
            if existing:
                existing.vote = vote
                existing.created_at = at
            else:
                session.add(
                    ReportVoteRow(report_id=report_id, voter=voter, vote=vote, created_at=at)
                )

    def vote_counts(self, report_id: str) -> tuple[int, int]:
        with _session() as session:
            row = session.execute(
                _counts_query().where(ReportVoteRow.report_id == report_id)
            ).first()
        return (int(row[1] or 0), int(row[2] or 0)) if row else (0, 0)

    def votes_since(self, voter: str, since: datetime) -> int:
        with _session() as session:
            return session.scalar(
                select(func.count())
                .select_from(ReportVoteRow)
                .where(ReportVoteRow.voter == voter, ReportVoteRow.created_at >= since)
            )


def _counts_query() -> Select:
    """report_id, liczba potwierdzeń, liczba „problemu już nie ma”."""
    return select(
        ReportVoteRow.report_id,
        func.sum(case((ReportVoteRow.vote == VoteKind.CONFIRM, 1), else_=0)),
        func.sum(case((ReportVoteRow.vote == VoteKind.DENY, 1), else_=0)),
    ).group_by(ReportVoteRow.report_id)


def _select() -> Select:
    counts = _counts_query().subquery()
    return select(
        ReportRow,
        ST_Y(ReportRow.geom),
        ST_X(ReportRow.geom),
        func.coalesce(counts.c[1], 0),
        func.coalesce(counts.c[2], 0),
    ).outerjoin(counts, counts.c.report_id == ReportRow.id)


@contextmanager
def _session(write: bool = False) -> Iterator:
    from app.db.session import SessionLocal

    try:
        if write:
            with SessionLocal.begin() as session:
                yield session
        else:
            with SessionLocal() as session:
                yield session
    except SQLAlchemyError as exc:
        raise StorageUnavailable(str(exc)) from exc


def _to_report(
    row: ReportRow, lat: float, lon: float, confirmations: int = 0, denials: int = 0
) -> Report:
    return Report(
        id=row.id,
        city=row.city,
        type=row.type,
        location=LatLon(lat=lat, lon=lon),
        place_id=row.place_id,
        attribute=row.attribute,
        value=(row.value or {}).get("v"),
        comment=row.comment,
        valid_until=row.valid_until,
        status=row.status,
        created_at=row.created_at,
        updated_at=row.updated_at,
        confirmations=int(confirmations),
        denials=int(denials),
    )


_memory_store = MemoryReportStore()


def get_report_store() -> ReportStore:
    return DbReportStore() if get_settings().db_enabled else _memory_store
