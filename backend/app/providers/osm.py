"""OpenStreetMap przez Overpass API."""

from datetime import UTC, datetime
from typing import Any

import httpx

from app.models import (
    AccessibilityAttribute,
    AttributeKey,
    LatLon,
    Place,
    Provenance,
    SourceType,
)
from app.providers.base import Provider, register_provider

DEFAULT_OVERPASS_URL = "https://overpass-api.de/api/interpreter"

# Tag OSM -> (klucz atrybutu, funkcja konwersji wartości)
TAG_MAPPING: dict[str, tuple[AttributeKey, Any]] = {
    "wheelchair": (AttributeKey.WHEELCHAIR, str),
    "toilets:wheelchair": (AttributeKey.ACCESSIBLE_TOILET, lambda v: v == "yes"),
    "ramp:wheelchair": (AttributeKey.RAMP, lambda v: v == "yes"),
    "tactile_paving": (AttributeKey.TACTILE_PAVING, lambda v: v == "yes"),
    "surface": (AttributeKey.SURFACE, str),
}


@register_provider("osm")
class OsmProvider(Provider):
    source_type = SourceType.OSM
    base_confidence = 0.6

    def build_query(self) -> str:
        s, w, n, e = self.city.bbox
        timeout = self.options.get("timeout_s", 60)
        return f"""
[out:json][timeout:{timeout}];
(
  node["wheelchair"]({s},{w},{n},{e});
  way["wheelchair"]({s},{w},{n},{e});
);
out center tags;
"""

    def fetch_places(self) -> list[Place]:
        url = self.options.get("overpass_url", DEFAULT_OVERPASS_URL)
        timeout = self.options.get("timeout_s", 60) + 10
        response = httpx.post(url, data={"data": self.build_query()}, timeout=timeout)
        response.raise_for_status()
        return self.parse(response.json())

    def parse(self, payload: dict[str, Any]) -> list[Place]:
        fetched_at = datetime.now(UTC)
        places: list[Place] = []
        for el in payload.get("elements", []):
            lat = el.get("lat") or el.get("center", {}).get("lat")
            lon = el.get("lon") or el.get("center", {}).get("lon")
            if lat is None or lon is None:
                continue
            tags: dict[str, str] = el.get("tags", {})
            ref = f"{el['type']}/{el['id']}"
            last_verified = _parse_check_date(tags.get("check_date"))
            attributes = [
                AccessibilityAttribute(
                    key=key,
                    value=convert(tags[tag]),
                    provenance=Provenance(
                        source=self.name,
                        source_type=self.source_type,
                        source_ref=ref,
                        fetched_at=fetched_at,
                        last_verified=last_verified,
                    ),
                    confidence=self.base_confidence,
                )
                for tag, (key, convert) in TAG_MAPPING.items()
                if tag in tags
            ]
            places.append(
                Place(
                    id=f"osm:{ref}",
                    city=self.city.id,
                    name=tags.get("name"),
                    category=_category(tags),
                    location=LatLon(lat=lat, lon=lon),
                    attributes=attributes,
                )
            )
        return places


def _category(tags: dict[str, str]) -> str | None:
    return tags.get("amenity") or tags.get("shop") or tags.get("public_transport")


def _parse_check_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.fromisoformat(value).replace(tzinfo=UTC)
    except ValueError:
        return None
