from enum import StrEnum
from typing import Literal

from pydantic import BaseModel, Field

from app.models.geo import LatLon
from app.models.place import Place


class SearchResultKind(StrEnum):
    INSTITUTION = "institution"  # deklaracja dostępności (BIP) - pełne dane w /api/institutions
    PLACE = "place"  # miejsce z naszych danych (OSM) - atrybuty dostępności w `place`
    ADDRESS = "address"  # adres/obiekt z geokodera - bez danych o dostępności


class SearchResult(BaseModel):
    """Wynik wyszukiwarki miejsc. Pola label/description/kind/point jak w GeocodeResult."""

    id: str = Field(description="Stabilne ID wyniku, np. 'institution:mk-krzysztofory'")
    source: SearchResultKind
    label: str = Field(description="Nazwa do wyświetlenia")
    description: str | None = Field(default=None, description="Adres albo kontekst")
    kind: str | None = Field(default=None, description="Rodzaj po polsku, np. 'apteka', 'muzeum'")
    point: LatLon
    institution_id: str | None = Field(default=None, description="Dla source=institution")
    place: Place | None = Field(default=None, description="Dla source=place: miejsce z atrybutami")
    match: Literal["name", "category"] = Field(
        default="name",
        description="'category' = zapytanie o rodzaj/cechę (np. 'hotel', 'przewijak') - "
        "zwracamy WSZYSTKIE takie miejsca w obszarze, a nie kilka najlepszych dopasowań",
    )
    distance_m: float | None = Field(
        default=None, description="Odległość od punktu `lat`/`lon` z zapytania (np. środka mapy)"
    )
