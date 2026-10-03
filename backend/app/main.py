import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import app.providers  # noqa: F401  rejestruje providery
from app.api import api_router
from app.config import get_settings

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(_app: FastAPI):
    if get_settings().db_enabled:
        from app.db.session import init_db

        try:
            init_db()
        except Exception:
            logger.exception("Nie udało się zainicjalizować bazy - API działa dalej na mockach")
    if get_settings().routing_warmup:
        from app.cities import get_city
        from app.routing.graph import warm_up

        warm_up(get_city(get_settings().default_city))
    yield


settings = get_settings()
app = FastAPI(title=settings.app_name, version="0.1.0", lifespan=lifespan)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)
app.include_router(api_router)
