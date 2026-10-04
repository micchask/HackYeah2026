from enum import StrEnum

from pydantic import BaseModel, Field

from app.models.accessibility import Provenance
from app.models.geo import LatLon


class PoiKind(StrEnum):
    BENCH = "bench"  # ławka (amenity=bench) albo stół piknikowy (leisure=picnic_table)
    CHANGING_TABLE = "changing_table"  # przewijak (changing_table=yes)


class Poi(BaseModel):
    """Punkt dla warstw mapy (odpoczynek, przewijaki). Kształt jak `DemoPoi` we froncie."""

    id: str = Field(description="Np. 'osm:node/123'")
    kind: PoiKind
    name: str | None = None
    location: LatLon
    details: dict[str, str | int | float | bool] = Field(
        default_factory=dict,
        description=(
            "Szczegóły z OSM, np. ławka: backrest, armrest, seats, material; "
            "przewijak: place_type, location, fee, wheelchair, opening_hours"
        ),
    )
    source: str = Field(description="Źródło danych, np. 'osm'")
    provenance: Provenance
    confidence: float = Field(ge=0, le=1)
