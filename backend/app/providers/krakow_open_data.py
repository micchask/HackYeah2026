"""Portal otwartych danych Krakowa.

TODO(dane): wybrać zbiory (np. toalety publiczne, przystanki, obiekty miejskie),
wpisać ich URL-e w cities/krakow.yaml -> providers[krakow_open_data].options.datasets
i zmapować pola na AttributeKey.
"""

from app.models import Place, SourceType
from app.providers.base import Provider, register_provider


@register_provider("krakow_open_data")
class KrakowOpenDataProvider(Provider):
    source_type = SourceType.OPEN_DATA
    base_confidence = 0.7

    def fetch_places(self) -> list[Place]:
        return []
