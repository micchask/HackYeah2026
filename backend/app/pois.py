"""Ławki i przewijaki z cache (`data/cache/<miasto>/osm_pois.json`, wypełnia go `make seed`).

Bez bazy - tak jak wyszukiwarka - więc działa też w testach i CI. Gdy cache nie ma
(seed nie był uruchomiony), czytamy snapshot z `data/seed/<miasto>/osm_pois.json.gz`.
"""

import gzip
import json
from functools import lru_cache
from pathlib import Path

from app.cities import CityConfig
from app.config import get_settings
from app.models import Poi
from app.providers.osm_pois import NAME
from app.providers.service import cache_path


@lru_cache(maxsize=4)
def _from_file(path: str, _mtime: float) -> list[Poi]:
    opener = gzip.open if path.endswith(".gz") else open
    with opener(path, "rt", encoding="utf-8") as f:
        return [Poi.model_validate(p) for p in json.load(f)]


def load_pois(city: CityConfig) -> list[Poi]:
    seed = get_settings().data_dir / "seed" / city.id / f"{NAME}.json.gz"
    for path in (cache_path(city.id, NAME), seed):
        if Path(path).exists():
            return _from_file(str(path), path.stat().st_mtime)
    return []
