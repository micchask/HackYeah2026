from functools import lru_cache
from pathlib import Path

from pydantic import field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

BACKEND_DIR = Path(__file__).resolve().parent.parent


class Settings(BaseSettings):
    """Konfiguracja z env / .env. Wszystkie zmienne opisane w .env.example."""

    model_config = SettingsConfigDict(env_file=".env", extra="ignore")

    app_name: str = "HackYeah2026 API"
    database_url: str = "postgresql+psycopg://app:app@localhost:5432/app"
    cors_origins: list[str] = ["http://localhost:5173"]
    default_city: str = "krakow"
    cities_dir: Path = BACKEND_DIR / "cities"
    data_dir: Path = BACKEND_DIR.parent / "data"
    # Gdy false, aplikacja startuje bez bazy (np. testy, praca tylko na mockach)
    db_enabled: bool = True
    # Ładowanie grafu routingu w tle przy starcie (wyłączone w testach)
    routing_warmup: bool = True
    # Geokoder Photon (komoot) - bez klucza, ale wymaga własnego User-Agent
    geocoder_url: str = "https://photon.komoot.io"

    @field_validator("database_url")
    @classmethod
    def _psycopg_driver(cls, url: str) -> str:
        """Hosting (np. Render) podaje `postgres://` albo `postgresql://` - wymuszamy psycopg 3."""
        for prefix in ("postgres://", "postgresql://"):
            if url.startswith(prefix):
                return "postgresql+psycopg://" + url.removeprefix(prefix)
        return url


@lru_cache
def get_settings() -> Settings:
    return Settings()
