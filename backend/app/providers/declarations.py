"""Deklaracje dostępności podmiotów publicznych (obowiązkowe w całej Polsce, jednolity wzór).

Zbiór dla miasta wskazuje `cities/<miasto>.yaml` (`options.url`: ścieżka względem backend/
albo http(s)://), tak samo jak mapowanie kategorii na nasze cechy. Kod nie zna żadnego miasta.

Wartości w deklaracjach to wolny tekst ("brak, dostępny tylko parter", "dostępna, parter").
Zamieniamy je na tak/nie tylko w jasnych przypadkach - niejednoznaczny tekst pomijamy,
bo lepiej nie mieć informacji niż mieć zgadniętą.
"""

import json
import re
from datetime import UTC, date, datetime
from typing import Any

import httpx

from app.config import BACKEND_DIR
from app.models import AccessibilityAttribute, AttributeKey, LatLon, Place, Provenance, SourceType
from app.normalization.text import normalize
from app.providers.base import Provider, register_provider


def text_to_bool(value: str, rule: dict[str, list[str]]) -> bool | None:
    """Najpierw słowa przeczące ("brak", "schod"), potem twierdzące; inaczej None.

    Słowo z reguły musi zaczynać wyraz: "tak" pasuje do "tak, kabina", ale nie do "kontakt".
    """
    text = normalize(value)

    def found(words: list[str]) -> bool:
        return any(re.search(rf"\b{re.escape(normalize(w))}", text) for w in words)

    if found(rule.get("negative", [])):
        return False
    if found(rule.get("positive", [])):
        return True
    return None


def _parse_date(value: str | None) -> datetime | None:
    if not value:
        return None
    try:
        return datetime.combine(date.fromisoformat(value), datetime.min.time(), UTC)
    except ValueError:
        return None


@register_provider("accessibility_declarations")
class AccessibilityDeclarationsProvider(Provider):
    source_type = SourceType.OPEN_DATA
    base_confidence = 0.7

    def fetch_places(self) -> list[Place]:
        url: str = self.options["url"]
        if url.startswith(("http://", "https://")):
            response = httpx.get(url, timeout=self.options.get("timeout_s", 30))
            response.raise_for_status()
            payload = response.json()
        else:
            payload = json.loads((BACKEND_DIR / url).read_text(encoding="utf-8"))
        return self.parse(payload)

    def parse(self, payload: list[dict[str, Any]]) -> list[Place]:
        """Rekordy deklaracji -> Place. Pomija rekordy bez współrzędnych."""
        mapping: dict[str, dict[str, Any]] = self.options.get("attributes", {})
        fetched_at = datetime.now(UTC)
        places: list[Place] = []
        for record in payload:
            geometry = record.get("geometry") or {}
            if geometry.get("type") != "Point":
                continue
            lon, lat = geometry["coordinates"]

            values: dict[AttributeKey, AccessibilityAttribute] = {}
            for raw in record.get("attributes", []):
                rule = mapping.get(raw.get("category", ""))
                if not rule or not isinstance(raw.get("value"), str):
                    continue
                value = text_to_bool(raw["value"], rule)
                if value is None:
                    continue
                key = AttributeKey(rule["key"])
                attr = AccessibilityAttribute(
                    key=key,
                    value=value,
                    provenance=Provenance(
                        source=self.name,
                        source_type=self.source_type,
                        source_ref=f"{record['id']}#{raw['category']}",
                        fetched_at=fetched_at,
                        last_verified=_parse_date(raw.get("lastVerified")),
                    ),
                    confidence=raw.get("confidence", self.base_confidence),
                )
                # Kilka wejść (główne po schodach, boczne bez) -> jest wejście bez schodów
                if key not in values or (value and not values[key].value):
                    values[key] = attr

            places.append(
                Place(
                    id=f"{self.name}:{record['id']}",
                    city=self.city.id,
                    name=record.get("institution"),
                    category=record.get("poiType"),
                    location=LatLon(lat=lat, lon=lon),
                    attributes=list(values.values()),
                )
            )
        return places
