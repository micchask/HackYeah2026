"""Uruchamianie providerów miasta z cache i fallbackiem przy awarii źródła."""

import json
import logging
from dataclasses import dataclass, field
from pathlib import Path

from app.cities import CityConfig
from app.config import get_settings
from app.models import Place
from app.providers.base import get_provider_class

logger = logging.getLogger(__name__)


@dataclass
class FetchResult:
    places: list[Place] = field(default_factory=list)
    # provider -> "live" | "cache" | "failed"
    sources: dict[str, str] = field(default_factory=dict)


def cache_path(city_id: str, provider: str, data_dir: Path | None = None) -> Path:
    base = data_dir or get_settings().data_dir
    return base / "cache" / city_id / f"{provider}.json"


def fetch_city_places(city: CityConfig, data_dir: Path | None = None) -> FetchResult:
    result = FetchResult()
    for cfg in city.providers:
        if not cfg.enabled:
            continue
        provider = get_provider_class(cfg.name)(city, cfg.options)
        path = cache_path(city.id, cfg.name, data_dir)
        try:
            places = provider.fetch_places()
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(
                json.dumps([p.model_dump(mode="json") for p in places], ensure_ascii=False),
                encoding="utf-8",
            )
            result.sources[cfg.name] = "live"
        except Exception:
            logger.exception("Provider %s nie odpowiedział, próbuję cache", cfg.name)
            if path.exists():
                raw = json.loads(path.read_text(encoding="utf-8"))
                places = [Place.model_validate(p) for p in raw]
                result.sources[cfg.name] = "cache"
            else:
                places = []
                result.sources[cfg.name] = "failed"
        result.places.extend(places)
    return result
