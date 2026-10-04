"""Ładowanie konfiguracji miast z backend/cities/*.yaml."""

from functools import lru_cache
from typing import Any

import yaml
from pydantic import BaseModel, Field

from app.config import get_settings


class ProviderConfig(BaseModel):
    name: str
    enabled: bool = True
    options: dict[str, Any] = Field(default_factory=dict)


class RoutingConfig(BaseModel):
    network_type: str = "walk"
    overpass_url: str | None = None


class CityConfig(BaseModel):
    id: str
    name: str
    country: str
    timezone: str
    bbox: tuple[float, float, float, float]  # south, west, north, east
    # Mniejszy obszar dla grafu i danych demo; gdy brak - cały bbox miasta
    demo_bbox: tuple[float, float, float, float] | None = None
    center: tuple[float, float]  # lat, lon
    default_zoom: int = 13
    providers: list[ProviderConfig] = Field(default_factory=list)
    routing: RoutingConfig = Field(default_factory=RoutingConfig)
    # Ławki i przewijaki dla warstw mapy (app/providers/osm_pois.py): overpass_urls, timeout_s
    pois: dict[str, Any] = Field(default_factory=dict)

    @property
    def area_bbox(self) -> tuple[float, float, float, float]:
        return self.demo_bbox or self.bbox

    def contains(self, lat: float, lon: float) -> bool:
        s, w, n, e = self.area_bbox
        return s <= lat <= n and w <= lon <= e


@lru_cache
def load_cities() -> dict[str, CityConfig]:
    cities: dict[str, CityConfig] = {}
    for path in sorted(get_settings().cities_dir.glob("*.yaml")):
        city = CityConfig.model_validate(yaml.safe_load(path.read_text(encoding="utf-8")))
        cities[city.id] = city
    return cities


def get_city(city_id: str) -> CityConfig:
    cities = load_cities()
    if city_id not in cities:
        raise KeyError(f"Nieznane miasto: {city_id}. Dostępne: {', '.join(cities)}")
    return cities[city_id]
