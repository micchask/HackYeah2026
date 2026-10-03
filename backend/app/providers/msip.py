"""MSIP - Miejski System Informacji Przestrzennej Krakowa (WMS/WFS).

TODO(dane): wybrać warstwy (chodniki, przejścia, schody, nawierzchnie) i pobierać je przez WFS.
Dane liniowe (chodniki) najpewniej trafią do grafu routingu, nie do Place.
"""

from app.models import Place, SourceType
from app.providers.base import Provider, register_provider


@register_provider("msip")
class MsipProvider(Provider):
    source_type = SourceType.MSIP
    base_confidence = 0.8

    def fetch_places(self) -> list[Place]:
        return []
