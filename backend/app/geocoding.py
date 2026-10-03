"""Wyszukiwarka adresów (geokoder Photon) z cache i ograniczeniem do obszaru miasta.

Front nie woła Photona bezpośrednio: dzięki temu mamy cache, kontrolę limitów
i jedno miejsce do podmiany dostawcy (np. na Nominatim).
"""

import math
import time
from typing import Any

import httpx

from app.cities import CityConfig
from app.config import get_settings
from app.models import GeocodeResult, LatLon

# Photon odrzuca (403) domyślny User-Agent bibliotek HTTP
USER_AGENT = "HackYeah2026-dostepne-trasy/0.1 (hackathon demo)"
TIMEOUT_S = 5.0
CACHE_TTL_S = 3600
# Ta sama nazwa w tej odległości to zwykle kolejny odcinek tej samej ulicy
DUPLICATE_RADIUS_M = 150

KIND_PL = {
    ("highway", "pedestrian"): "deptak",
    ("highway", "footway"): "chodnik",
    ("highway", "steps"): "schody",
    ("tourism", "attraction"): "atrakcja",
    ("tourism", "museum"): "muzeum",
    ("tourism", "hotel"): "hotel",
    ("amenity", "restaurant"): "restauracja",
    ("amenity", "cafe"): "kawiarnia",
    ("amenity", "marketplace"): "targ",
    ("amenity", "place_of_worship"): "kościół",
    ("amenity", "pharmacy"): "apteka",
    ("amenity", "toilets"): "toaleta",
    ("public_transport", "platform"): "przystanek",
    ("highway", "bus_stop"): "przystanek",
    ("railway", "tram_stop"): "przystanek",
    ("natural", "peak"): "wzgórze",
}


class GeocoderUnavailable(Exception):
    pass


_cache: dict[tuple, tuple[float, Any]] = {}


def _cached(key: tuple, fetch):
    now = time.monotonic()
    hit = _cache.get(key)
    if hit and now - hit[0] < CACHE_TTL_S:
        return hit[1]
    value = fetch()
    _cache[key] = (now, value)
    return value


def _get(path: str, params: dict[str, Any]) -> dict[str, Any]:
    url = get_settings().geocoder_url.rstrip("/") + path
    try:
        response = httpx.get(
            url, params=params, headers={"User-Agent": USER_AGENT}, timeout=TIMEOUT_S
        )
        response.raise_for_status()
        return response.json()
    except (httpx.HTTPError, ValueError) as exc:
        raise GeocoderUnavailable(str(exc)) from exc


def search(city: CityConfig, query: str, limit: int = 5) -> list[GeocodeResult]:
    s, w, n, e = city.area_bbox
    key = ("search", city.id, query.strip().lower(), limit)

    def fetch() -> list[GeocodeResult]:
        # zapas na duplikaty (ta sama ulica w kilku odcinkach)
        params = {"q": query, "bbox": f"{w},{s},{e},{n}", "limit": limit * 3}
        return parse_photon(_get("/api/", params), city)[:limit]

    return _cached(key, fetch)


def reverse(city: CityConfig, lat: float, lon: float) -> GeocodeResult | None:
    key = ("reverse", city.id, round(lat, 5), round(lon, 5))

    def fetch() -> GeocodeResult | None:
        results = parse_photon(_get("/reverse", {"lat": lat, "lon": lon}), city)
        return results[0] if results else None

    return _cached(key, fetch)


def parse_photon(payload: dict[str, Any], city: CityConfig) -> list[GeocodeResult]:
    """Zamienia odpowiedź Photona (GeoJSON) na podpowiedzi z obszaru miasta, bez duplikatów."""
    results: list[GeocodeResult] = []
    for feature in payload.get("features", []):
        coords = feature.get("geometry", {}).get("coordinates")
        props: dict[str, Any] = feature.get("properties", {})
        if not coords or len(coords) < 2:
            continue
        lon, lat = float(coords[0]), float(coords[1])
        if not city.contains(lat, lon):
            continue
        label = _label(props)
        if not label:
            continue
        result = GeocodeResult(
            label=label,
            description=_description(props, label),
            kind=KIND_PL.get((props.get("osm_key"), props.get("osm_value")))
            or ("ulica" if props.get("type") == "street" else None),
            point=LatLon(lat=lat, lon=lon),
        )
        if not any(_is_duplicate(result, other) for other in results):
            results.append(result)
    return results


def _address(props: dict[str, Any]) -> str | None:
    street = props.get("street")
    if not street:
        return None
    number = props.get("housenumber")
    return f"{street} {number}" if number else street


def _label(props: dict[str, Any]) -> str | None:
    return props.get("name") or _address(props)


def _description(props: dict[str, Any], label: str) -> str | None:
    parts = []
    address = _address(props)
    if address and address != label:
        parts.append(address)
    area = props.get("district") or props.get("locality")
    if area and area != label:
        parts.append(area)
    return " · ".join(parts) or None


def _is_duplicate(a: GeocodeResult, b: GeocodeResult) -> bool:
    if (a.label, a.description) != (b.label, b.description):
        return False
    k = math.cos(math.radians(a.point.lat))
    dx = (a.point.lon - b.point.lon) * k
    dy = a.point.lat - b.point.lat
    return math.hypot(dx, dy) * 111_320 <= DUPLICATE_RADIUS_M
