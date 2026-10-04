import logging

from sqlalchemy import create_engine, text
from sqlalchemy.orm import Session, sessionmaker

from app.config import get_settings

logger = logging.getLogger(__name__)

engine = create_engine(get_settings().database_url, pool_pre_ping=True)
SessionLocal = sessionmaker(bind=engine, autoflush=False)


def get_session():
    with SessionLocal() as session:
        yield session


def init_db() -> None:
    """Tworzy rozszerzenie PostGIS i tabele. Na hackathon zamiast migracji (Alembic - później)."""
    from app.db import tables  # noqa: F401  rejestruje tabele w metadata
    from app.db.base import Base

    with engine.begin() as conn:
        conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis"))
    Base.metadata.create_all(engine)
    with engine.begin() as conn:
        for statement in COLUMN_MIGRATIONS:
            conn.execute(text(statement))


# create_all nie zmienia istniejących tabel - nowe kolumny dla baz założonych wcześniej
COLUMN_MIGRATIONS = [
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS type VARCHAR NOT NULL DEFAULT 'barrier'",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS valid_until DATE",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS updated_at TIMESTAMP WITH TIME ZONE",
    "CREATE INDEX IF NOT EXISTS ix_reports_status ON reports (status)",
    "ALTER TABLE reports ADD COLUMN IF NOT EXISTS reporter VARCHAR",
]


def db_is_alive() -> bool:
    try:
        with Session(engine) as session:
            session.execute(text("SELECT 1"))
        return True
    except Exception:
        return False
