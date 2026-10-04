"""Dane demo bez internetu (`make seed`).

Snapshot (graf pieszy + miejsca z providerów) leży w repo w data/seed/<miasto>/ jako pliki .gz.
Seed rozpakowuje go do data/cache/<miasto>/, skąd czytają routing (graph.py) i fallback
providerów (service.py), oraz wrzuca miejsca do bazy. Dzięki temu demo nie zależy od Overpass.

    python -m app.seed               # snapshot -> cache + baza
    python -m app.seed --no-db       # tylko cache
    python -m app.seed --refresh     # pobierz świeże dane z Overpass i nadpisz snapshot
"""

import argparse
import gzip
import json
import logging
import shutil
import sys
from pathlib import Path

from app.cities import CityConfig, get_city
from app.config import get_settings
from app.models import Place, Poi
from app.normalization import merge_places
from app.providers.osm_pois import NAME as POIS_NAME
from app.providers.osm_pois import fetch_pois
from app.providers.service import cache_path, fetch_city_places

logger = logging.getLogger(__name__)

GRAPH_FILE = "graph.graphml"


def seed_dir(city_id: str, data_dir: Path | None = None) -> Path:
    return (data_dir or get_settings().data_dir) / "seed" / city_id


def _gzip_copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with src.open("rb") as f_in, gzip.open(dst, "wb", compresslevel=9) as f_out:
        shutil.copyfileobj(f_in, f_out)


def _gunzip_copy(src: Path, dst: Path) -> None:
    dst.parent.mkdir(parents=True, exist_ok=True)
    with gzip.open(src, "rb") as f_in, dst.open("wb") as f_out:
        shutil.copyfileobj(f_in, f_out)


def restore_cache(city: CityConfig, data_dir: Path | None = None) -> list[Path]:
    """Rozpakowuje snapshot do data/cache/<miasto>/. Zwraca zapisane pliki."""
    src_dir = seed_dir(city.id, data_dir)
    files = sorted(src_dir.glob("*.gz"))
    if not files:
        raise FileNotFoundError(f"Brak snapshotu w {src_dir}. Uruchom: make seed-refresh")
    cache_dir = cache_path(city.id, "_", data_dir).parent
    restored = []
    for src in files:
        dst = cache_dir / src.name.removesuffix(".gz")
        _gunzip_copy(src, dst)
        restored.append(dst)
    return restored


def load_cached_places(city: CityConfig, data_dir: Path | None = None) -> list[Place]:
    """Miejsca z cache włączonych providerów (te same pliki, z których korzysta fallback)."""
    places: list[Place] = []
    for cfg in city.providers:
        path = cache_path(city.id, cfg.name, data_dir)
        if cfg.enabled and path.exists():
            raw = json.loads(path.read_text(encoding="utf-8"))
            places.extend(Place.model_validate(p) for p in raw)
    return places


def save_places_to_db(places: list[Place]) -> int:
    """Upsert miejsc (z atrybutami) do bazy. Zwraca liczbę zapisanych miejsc."""
    from sqlalchemy import delete

    from app.db.places import place_to_row
    from app.db.session import SessionLocal, init_db
    from app.db.tables import AttributeRow, PlaceRow

    init_db()
    ids = [p.id for p in places]
    with SessionLocal.begin() as session:
        # in_() w paczkach - Postgres ma limit parametrów w jednym zapytaniu
        for i in range(0, len(ids), 5000):
            chunk = ids[i : i + 5000]
            session.execute(delete(AttributeRow).where(AttributeRow.place_id.in_(chunk)))
            session.execute(delete(PlaceRow).where(PlaceRow.id.in_(chunk)))
        session.add_all(place_to_row(p) for p in places)
    return len(places)


def save_pois_cache(city: CityConfig, pois: list[Poi], data_dir: Path | None = None) -> Path:
    path = cache_path(city.id, POIS_NAME, data_dir)
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(
        json.dumps([p.model_dump(mode="json") for p in pois], ensure_ascii=False),
        encoding="utf-8",
    )
    return path


def refresh_snapshot(city: CityConfig, data_dir: Path | None = None) -> list[Path]:
    """Pobiera świeże dane (Overpass) i zapisuje je jako nowy snapshot w data/seed/."""
    import osmnx as ox  # import leniwy: ciężki, potrzebny tylko przy odświeżaniu

    from app.routing.graph import download_graph

    cache_dir = cache_path(city.id, "_", data_dir).parent
    cache_dir.mkdir(parents=True, exist_ok=True)

    logger.info("Pobieram graf pieszy %s (przez mirror nawet 10 min)...", city.id)
    ox.save_graphml(download_graph(city), cache_dir / GRAPH_FILE)
    snapshot = [cache_dir / GRAPH_FILE]

    result = fetch_city_places(city, data_dir)
    for provider, source in result.sources.items():
        if source == "live":
            snapshot.append(cache_path(city.id, provider, data_dir))
        else:
            logger.warning("Provider %s: %s - zostawiam poprzedni snapshot", provider, source)

    if city.pois:
        try:
            snapshot.append(save_pois_cache(city, fetch_pois(city), data_dir))
        except ConnectionError as exc:
            logger.warning("Ławki i przewijaki: %s - zostawiam poprzedni snapshot", exc)

    out_dir = seed_dir(city.id, data_dir)
    written = []
    for src in snapshot:
        dst = out_dir / f"{src.name}.gz"
        _gzip_copy(src, dst)
        written.append(dst)
    return written


# Snapshot w repo tylko z danych publicznych - lokalne zgłoszenia (user_reports) nie do gita
PUBLIC_PROVIDERS = ("osm",)


def refresh_places_snapshot(city: CityConfig, data_dir: Path | None = None) -> list[Path]:
    """Tylko miejsca z providerów (bez grafu - ten pobiera się do 10 min) -> nowy snapshot."""
    result = fetch_city_places(city, data_dir)
    written = []
    for provider, source in result.sources.items():
        if provider not in PUBLIC_PROVIDERS:
            continue
        if source != "live":
            logger.warning("Provider %s: %s - zostawiam poprzedni snapshot", provider, source)
            continue
        dst = seed_dir(city.id, data_dir) / f"{provider}.json.gz"
        _gzip_copy(cache_path(city.id, provider, data_dir), dst)
        written.append(dst)
    return written


def _db_has_places(city_id: str) -> bool:
    from app.db.places import has_places
    from app.db.session import SessionLocal, init_db

    init_db()
    with SessionLocal() as session:
        return has_places(session, city_id)


def main(argv: list[str] | None = None) -> int:
    import app.providers  # noqa: F401  rejestruje providery

    parser = argparse.ArgumentParser(prog="python -m app.seed", description=__doc__.split("\n")[0])
    parser.add_argument("--city", default=get_settings().default_city)
    parser.add_argument("--refresh", action="store_true", help="pobierz nowy snapshot z Overpass")
    parser.add_argument(
        "--refresh-places",
        action="store_true",
        help="odśwież tylko miejsca z providerów (bez grafu), potem jak zwykły seed",
    )
    parser.add_argument("--no-db", action="store_true", help="nie zapisuj miejsc do bazy")
    parser.add_argument(
        "--if-empty",
        action="store_true",
        help="bazę wypełnij tylko, gdy nie ma w niej miejsc miasta (start na hostingu)",
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    city = get_city(args.city)
    if args.refresh_places:
        for path in refresh_places_snapshot(city):
            logger.info("Snapshot: %s (%.1f MB)", path, path.stat().st_size / 1e6)
    if args.refresh:
        for path in refresh_snapshot(city):
            logger.info("Snapshot: %s (%.1f MB)", path, path.stat().st_size / 1e6)
        return 0

    try:
        restored = restore_cache(city)
    except FileNotFoundError as exc:
        logger.error("%s", exc)
        return 1
    for path in restored:
        logger.info("Cache: %s", path)

    if args.no_db or not get_settings().db_enabled:
        return 0
    if args.if_empty and _db_has_places(city.id):
        logger.info("Baza: miejsca %s już są - pomijam zapis (--if-empty)", city.id)
        return 0
    # Te same miejsca z kilku źródeł (to samo id) -> jedno miejsce z wykrytymi konfliktami
    count = save_places_to_db(merge_places(load_cached_places(city)))
    logger.info("Baza: %d miejsc dla %s", count, city.id)

    from app.db.segments import save_graph_to_db

    segments = save_graph_to_db(city)
    logger.info("Baza: %d odcinków sieci pieszej dla %s", segments, city.id)
    return 0


if __name__ == "__main__":
    sys.exit(main())
