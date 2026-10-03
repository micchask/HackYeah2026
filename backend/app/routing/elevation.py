"""Nachylenie krawędzi grafu z numerycznego modelu terenu (NMT) GUGiK, siatka 1 m (#10).

Tag `incline` w OSM jest rzadki, więc wysokości bierzemy z NMT:
- `download_nmt` pobiera wycinek NMT dla obszaru miasta (demo_bbox) usługą WCS GUGiK
  do data/raw/nmt/<miasto>/ (kafle GeoTIFF, nie do repo),
- `add_inclines` próbkuje NMT co ~5 m wzdłuż geometrii każdej krawędzi i zapisuje
  `incline_percent` = NAJBARDZIEJ STROMY ~10-metrowy fragment (dla wózka liczy się
  najtrudniejsze miejsce, nie średnia), ze znakiem w kierunku u -> v,
- nachylenie trafia do graphml, więc seed działa bez rastra.

Liczbowy tag OSM (`incline=8%`) ma pierwszeństwo. Mosty, tunele i schody pomijamy (NMT to teren
pod mostem / nie opisuje stopni). Wartości > 30% to stromy stok albo błąd modelu - zapisujemy je
jako ±30% z adnotacją, a NIE jako brak danych: brak danych router traktuje jak przejezdny
(przykład: trawiasta ścieżka na skarpie Wawelu, ~52% wg NMT - prawdziwa).

Uzupełnienie istniejącego grafu (bez ponownego pobierania OSM z Overpass):
    docker compose exec backend python -m app.routing.elevation --update-seed
"""

import argparse
import io
import logging
import math
from collections.abc import Callable, Iterable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import httpx
import networkx as nx
import numpy as np
import tifffile
from pyproj import Transformer

from app.cities import CityConfig
from app.config import get_settings
from app.routing.profiles import tag

logger = logging.getLogger(__name__)

WCS_URL = (
    "https://mapy.geoportal.gov.pl/wss/service/PZGIK/NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF"
)
COVERAGE_ID = "DTM_PL-KRON86-NH_TIFF"  # NMT 1 m, układ PL-1992 (EPSG:2180), wysokości PL-KRON86-NH
NMT_SOURCE = "NMT GUGiK"
TILE_M = 1000  # wycinek WCS 1x1 km = 4 MB; mniejsze zapytania są pewniejsze
MARGIN_M = 50

SAMPLE_STEP_M = 5.0
WINDOW_M = 10.0
MIN_EDGE_M = 4.0  # krótsze odcinki (przejścia, krawężniki) - szum NMT większy niż sygnał
MAX_VALID_PERCENT = 30.0
STEEP_NOTE = "ponad 30% wg NMT - stromy stok albo błąd modelu terenu"

# lon/lat (WGS84) -> easting/northing (PL-1992); always_xy: x=lon/easting, y=lat/northing
_TO_PL1992 = Transformer.from_crs("EPSG:4326", "EPSG:2180", always_xy=True)

Sampler = Callable[[np.ndarray, np.ndarray], np.ndarray]


# --------------------------------------------------------------------------------------
# Raster
# --------------------------------------------------------------------------------------


@dataclass
class Tile:
    z: np.ndarray  # [wiersz, kolumna], wiersz 0 = północ
    left: float  # easting lewej krawędzi
    top: float  # northing górnej krawędzi
    res: float  # m na piksel


class ElevationGrid:
    """Kafle NMT; `sample` zwraca wysokość (interpolacja dwuliniowa), NaN poza danymi."""

    def __init__(self, tiles: list[Tile]) -> None:
        self.tiles = tiles

    def sample(self, east: np.ndarray, north: np.ndarray) -> np.ndarray:
        out = np.full(np.shape(east), np.nan)
        for t in self.tiles:
            # środek piksela (0, 0) leży pół piksela od narożnika
            col = (np.asarray(east) - t.left) / t.res - 0.5
            row = (t.top - np.asarray(north)) / t.res - 0.5
            h, w = t.z.shape
            # cały obszar kafla (także pół piksela przy brzegu - inaczej na styku kafli byłaby
            # szczelina bez danych); przy brzegu przycinamy do skrajnych środków pikseli
            inside = (
                np.isnan(out) & (col >= -0.5) & (row >= -0.5) & (col <= w - 0.5) & (row <= h - 0.5)
            )
            if not inside.any():
                continue
            c = np.clip(col[inside], 0, w - 1)
            r = np.clip(row[inside], 0, h - 1)
            c0 = np.minimum(np.floor(c).astype(int), w - 2)
            r0 = np.minimum(np.floor(r).astype(int), h - 2)
            fc, fr = c - c0, r - r0
            z = t.z
            out[inside] = (
                z[r0, c0] * (1 - fc) * (1 - fr)
                + z[r0, c0 + 1] * fc * (1 - fr)
                + z[r0 + 1, c0] * (1 - fc) * fr
                + z[r0 + 1, c0 + 1] * fc * fr
            )
        return out


def read_tile(data: bytes | Path) -> Tile:
    """GeoTIFF z WCS GUGiK -> Tile (położenie z tagów ModelTiepoint / ModelPixelScale)."""
    source = io.BytesIO(data) if isinstance(data, bytes) else data
    with tifffile.TiffFile(source) as tif:
        page = tif.pages[0]
        z = page.asarray().astype(np.float64)
        # tagi TIFF 33922 (ModelTiepoint) i 33550 (ModelPixelScale) - czytane wprost, bo
        # `geotiff_tags` wymaga pełnego katalogu kluczy GeoTIFF
        tie_tag, scale_tag = page.tags.get(33922), page.tags.get(33550)
        tie = tie_tag.value if tie_tag else None
        scale = scale_tag.value if scale_tag else None
    if not tie or not scale:
        raise ValueError("GeoTIFF bez georeferencji (ModelTiepoint/ModelPixelScale)")
    z[(z < -1000) | (z > 3000)] = np.nan  # nodata (np. -9999)
    return Tile(z=z, left=float(tie[3]), top=float(tie[4]), res=float(scale[0]))


def nmt_dir(city: CityConfig) -> Path:
    return get_settings().data_dir / "raw" / "nmt" / city.id


def city_extent_pl1992(city: CityConfig) -> tuple[float, float, float, float]:
    s, w, n, e = city.area_bbox
    xs, ys = _TO_PL1992.transform([w, e, w, e], [s, s, n, n])
    return min(xs) - MARGIN_M, min(ys) - MARGIN_M, max(xs) + MARGIN_M, max(ys) + MARGIN_M


def download_nmt(city: CityConfig, out_dir: Path | None = None) -> list[Path]:
    """Pobiera brakujące kafle NMT dla obszaru miasta. Zwraca wszystkie kafle obszaru."""
    out_dir = out_dir or nmt_dir(city)
    out_dir.mkdir(parents=True, exist_ok=True)
    x0, y0, x1, y1 = city_extent_pl1992(city)
    paths: list[Path] = []
    with httpx.Client(timeout=120) as client:
        for tx in range(int(x0 // TILE_M), int(x1 // TILE_M) + 1):
            for ty in range(int(y0 // TILE_M), int(y1 // TILE_M) + 1):
                path = out_dir / f"nmt_{tx * TILE_M}_{ty * TILE_M}.tif"
                paths.append(path)
                if path.exists():
                    continue
                left, bottom = tx * TILE_M, ty * TILE_M
                response = client.get(
                    WCS_URL,
                    params=[
                        ("SERVICE", "WCS"),
                        ("VERSION", "2.0.1"),
                        ("REQUEST", "GetCoverage"),
                        ("COVERAGEID", COVERAGE_ID),
                        ("FORMAT", "image/tiff"),
                        # w tej usłudze x = easting, y = northing (sprawdzone na Wawelu: ~225 m)
                        ("SUBSET", f"x({left},{left + TILE_M})"),
                        ("SUBSET", f"y({bottom},{bottom + TILE_M})"),
                    ],
                )
                response.raise_for_status()
                if not response.headers.get("content-type", "").startswith("image"):
                    raise ValueError(f"WCS GUGiK nie zwrócił obrazu: {response.text[:200]}")
                read_tile(response.content)  # walidacja przed zapisem
                path.write_bytes(response.content)
                logger.info("NMT: pobrano %s", path.name)
    return paths


def load_grid(paths: Iterable[Path]) -> ElevationGrid:
    return ElevationGrid([read_tile(p) for p in paths])


# --------------------------------------------------------------------------------------
# Nachylenie krawędzi
# --------------------------------------------------------------------------------------


def _osm_numeric_incline(data: dict[str, Any]) -> bool:
    raw = tag(data, "incline")
    if not isinstance(raw, str):
        return False
    try:
        float(raw.strip().rstrip("%").replace(",", "."))
    except ValueError:
        return False
    return True


def _skip(data: dict[str, Any]) -> bool:
    if tag(data, "highway") == "steps":
        return True
    return any(tag(data, key) not in (None, "no") for key in ("bridge", "tunnel"))


def _densify(east: np.ndarray, north: np.ndarray, step: float) -> tuple[np.ndarray, np.ndarray]:
    """Punkty co `step` m wzdłuż łamanej + odległości od początku."""
    seg = np.hypot(np.diff(east), np.diff(north))
    dist = np.concatenate([[0.0], np.cumsum(seg)])
    total = dist[-1]
    if total == 0:
        return np.array([0.0]), np.array([[east[0], north[0]]])
    at = np.linspace(0.0, total, max(2, math.ceil(total / step) + 1))
    return at, np.column_stack([np.interp(at, dist, east), np.interp(at, dist, north)])


def edge_incline(coords: list[tuple[float, float]], sampler: Sampler) -> float | None:
    """Najbardziej strome ~10 m odcinka [%] ze znakiem (u -> v); None, gdy brak danych.

    Bez obcinania - wartości > 30% obsługuje `add_inclines`.

    `coords` to geometria krawędzi [(lon, lat), ...] w kierunku u -> v.
    """
    lon, lat = np.array(coords, dtype=float).T
    east, north = _TO_PL1992.transform(lon, lat)
    dist, pts = _densify(np.asarray(east), np.asarray(north), SAMPLE_STEP_M)
    length = dist[-1]
    if length < MIN_EDGE_M:
        return None
    z = sampler(pts[:, 0], pts[:, 1])
    # Pojedyncze piksele bez danych (dziury w NMT) pomijamy - liczymy z punktów, które są.
    # Inaczej jedna dziura robiła z całego odcinka "brak danych", czyli dla routera "płasko".
    valid = ~np.isnan(z)
    if valid.sum() < 2 or dist[valid][-1] - dist[valid][0] < MIN_EDGE_M:
        return None
    dist, z = dist[valid], z[valid]
    length = dist[-1] - dist[0]
    window = min(WINDOW_M, length)
    best = 0.0
    for i in range(len(dist)):
        j = int(np.searchsorted(dist, dist[i] + window - 1e-6))
        if j >= len(dist):
            break
        grade = (z[j] - z[i]) / (dist[j] - dist[i]) * 100
        if abs(grade) > abs(best):
            best = grade
    return round(float(best), 1)


def _edge_coords(graph: nx.MultiDiGraph, u: int, v: int, data: dict[str, Any]):
    start = (graph.nodes[u]["x"], graph.nodes[u]["y"])
    end = (graph.nodes[v]["x"], graph.nodes[v]["y"])
    geometry = data.get("geometry")
    if geometry is None or not hasattr(geometry, "coords"):
        return [start, end]
    coords = list(geometry.coords)
    # geometria bywa zapisana odwrotnie do kierunku krawędzi - znak nachylenia musi być u -> v
    if math.dist(coords[0], start) > math.dist(coords[-1], start):
        coords.reverse()
    return coords


def add_inclines(graph: nx.MultiDiGraph, sampler: Sampler) -> dict[str, int]:
    """Uzupełnia `incline_percent` + `incline_source="nmt"` krawędzi i `elevation` węzłów."""
    stats = {"nmt": 0, "capped": 0, "osm": 0, "skipped": 0, "no_data": 0}

    nodes = list(graph.nodes)
    if nodes:
        xs = np.array([graph.nodes[n]["x"] for n in nodes])
        ys = np.array([graph.nodes[n]["y"] for n in nodes])
        east, north = _TO_PL1992.transform(xs, ys)
        for n, z in zip(nodes, sampler(np.asarray(east), np.asarray(north)), strict=True):
            if not np.isnan(z):
                graph.nodes[n]["elevation"] = round(float(z), 2)

    for u, v, data in graph.edges(data=True):
        # ponowne uruchomienie: stare wartości z NMT liczymy od nowa
        if data.get("incline_source") == "nmt":
            for key in ("incline_percent", "incline_source", "incline_note"):
                data.pop(key, None)
        if _osm_numeric_incline(data):
            stats["osm"] += 1
            continue
        if _skip(data):
            stats["skipped"] += 1
            continue
        incline = edge_incline(_edge_coords(graph, u, v, data), sampler)
        if incline is None:
            stats["no_data"] += 1
            continue
        if abs(incline) > MAX_VALID_PERCENT:
            # nie "brak danych" (= przejezdne), tylko maksymalnie stromo - profile tego nie przejdą
            incline = math.copysign(MAX_VALID_PERCENT, incline)
            data["incline_note"] = STEEP_NOTE
            stats["capped"] += 1
        data["incline_percent"] = incline
        data["incline_source"] = "nmt"
        stats["nmt"] += 1
    return stats


def add_inclines_from_nmt(graph: nx.MultiDiGraph, city: CityConfig) -> nx.MultiDiGraph:
    """Krok budowy grafu: NMT z dysku albo z WCS. Bez NMT graf zostaje bez zmian (z logiem)."""
    try:
        paths = download_nmt(city)
        stats = add_inclines(graph, load_grid(paths).sample)
    except (httpx.HTTPError, OSError, ValueError) as exc:
        logger.warning("Nachylenie z NMT pominięte (%s) - graf bez incline z NMT", exc)
        return graph
    logger.info("Nachylenie z NMT: %s", stats)
    return graph


def main(argv: list[str] | None = None) -> int:
    import osmnx as ox

    from app.cities import get_city
    from app.routing.graph import graph_cache_path
    from app.seed import _gzip_copy, seed_dir

    parser = argparse.ArgumentParser(description="Nachylenie krawędzi grafu z NMT GUGiK")
    parser.add_argument("--city", default=get_settings().default_city)
    parser.add_argument(
        "--update-seed", action="store_true", help="zapisz też snapshot data/seed/<miasto>/"
    )
    args = parser.parse_args(argv)
    logging.basicConfig(level=logging.INFO, format="%(message)s")

    city = get_city(args.city)
    path = graph_cache_path(city)
    if not path.exists():
        logger.error("Brak grafu %s - najpierw `make seed`", path)
        return 1
    graph = ox.load_graphml(path)
    stats = add_inclines(graph, load_grid(download_nmt(city)).sample)
    logger.info("Krawędzie: %s", stats)
    ox.save_graphml(graph, path)
    logger.info("Zapisano %s", path)
    if args.update_seed:
        target = seed_dir(city.id) / "graph.graphml.gz"
        _gzip_copy(path, target)
        logger.info("Snapshot: %s", target)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
