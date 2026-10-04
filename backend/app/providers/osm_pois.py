"""Ławki i przewijaki z OpenStreetMap (Overpass) dla warstw mapy - `GET /api/pois`.

Osobno od providerów miejsc (`Place`): w obszarze demo jest ok. 1400 ławek, które zalałyby
listę miejsc i bazę. Konfiguracja w `cities/<miasto>.yaml` -> `pois`.
"""

import logging
from datetime import UTC, datetime
from typing import Any

import httpx

from app.cities import CityConfig
from app.models import LatLon, Poi, PoiKind, Provenance, SourceType

logger = logging.getLogger(__name__)

NAME = "osm_pois"  # nazwa pliku w data/cache/<miasto>/ i data/seed/<miasto>/
BASE_CONFIDENCE = 0.6  # jak OsmProvider


def build_query(bbox: tuple[float, float, float, float], timeout_s: int = 60) -> str:
    s, w, n, e = bbox
    area = f"({s},{w},{n},{e})"
    return f"""
[out:json][timeout:{timeout_s}];
(
  node["amenity"="bench"]{area};
  node["leisure"="picnic_table"]{area};
  nwr["changing_table"="yes"]{area};
);
out center tags;
"""


def fetch_pois(city: CityConfig) -> list[Poi]:
    """Pobiera z kolejnych mirrorów Overpass (`pois.overpass_urls`), aż któryś odpowie."""
    options = city.pois
    timeout = options.get("timeout_s", 60)
    query = build_query(city.area_bbox, timeout)
    errors = []
    for url in options.get("overpass_urls", []):
        try:
            response = httpx.post(url, data={"data": query}, timeout=timeout + 10)
            response.raise_for_status()
            return parse(response.json(), fetched_at=datetime.now(UTC))
        except (httpx.HTTPError, ValueError) as exc:
            logger.warning("Overpass %s: %s", url, exc)
            errors.append(f"{url}: {exc}")
    raise ConnectionError("Żaden mirror Overpass nie odpowiedział: " + "; ".join(errors))


def _bool(value: str | None) -> bool | None:
    return {"yes": True, "no": False}.get(value or "")


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).replace(tzinfo=UTC)
    except ValueError:
        return None


def _bench_details(tags: dict[str, str]) -> dict[str, str | int | float | bool]:
    details: dict[str, str | int | float | bool] = {}
    if tags.get("leisure") == "picnic_table":
        details["type"] = "picnic_table"
    for tag in ("backrest", "armrest", "covered"):
        if (value := _bool(tags.get(tag))) is not None:
            details[tag] = value
    if tags.get("seats", "").isdigit():
        details["seats"] = int(tags["seats"])
    if tags.get("material"):
        details["material"] = tags["material"]
    return details


def _changing_table_details(tags: dict[str, str]) -> dict[str, str | int | float | bool]:
    details: dict[str, str | int | float | bool] = {}
    if place_type := tags.get("amenity") or tags.get("shop"):
        details["place_type"] = place_type
    if tags.get("changing_table:location"):
        details["location"] = tags["changing_table:location"]
    if (fee := _bool(tags.get("fee"))) is not None:
        details["fee"] = fee
    for tag in ("wheelchair", "opening_hours"):
        if tags.get(tag):
            details[tag] = tags[tag]
    return details


def parse(payload: dict[str, Any], fetched_at: datetime) -> list[Poi]:
    """Odpowiedź Overpass -> Poi. Czysta funkcja (test na próbce bez sieci)."""
    pois: list[Poi] = []
    for el in payload.get("elements", []):
        lat = el.get("lat") or el.get("center", {}).get("lat")
        lon = el.get("lon") or el.get("center", {}).get("lon")
        if lat is None or lon is None:
            continue
        tags: dict[str, str] = el.get("tags", {})
        ref = f"{el['type']}/{el['id']}"
        if tags.get("changing_table") == "yes":
            kind, details = PoiKind.CHANGING_TABLE, _changing_table_details(tags)
        else:
            kind, details = PoiKind.BENCH, _bench_details(tags)
        pois.append(
            Poi(
                id=f"osm:{ref}",
                kind=kind,
                name=tags.get("name"),
                location=LatLon(lat=lat, lon=lon),
                details=details,
                source="osm",
                provenance=Provenance(
                    source="osm",
                    source_type=SourceType.OSM,
                    source_ref=ref,
                    fetched_at=fetched_at,
                    last_verified=_parse_date(tags.get("check_date")),
                ),
                confidence=BASE_CONFIDENCE,
            )
        )
    return pois
