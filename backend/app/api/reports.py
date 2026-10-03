import uuid
from datetime import UTC, datetime
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException

from app.cities import CityConfig, get_city
from app.models import Report, ReportCreate, ReportStatus, ReportUpdate
from app.report_store import ReportStore, StorageUnavailable, get_report_store

router = APIRouter(tags=["reports"])

Store = Annotated[ReportStore, Depends(get_report_store)]

STORAGE_ERROR = "Baza danych jest niedostępna - zgłoszenie nie zostało zapisane. Spróbuj za chwilę."


def _city(city_id: str) -> CityConfig:
    try:
        return get_city(city_id)
    except KeyError as exc:
        raise HTTPException(status_code=404, detail=str(exc)) from exc


def _in_city(city: CityConfig, report: ReportCreate) -> bool:
    s, w, n, e = city.bbox
    return s <= report.location.lat <= n and w <= report.location.lon <= e


@router.post("/reports", response_model=Report, status_code=201)
def create_report(
    payload: ReportCreate,
    store: Store,
    city: str = "krakow",
) -> Report:
    """Nowe zgłoszenie bariery. Zapisujemy tylko to, co w formularzu - bez IP i danych osobowych."""
    config = _city(city)
    if not _in_city(config, payload):
        raise HTTPException(
            status_code=422, detail=f"Zgłoszenie leży poza obszarem miasta {config.name}."
        )
    report = Report(
        **payload.model_dump(), id=str(uuid.uuid4()), city=config.id, created_at=datetime.now(UTC)
    )
    try:
        return store.create(report)
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail=STORAGE_ERROR) from exc


@router.get("/reports", response_model=list[Report])
def list_reports(
    store: Store,
    city: str = "krakow",
    status: ReportStatus | None = None,
) -> list[Report]:
    """Zgłoszenia miasta, najnowsze pierwsze; opcjonalnie tylko o danym statusie."""
    try:
        return store.list(_city(city).id, status)
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail=STORAGE_ERROR) from exc


@router.patch("/reports/{report_id}", response_model=Report)
def update_report(
    report_id: str,
    payload: ReportUpdate,
    store: Store,
) -> Report:
    """Zmiana statusu zgłoszenia (moderacja). TODO(api): uprawnienia moderatora - #37."""
    try:
        report = store.set_status(report_id, payload.status)
    except StorageUnavailable as exc:
        raise HTTPException(status_code=503, detail=STORAGE_ERROR) from exc
    if report is None:
        raise HTTPException(status_code=404, detail="Nie ma takiego zgłoszenia.")
    return report
