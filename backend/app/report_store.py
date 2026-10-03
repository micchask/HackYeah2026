"""Przechowywanie zgłoszeń: tabela `reports` w PostGIS albo pamięć procesu, gdy baza jest wyłączona.

Pamięć zostaje dla CI i testów (DB_ENABLED=false) - tam zgłoszenia nie przeżywają restartu.
"""

from collections.abc import Iterator
from contextlib import contextmanager
from datetime import UTC, datetime
from typing import Protocol

from geoalchemy2.functions import ST_X, ST_Y
from sqlalchemy import Select, select
from sqlalchemy.exc import SQLAlchemyError

from app.config import get_settings
from app.db.tables import ReportRow
from app.models import LatLon, Report, ReportStatus


class StorageUnavailable(Exception):
    pass


class ReportStore(Protocol):
    def create(self, report: Report) -> Report: ...

    def list(self, city: str, status: ReportStatus | None = None) -> list[Report]: ...

    def set_status(self, report_id: str, status: ReportStatus) -> Report | None: ...


class MemoryReportStore:
    def __init__(self) -> None:
        self._reports: dict[str, Report] = {}

    def create(self, report: Report) -> Report:
        self._reports[report.id] = report
        return report

    def list(self, city: str, status: ReportStatus | None = None) -> list[Report]:
        reports = [
            r for r in self._reports.values() if r.city == city and status in (None, r.status)
        ]
        return sorted(reports, key=lambda r: r.created_at, reverse=True)

    def set_status(self, report_id: str, status: ReportStatus) -> Report | None:
        report = self._reports.get(report_id)
        if report is None:
            return None
        updated = report.model_copy(update={"status": status, "updated_at": datetime.now(UTC)})
        self._reports[report_id] = updated
        return updated

    def clear(self) -> None:
        self._reports.clear()


class DbReportStore:
    def create(self, report: Report) -> Report:
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
        )
        with _session(write=True) as session:
            session.add(row)
        return report

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
        with _session() as session:
            found = session.execute(_select().where(ReportRow.id == report_id)).first()
        return _to_report(*found) if found else None


def _select() -> Select:
    return select(ReportRow, ST_Y(ReportRow.geom), ST_X(ReportRow.geom))


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


def _to_report(row: ReportRow, lat: float, lon: float) -> Report:
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
    )


_memory_store = MemoryReportStore()


def get_report_store() -> ReportStore:
    return DbReportStore() if get_settings().db_enabled else _memory_store
