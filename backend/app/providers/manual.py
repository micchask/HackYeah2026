"""Ręcznie dodane dane (np. weryfikacja w terenie) z pliku data/seed/<miasto>/manual.json.gz.

Format pliku: lista Place jak w odpowiedzi /api/places. Miejsce z tym samym `id` co w OSM
(np. "osm:way/23256528") jest scalane z danymi OSM przez normalizację (app/normalization).
"""

import gzip
import json

from app.config import get_settings
from app.models import Place, SourceType
from app.providers.base import Provider, register_provider


@register_provider("manual")
class ManualProvider(Provider):
    source_type = SourceType.MANUAL
    base_confidence = 0.7

    def fetch_places(self) -> list[Place]:
        path = get_settings().data_dir / "seed" / self.city.id / "manual.json.gz"
        if not path.exists():
            return []
        with gzip.open(path, "rt", encoding="utf-8") as f:
            return [Place.model_validate(p) for p in json.load(f)]
