"""Graf pieszy z OSM (osmnx) i wyszukiwanie trasy.

TODO(routing):
- wzbogacić krawędzie o nachylenie (DEM), krawężniki, dane MSIP,
- tekstowy opis trasy segment po segmencie (RouteSegment.instruction),
- podpiąć pod /api/routes zamiast mocka.
"""

from pathlib import Path

import networkx as nx

from app.cities import CityConfig
from app.config import get_settings
from app.routing.profiles import RoutingProfile, edge_cost


def graph_cache_path(city: CityConfig) -> Path:
    return get_settings().data_dir / "cache" / city.id / "graph.graphml"


def load_graph(city: CityConfig) -> nx.MultiDiGraph:
    import osmnx as ox  # import leniwy: osmnx jest ciężki, a nie każdy endpoint go potrzebuje

    path = graph_cache_path(city)
    if path.exists():
        return ox.load_graphml(path)
    s, w, n, e = city.bbox
    graph = ox.graph_from_bbox((w, s, e, n), network_type=city.routing.network_type)
    path.parent.mkdir(parents=True, exist_ok=True)
    ox.save_graphml(graph, path)
    return graph


def shortest_path(
    graph: nx.MultiDiGraph, source: int, target: int, profile: RoutingProfile
) -> list[int]:
    def weight(_u: int, _v: int, edges: dict) -> float | None:
        costs = [c for e in edges.values() if (c := edge_cost(e, profile)) is not None]
        return min(costs) if costs else None

    return nx.shortest_path(graph, source, target, weight=weight)
