from fastapi import APIRouter
from pydantic import BaseModel

from app.config import get_settings

router = APIRouter(tags=["system"])


class HealthResponse(BaseModel):
    status: str
    database: str


@router.get("/health", response_model=HealthResponse)
def health() -> HealthResponse:
    if not get_settings().db_enabled:
        return HealthResponse(status="ok", database="disabled")
    from app.db.session import db_is_alive

    return HealthResponse(status="ok", database="ok" if db_is_alive() else "unavailable")
