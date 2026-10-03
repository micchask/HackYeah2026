"""Instytucje publiczne z deklaracji dostępności (backend/datasets/<miasto>_instytucje_*.json).

Plik źródłowy ma polskie klucze statusów i kategorii – tu zamieniamy je na model API.
Współrzędne dopisuje scripts/geocode_institutions.py.
"""

import json
from functools import lru_cache
from pathlib import Path
from typing import Any

from app.config import BACKEND_DIR
from app.models import LatLon
from app.models.institution import (
    Institution,
    InstitutionAttribute,
    InstitutionDataStatus,
    InstitutionLocation,
)

DATASETS_DIR = BACKEND_DIR / "datasets"
DATASETS = {"krakow": "krakow_instytucje_dostepnosc.json"}

STATUS = {
    "potwierdzone": InstitutionDataStatus.CONFIRMED,
    "potwierdzone_brak_daty": InstitutionDataStatus.CONFIRMED_NO_DATE,
    "unknown": InstitutionDataStatus.UNKNOWN,
}

CATEGORY_LABEL = {
    "wejscie": "Wejście",
    "wejscie_glowne": "Wejście główne",
    "wejscie_boczne": "Wejście boczne",
    "podjazd": "Podjazd",
    "winda": "Winda",
    "platforma": "Platforma",
    "trasa": "Trasa zwiedzania",
    "nawierzchnia": "Nawierzchnia",
    "krawezniki": "Krawężniki",
    "bariery_progowe_poziom_0": "Progi na parterze",
    "toaleta": "Toaleta",
    "przewijak": "Przewijak",
    "parking": "Parking",
    "parking_niepelnosprawni": "Parking dla osób z niepełnosprawnościami",
    "dojazd_transportem": "Dojazd komunikacją",
    "stanowiska_kasa": "Kasa / stanowiska obsługi",
    "wozek_do_wypozyczenia": "Wózek do wypożyczenia",
    "petla_indukcyjna": "Pętla indukcyjna",
    "tlumacz_migowy": "Tłumacz PJM",
    "linie_naprowadzajace": "Linie naprowadzające",
    "oznaczenia_brajl": "Oznaczenia w alfabecie Braille'a",
    "oznaczenia_kontrastowe": "Oznaczenia kontrastowe",
    "oznaczenia_niewidomi": "Udogodnienia dla osób niewidomych",
    "pies_asystujacy": "Pies asystujący",
    "opis_dostepnosci": "Opis dostępności",
}


def _label(category: str) -> str:
    return CATEGORY_LABEL.get(category) or category.replace("_", " ").capitalize()


def parse_institution(raw: dict[str, Any]) -> Institution:
    location = None
    geometry = raw.get("geometry")
    if geometry and geometry.get("type") == "Point":
        lon, lat = geometry["coordinates"]
        geo_source = raw.get("geometrySource") or {}
        location = InstitutionLocation(
            point=LatLon(lat=lat, lon=lon),
            source=geo_source.get("source", "nieznane"),
            exact=geo_source.get("match") == "dokładny adres",
        )
    return Institution(
        id=raw["id"],
        name=raw["institution"],
        address=raw["address"],
        kind=raw.get("poiType", "instytucja"),
        location=location,
        attributes=[
            InstitutionAttribute(
                category=a["category"],
                label=_label(a["category"]),
                value=a.get("value"),
                source=a["source"],
                last_verified=a.get("lastVerified"),
                confidence=a["confidence"],
                # nieznany status traktujemy jak brak informacji, nigdy jak potwierdzenie
                status=STATUS.get(a.get("status", ""), InstitutionDataStatus.UNKNOWN),
                note=a.get("note"),
            )
            for a in raw.get("attributes", [])
        ],
    )


@lru_cache
def load_institutions(city_id: str, datasets_dir: Path = DATASETS_DIR) -> list[Institution]:
    filename = DATASETS.get(city_id)
    if filename is None:
        return []
    raw = json.loads((datasets_dir / filename).read_text(encoding="utf-8"))
    return [parse_institution(item) for item in raw]
