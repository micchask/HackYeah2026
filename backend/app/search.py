"""Wyszukiwarka miejsc "jak w Google Maps": instytucje, miejsca z naszych danych i adresy.

Kolejność wyników: najpierw to, o czym mamy dane o dostępności (instytucje z deklaracji,
miejsca z OSM), na końcu adresy z geokodera (tylko lokalizacja). Wszystko w obszarze miasta
(demo_bbox).

Miejsca przeszukujemy w pamięci - z tego samego cache providerów, z którego `make seed`
ładuje bazę. Dzięki temu wyszukiwarka działa też bez bazy (CI, testy).
"""

import math
import re
import unicodedata
from functools import lru_cache
from pathlib import Path

from app import geocoding
from app.cities import CityConfig
from app.institutions import load_institutions
from app.models import Institution, LatLon, Place
from app.models.search import SearchResult, SearchResultKind
from app.providers.service import cache_path

MAX_INSTITUTIONS = 3
MAX_PLACES = 5
MAX_ADDRESSES = 3
# Ta sama nazwa tak blisko to ten sam obiekt (np. kilka peronów przystanku)
DUPLICATE_RADIUS_M = 60
# Obiekty bez rodzaju to zwykle ulice - jedna ulica to w danych wiele odcinków
DUPLICATE_RADIUS_NO_KIND_M = 400

# Kategorie OSM po polsku - do wyświetlania i do szukania po rodzaju ("apteka", "toaleta")
CATEGORY_PL = {
    "pharmacy": "apteka",
    "toilets": "toaleta",
    "restaurant": "restauracja",
    "cafe": "kawiarnia",
    "fast_food": "fast food",
    "bar": "bar",
    "pub": "pub",
    "bakery": "piekarnia",
    "convenience": "sklep spożywczy",
    "supermarket": "supermarket",
    "hairdresser": "fryzjer",
    "parking": "parking",
    "parcel_locker": "paczkomat",
    "bank": "bank",
    "atm": "bankomat",
    "post_office": "poczta",
    "hotel": "hotel",
    "hostel": "hostel",
    "museum": "muzeum",
    "theatre": "teatr",
    "cinema": "kino",
    "library": "biblioteka",
    "place_of_worship": "kościół",
    "townhall": "urząd",
    "police": "policja",
    "hospital": "szpital",
    "clinic": "przychodnia",
    "doctors": "lekarz",
    "dentist": "dentysta",
    "school": "szkoła",
    "university": "uczelnia",
    "platform": "przystanek",
    "stop_position": "przystanek",
    "station": "stacja",
    "attraction": "atrakcja",
    "information": "informacja turystyczna",
    "clothes": "sklep odzieżowy",
    "books": "księgarnia",
    "kiosk": "kiosk",
    "ice_cream": "lody",
}


def normalize(text: str) -> str:
    """Bez wielkości liter i polskich znaków: 'Łódzka Śródmieście' -> 'lodzka srodmiescie'."""
    text = text.lower().replace("ł", "l")
    text = "".join(c for c in unicodedata.normalize("NFKD", text) if not unicodedata.combining(c))
    return re.sub(r"\s+", " ", text).strip()


def match_score(haystack: str, query: str) -> int | None:
    """0 = zaczyna się od zapytania, 1 = każde słowo zapytania to początek słowa, 2 = zawiera.

    None = brak dopasowania. Wejście już znormalizowane.
    """
    tokens = query.split()
    if not tokens or not all(t in haystack for t in tokens):
        return None
    if haystack.startswith(query):
        return 0
    words = haystack.split()
    if all(any(w.startswith(t) for w in words) for t in tokens):
        return 1
    return 2


def distance_m(a: LatLon, b: LatLon) -> float:
    k = math.cos(math.radians(a.lat))
    return math.hypot((a.lon - b.lon) * k, a.lat - b.lat) * 111_320


def _is_duplicate(result: SearchResult, others: list[SearchResult]) -> bool:
    label = normalize(result.label)
    radius = DUPLICATE_RADIUS_M if result.kind else DUPLICATE_RADIUS_NO_KIND_M
    return any(
        normalize(o.label) == label and distance_m(result.point, o.point) <= radius for o in others
    )


def _with_distance(result: SearchResult, near: LatLon | None) -> SearchResult:
    if near is not None:
        result.distance_m = round(distance_m(near, result.point))
    return result


def search_institutions(
    institutions: list[Institution], query: str, city: CityConfig, near: LatLon | None = None
) -> list[SearchResult]:
    scored = []
    for inst in institutions:
        if not inst.location:
            continue
        point = inst.location.point
        if not city.contains(point.lat, point.lon):
            continue
        score = match_score(normalize(f"{inst.name} {inst.kind} {inst.address}"), query)
        if score is None:
            continue
        result = SearchResult(
            id=f"institution:{inst.id}",
            source=SearchResultKind.INSTITUTION,
            label=inst.name,
            description=inst.address,
            kind=inst.kind,
            point=point,
            institution_id=inst.id,
        )
        _with_distance(result, near)
        scored.append((score, result.distance_m or len(inst.name), result))
    return [r for *_, r in sorted(scored, key=lambda x: x[:2])]


def search_places(
    places: list[Place], query: str, city: CityConfig, near: LatLon | None = None
) -> list[SearchResult]:
    scored = []
    for place in places:
        if not city.contains(place.location.lat, place.location.lon):
            continue
        kind = CATEGORY_PL.get(place.category or "")
        label = place.name or (kind.capitalize() if kind else None)
        if not label:
            continue
        score = match_score(normalize(f"{label} {kind or ''}"), query)
        if score is None:
            continue
        result = SearchResult(
            id=f"place:{place.id}",
            source=SearchResultKind.PLACE,
            label=label,
            kind=kind,
            point=place.location,
            place=place,
        )
        _with_distance(result, near)
        # przy tym samym dopasowaniu: najbliższe widokowi mapy, potem te z danymi o dostępności
        has_data = 0 if place.attributes else 1
        scored.append((score, result.distance_m or 0, has_data, len(label), result))
    results: list[SearchResult] = []
    for *_, r in sorted(scored, key=lambda x: x[:4]):
        if not _is_duplicate(r, results):
            results.append(r)
    return results


@lru_cache(maxsize=4)
def _places_from_file(path: str, _mtime: float) -> list[Place]:
    import json

    raw = json.loads(Path(path).read_text(encoding="utf-8"))
    return [Place.model_validate(p) for p in raw]


def load_places(city: CityConfig) -> list[Place]:
    """Miejsca z cache providera OSM (wypełnia go `make seed` albo pobranie z Overpass)."""
    path = cache_path(city.id, "osm")
    if not path.exists():
        return []
    return _places_from_file(str(path), path.stat().st_mtime)


def search(
    city: CityConfig, query: str, limit: int = 8, near: LatLon | None = None
) -> list[SearchResult]:
    """`near` (np. środek widoku mapy) - bliższe wyniki wyżej i odległość w `distance_m`."""
    q = normalize(query)
    if len(q) < 2:
        return []
    institutions = search_institutions(load_institutions(city.id), q, city, near)
    institutions = institutions[:MAX_INSTITUTIONS]
    places = search_places(load_places(city), q, city, near)[:MAX_PLACES]
    results = institutions + [p for p in places if not _is_duplicate(p, institutions)]

    try:
        found = geocoding.search(city, query, MAX_ADDRESSES)
    except geocoding.GeocoderUnavailable:
        found = []  # bez geokodera zostają nasze dane - to nie jest błąd wyszukiwarki
    for g in found:
        address = SearchResult(
            id=f"address:{g.point.lat:.6f},{g.point.lon:.6f}",
            source=SearchResultKind.ADDRESS,
            label=g.label,
            description=g.description,
            kind=g.kind,
            point=g.point,
        )
        _with_distance(address, near)
        if not _is_duplicate(address, results):
            results.append(address)
    return results[:limit]
