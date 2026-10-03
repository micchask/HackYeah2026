import uuid
from datetime import UTC, datetime

from fastapi import APIRouter, status

from app.models import Report, ReportCreate

router = APIRouter(tags=["reports"])

# TODO(api): zapis do tabeli reports (app/db/tables.py) zamiast pamięci procesu
_REPORTS: list[Report] = []


@router.post("/reports", response_model=Report, status_code=status.HTTP_201_CREATED)
def create_report(payload: ReportCreate, city: str = "krakow") -> Report:
    report = Report(
        **payload.model_dump(), id=str(uuid.uuid4()), city=city, created_at=datetime.now(UTC)
    )
    _REPORTS.append(report)
    return report


@router.get("/reports", response_model=list[Report])
def list_reports(city: str = "krakow") -> list[Report]:
    return [r for r in _REPORTS if r.city == city]
