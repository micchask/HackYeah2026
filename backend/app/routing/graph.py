"""Graf pieszy z OSM (osmnx) i wyszukiwanie trasy.

TODO(routing):
- wzbogacić krawędzie o nachylenie (DEM), krawężniki, dane MSIP.
"""

import logging
import math
import threading
from collections.abc import Callable
from dataclasses import dataclass
from pathlib import Path
from typing import Any

import networkx as nx
import numpy as np

from app.cities import CityConfig
from app.config import get_settings
from app.routing.profiles import RoutingProfile, edge_cost

logger = logging.getLogger(__name__)

# Tagi OSM potrzebne do routingu dostępnego, zachowywane na krawędziach grafu
ACCESSIBILITY_TAGS = [
    "surface",
    "smoothness",
    "incline",
    "step_count",
    "ramp",
    "ramp:wheelchair",
    "ramp:stroller",
    "wheelchair",
    "kerb",
    "handrail",
    "lit",
    "width",
    "check_date",
]
# Węzły, w których zmieniają się te atrybuty, zostają po uproszczeniu grafu
SPLIT_ON = ["highway", "name", "surface", "incline", "ramp:stroller", "ramp:wheelchair"]
# Krawężniki są w OSM węzłami (barrier=kerb, kerb=*), nie drogami
KERB_NODE_TAGS = ["kerb", "barrier", "kerb:height"]
# Wysokość krawężnika [cm] wg tagu kerb=*; None = krawężnik jest, ale wysokość nieznana
KERB_HEIGHT_CM: dict[str, float | None] = {
    "raised": 10.0,
    "regular": 10.0,
    "rolled": 6.0,
    "lowered": 2.0,
    "flush": 0.0,
    "no": 0.0,
    "yes": None,
}


def graph_cache_path(city: CityConfig) -> Path:
    return get_settings().data_dir / "cache" / city.id / "graph.graphml"


def download_graph(city: CityConfig) -> nx.MultiDiGraph:
    import osmnx as ox  # import leniwy: osmnx jest ciężki, a nie każdy endpoint go potrzebuje

    ox.settings.cache_folder = get_settings().data_dir / "cache" / "osmnx"
    ox.settings.useful_tags_way = list(
        dict.fromkeys([*ox.settings.useful_tags_way, *ACCESSIBILITY_TAGS])
    )
    ox.settings.useful_tags_node = list(
        dict.fromkeys([*ox.settings.useful_tags_node, *KERB_NODE_TAGS])
    )
    if city.routing.overpass_url:
        ox.settings.overpass_url = city.routing.overpass_url.removesuffix("/interpreter")
    s, w, n, e = city.area_bbox
    graph = ox.graph_from_bbox((w, s, e, n), network_type=city.routing.network_type, simplify=False)
    # węzły z krawężnikiem zostają końcami krawędzi, żeby nie zniknęły przy upraszczaniu
    graph = ox.simplify_graph(
        graph, node_attrs_include=["kerb", "barrier"], edge_attrs_differ=SPLIT_ON
    )
    return add_kerbs(graph)


def kerb_height_cm(tags: dict[str, Any]) -> tuple[bool, float | None]:
    """(czy jest krawężnik, wysokość w cm). Wysokość None = krawężnik o nieznanej wysokości."""
    raw_height = tags.get("kerb:height")
    if raw_height:
        try:
            value = float(str(raw_height).replace("cm", "").replace(",", ".").strip())
            # OSM zaleca metry ("0.03"), ale bywa też "3 cm"
            return True, value * 100 if value < 1 else value
        except ValueError:
            pass
    kerb = tags.get("kerb")
    if kerb in KERB_HEIGHT_CM:
        return True, KERB_HEIGHT_CM[kerb]
    if kerb or tags.get("barrier") == "kerb":
        return True, None
    return False, None


def add_kerbs(graph: nx.MultiDiGraph) -> nx.MultiDiGraph:
    """Przenosi krawężniki z węzłów na krawędzie: `kerb_height_cm` albo `kerb_unknown`.

    Krawędź dostaje najwyższy krawężnik ze swoich końców - żeby przez niego przejść,
    trzeba wejść na któryś koniec.
    """
    kerbs = {n: kerb_height_cm(d) for n, d in graph.nodes(data=True)}
    for u, v, data in graph.edges(data=True):
        found = [kerbs[n] for n in (u, v) if kerbs[n][0]]
        if not found:
            continue
        heights = [h for _, h in found if h is not None]
        if heights:
            data["kerb_height_cm"] = max(heights)
        if len(heights) < len(found):
            data["kerb_unknown"] = "yes"
    return graph


def load_graph(city: CityConfig) -> nx.MultiDiGraph:
    import osmnx as ox

    path = graph_cache_path(city)
    if path.exists():
        return ox.load_graphml(path)
    graph = download_graph(city)
    path.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(graph, path)
    return graph


@dataclass
class CityGraph:
    graph: nx.MultiDiGraph
    node_ids: np.ndarray
    node_lat: np.ndarray
    node_lon: np.ndarray
    # środki nazwanych krawędzi - do nazywania chodników, które w OSM nie mają nazwy
    named_lat: np.ndarray
    named_lon: np.ndarray
    named: list[str]

    def nearest_node(self, lat: float, lon: float) -> tuple[int, float]:
        """Najbliższy węzeł i odległość do niego w metrach (przybliżenie równoodległościowe)."""
        i, dist = _nearest(self.node_lat, self.node_lon, lat, lon)
        return int(self.node_ids[i]), dist

    def nearby_name(self, lat: float, lon: float, max_m: float = 30) -> str | None:
        if not self.named:
            return None
        i, dist = _nearest(self.named_lat, self.named_lon, lat, lon)
        return self.named[i] if dist <= max_m else None


def _nearest(lats: np.ndarray, lons: np.ndarray, lat: float, lon: float) -> tuple[int, float]:
    k = math.cos(math.radians(lat))
    d2 = (lats - lat) ** 2 + ((lons - lon) * k) ** 2
    i = int(np.argmin(d2))
    return i, math.sqrt(float(d2[i])) * 111_320


def _build_city_graph(graph: nx.MultiDiGraph) -> CityGraph:
    from app.routing.profiles import tag

    nodes = list(graph.nodes(data=True))
    named_lat, named_lon, named = [], [], []
    for u, v, data in graph.edges(data=True):
        name = tag(data, "name")
        if not name or tag(data, "highway") == "steps":
            continue
        geom = data.get("geometry")
        if geom is not None and hasattr(geom, "coords"):
            points = list(geom.coords)
        else:
            points = [(graph.nodes[n]["x"], graph.nodes[n]["y"]) for n in (u, v)]
        # punkty pośrednie co ok. 10 m, żeby długie ulice były "widoczne" na całej długości
        for (x1, y1), (x2, y2) in zip(points, points[1:], strict=False):
            steps = max(1, int(math.hypot(x2 - x1, (y2 - y1)) * 111_320 / 10))
            for i in range(steps + 1):
                named_lon.append(x1 + (x2 - x1) * i / steps)
                named_lat.append(y1 + (y2 - y1) * i / steps)
                named.append(str(name))
    return CityGraph(
        graph=graph,
        node_ids=np.array([n for n, _ in nodes]),
        node_lat=np.array([float(d["y"]) for _, d in nodes]),
        node_lon=np.array([float(d["x"]) for _, d in nodes]),
        named_lat=np.array(named_lat, dtype=float),
        named_lon=np.array(named_lon, dtype=float),
        named=named,
    )


_GRAPHS: dict[str, CityGraph] = {}
_LOCK = threading.Lock()


def get_city_graph(city: CityConfig) -> CityGraph:
    with _LOCK:
        if city.id not in _GRAPHS:
            graph = load_graph(city)
            _GRAPHS[city.id] = _build_city_graph(graph)
            logger.info("Graf %s: %d węzłów, %d krawędzi", city.id, *_size(graph))
        return _GRAPHS[city.id]


def _size(graph: nx.MultiDiGraph) -> tuple[int, int]:
    return graph.number_of_nodes(), graph.number_of_edges()


def graph_ready(city: CityConfig) -> bool:
    return city.id in _GRAPHS


def shortest_path(
    graph: nx.MultiDiGraph, source: int, target: int, profile: RoutingProfile
) -> list[int]:
    return nx.shortest_path(graph, source, target, weight=_weight(profile))


def _weight(profile: RoutingProfile | None) -> Callable[[int, int, dict], float | None]:
    def weight(_u: int, _v: int, edges: dict) -> float | None:
        costs = [c for e in edges.values() if (c := _cost(e, profile)) is not None]
        return min(costs) if costs else None

    return weight


def _cost(edge: dict[str, Any], profile: RoutingProfile | None) -> float | None:
    return float(edge.get("length", 0.0)) if profile is None else edge_cost(edge, profile)


def shortest_walking_path(graph: nx.MultiDiGraph, source: int, target: int) -> list[int]:
    """Zwykła najkrótsza trasa piesza, bez żadnych preferencji (punkt odniesienia)."""
    return nx.shortest_path(graph, source, target, weight=_weight(None))


def path_edges(
    graph: nx.MultiDiGraph, path: list[int], profile: RoutingProfile | None
) -> list[dict[str, Any]]:
    """Krawędzie ścieżki (dla multigrafu - ta o najmniejszym koszcie), z węzłami u, v."""
    edges = []
    for u, v in zip(path, path[1:], strict=False):
        candidates = [e for e in graph[u][v].values() if _cost(e, profile) is not None] or list(
            graph[u][v].values()
        )
        best = min(candidates, key=lambda e: _cost(e, profile) or math.inf)
        edges.append({**best, "_u": u, "_v": v})
    return edges


def warm_up(city: CityConfig) -> None:
    """Ładuje graf w tle, żeby pierwsze zapytanie o trasę nie czekało na Overpass."""

    def run() -> None:
        try:
            get_city_graph(city)
        except Exception:
            logger.exception("Nie udało się załadować grafu %s", city.id)

    threading.Thread(target=run, daemon=True).start()
