from datetime import datetime

from pydantic import BaseModel, Field

from app.models.barrier import BarrierType
from app.models.report import ReportStatus, ReportType


class Coverage(BaseModel):
    key: str = Field(description="Cecha odcinka, np. 'surface', 'incline_percent'")
    sources: list[str] = Field(description="Skąd pochodzi, np. ['osm'] albo ['nmt_gugik']")
    length_m: float = Field(description="Długość odcinków, które mają tę cechę")
    share: float = Field(ge=0, le=1, description="Udział w długości całej sieci pieszej")


class BarrierCount(BaseModel):
    type: BarrierType
    count: int
    length_m: float


class PriorityStreet(BaseModel):
    """Ulica do naprawy w pierwszej kolejności - argument dla miasta (B2G)."""

    street: str
    score: int = Field(description="Suma wag barier (patrz `priority_weights`)")
    barriers: int
    by_type: dict[BarrierType, int]


class ReportStatusCount(BaseModel):
    status: ReportStatus
    count: int


class ReportTypeCount(BaseModel):
    type: ReportType
    count: int


class CityStats(BaseModel):
    city: str
    generated_at: datetime
    network_length_m: float = Field(description="Długość sieci pieszej w obszarze demo")
    network_segments: int
    coverage: list[Coverage]
    gap_length_m: float = Field(description="Odcinki bez danych o nawierzchni (jak /api/data-gaps)")
    gap_share: float = Field(ge=0, le=1)
    barriers_total: int
    barriers_by_type: list[BarrierCount]
    priority_weights: dict[BarrierType, int]
    priority_streets: list[PriorityStreet]
    reports_total: int | None = Field(description="None = magazyn zgłoszeń niedostępny")
    reports_by_status: list[ReportStatusCount]
    reports_by_type: list[ReportTypeCount]
