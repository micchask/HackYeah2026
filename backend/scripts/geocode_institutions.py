"""Dopisuje współrzędne instytucjom z backend/datasets/krakow_instytucje_dostepnosc.json.

Deklaracje dostępności podają tylko adres, więc geokodujemy go Photonem (dane OSM)
i zapisujemy wynik razem z provenance (`geometrySource`): skąd punkt, jakie zapytanie
i czy trafiliśmy w numer domu ("dokładny adres") czy tylko w ulicę ("przybliżony").

Uruchom w kontenerze backendu (potrzebny internet do photon.komoot.io):
    docker compose exec backend python scripts/geocode_institutions.py
    docker compose exec backend python scripts/geocode_institutions.py --force  # nadpisz
"""

import argparse
import json
import re
import sys
import time
from datetime import date
from pathlib import Path

import httpx
import yaml

BACKEND = Path(__file__).resolve().parents[1]
DATASET = BACKEND / "datasets" / "krakow_instytucje_dostepnosc.json"
CITY = BACKEND / "cities" / "krakow.yaml"
PHOTON_URL = "https://photon.komoot.io/api/"
USER_AGENT = "HackYeah2026-dostepne-trasy/0.1 (hackathon demo)"


def clean_address(address: str) -> str:
    """'Rynek Główny 35 (wejście...), Kraków' -> 'Rynek Główny 35'."""
    text = re.sub(r"\(.*?\)", "", address)
    text = re.sub(r",?\s*Kraków\s*$", "", text.strip())
    text = re.sub(r",\s*budynk\w*.*$", "", text)  # 'ul. Centralna, budynki A i B'
    text = re.sub(r"(\d+\w?)\s*(?:i|[-–])\s*\d+\w?", r"\1", text)  # '27 i 29', '3-4' -> pierwszy
    text = re.sub(r"^(ul|al)\.\s*", "", text)  # Photon lepiej radzi sobie bez skrótów
    return re.sub(r"\s+", " ", text).strip(" ,")


def house_number(query: str) -> str | None:
    match = re.search(r"\b(\d+\w?)$", query)
    return match.group(1).lower() if match else None


def geocode(client: httpx.Client, query: str, bbox: list[float]) -> tuple[dict, str] | None:
    s, w, n, e = bbox
    response = client.get(
        PHOTON_URL,
        params={"q": f"{query}, Kraków", "bbox": f"{w},{s},{e},{n}", "limit": 5, "lang": "default"},
    )
    response.raise_for_status()
    features = response.json().get("features", [])
    if not features:
        return None
    wanted = house_number(query)
    for feature in features:
        if wanted and str(feature["properties"].get("housenumber", "")).lower() == wanted:
            return feature, "dokładny adres"
    return features[0], "przybliżony"


def describe(feature: dict) -> str:
    p = feature["properties"]
    street = " ".join(x for x in (p.get("street"), p.get("housenumber")) if x)
    return ", ".join(x for x in (p.get("name"), street, p.get("district")) if x)


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    parser.add_argument("--force", action="store_true", help="geokoduj też te, które mają punkt")
    args = parser.parse_args()

    bbox = yaml.safe_load(CITY.read_text(encoding="utf-8"))["bbox"]
    institutions = json.loads(DATASET.read_text(encoding="utf-8"))
    today = date.today().isoformat()
    failed = []

    with httpx.Client(headers={"User-Agent": USER_AGENT}, timeout=10) as client:
        for item in institutions:
            if item.get("geometry") and not args.force:
                continue
            query = clean_address(item["address"])
            result = geocode(client, query, bbox)
            time.sleep(1)  # Photon to darmowy serwis – nie zasypujemy go zapytaniami
            if result is None:
                failed.append(item["id"])
                print(f"  BRAK  {item['id']:<32} {query}")
                continue
            feature, match = result
            lon, lat = feature["geometry"]["coordinates"]
            item["geometry"] = {"type": "Point", "coordinates": [round(lon, 6), round(lat, 6)]}
            item["geometrySource"] = {
                "source": "Photon (dane OpenStreetMap)",
                "query": query,
                "matched": describe(feature),
                "match": match,
                "fetched": today,
            }
            print(f"  {match:<14} {item['id']:<32} {query!r:<40} -> {describe(feature)}")

    DATASET.write_text(
        json.dumps(institutions, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    located = sum(1 for i in institutions if i.get("geometry"))
    print(f"\nZ lokalizacją: {located}/{len(institutions)}")
    if failed:
        print("Bez wyniku:", ", ".join(failed), file=sys.stderr)


if __name__ == "__main__":
    main()
