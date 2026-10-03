"""Nachylenie z NMT (#10) - bez sieci: syntetyczny teren zamiast rastra GUGiK."""

import io

import networkx as nx
import numpy as np
import pytest
import tifffile
from shapely.geometry import LineString

from app.routing import elevation as el
from app.routing.planner import segment_sources

# Punkt odniesienia w Krakowie i kierunki w układzie PL-1992 (metry)
LON0, LAT0 = 19.9373, 50.0617
E0, N0 = el._TO_PL1992.transform(LON0, LAT0)
_TO_WGS84 = el.Transformer.from_crs("EPSG:2180", "EPSG:4326", always_xy=True)


def lonlat(de: float, dn: float) -> tuple[float, float]:
    """Punkt przesunięty o `de` m na wschód i `dn` m na północ."""
    return _TO_WGS84.transform(E0 + de, N0 + dn)


def plane(slope_north: float):
    """Teren nachylony na północ: z = slope * (N - N0)."""
    return lambda east, north: (np.asarray(north) - N0) * slope_north


def test_uniform_slope_and_direction():
    north = [lonlat(0, 0), lonlat(0, 100)]
    assert el.edge_incline(north, plane(0.05)) == pytest.approx(5.0, abs=0.1)
    # w drugą stronę: zjazd
    assert el.edge_incline(north[::-1], plane(0.05)) == pytest.approx(-5.0, abs=0.1)


def test_steepest_spot_not_average():
    # 200 m prawie płasko, w środku 20 m po 12% - średnia ok. 1,2%, ale dla wózka liczy się 12%
    def bump(east, north):
        d = np.asarray(north) - N0
        return np.clip(d - 90, 0, 20) * 0.12

    edge = [lonlat(0, 0), lonlat(0, 200)]
    assert el.edge_incline(edge, bump) == pytest.approx(12.0, abs=0.5)


def test_short_edges_and_missing_data_give_none():
    assert el.edge_incline([lonlat(0, 0), lonlat(0, 3)], plane(0.05)) is None
    nothing = lambda east, north: np.full(np.shape(east), np.nan)  # noqa: E731
    assert el.edge_incline([lonlat(0, 0), lonlat(0, 50)], nothing) is None


def test_single_nan_sample_does_not_hide_slope():
    def holey(east, north):
        z = plane(0.08)(east, north)
        z[len(z) // 2] = np.nan
        return z

    assert el.edge_incline([lonlat(0, 0), lonlat(0, 50)], holey) == pytest.approx(8.0, abs=0.2)


def _graph(edges: dict[tuple[int, int], dict]) -> nx.MultiDiGraph:
    g = nx.MultiDiGraph()
    pts = {1: lonlat(0, 0), 2: lonlat(0, 100), 3: lonlat(100, 0)}
    for n, (x, y) in pts.items():
        g.add_node(n, x=x, y=y)
    for (u, v), data in edges.items():
        g.add_edge(u, v, length=100.0, **data)
    return g


def test_add_inclines_rules():
    g = _graph(
        {
            (1, 2): {"highway": "footway"},
            (2, 1): {"highway": "footway", "geometry": LineString([lonlat(0, 0), lonlat(0, 100)])},
            (1, 3): {"highway": "steps"},
            (3, 1): {"highway": "footway", "bridge": "yes"},
            (2, 3): {"highway": "footway", "incline": "8%"},
        }
    )
    stats = el.add_inclines(g, plane(0.05))

    assert g[1][2][0]["incline_percent"] == pytest.approx(5.0, abs=0.1)
    assert g[1][2][0]["incline_source"] == "nmt"
    # geometria zapisana "pod prąd" - znak liczony w kierunku krawędzi 2 -> 1 (zjazd)
    assert g[2][1][0]["incline_percent"] == pytest.approx(-5.0, abs=0.1)
    # schody i mosty pomijamy, liczbowy tag OSM ma pierwszeństwo
    assert "incline_percent" not in g[1][3][0]
    assert "incline_percent" not in g[3][1][0]
    assert "incline_percent" not in g[2][3][0]
    assert stats == {"nmt": 2, "capped": 0, "osm": 1, "skipped": 2, "no_data": 0}
    assert g.nodes[2]["elevation"] == pytest.approx(5.0, abs=0.01)


def test_very_steep_is_capped_not_dropped():
    # >30% to nie "brak danych" (= przejezdne), tylko maksymalnie stromo z adnotacją
    g = _graph({(1, 2): {"highway": "path"}})
    el.add_inclines(g, plane(0.5))
    data = g[1][2][0]
    assert data["incline_percent"] == el.MAX_VALID_PERCENT
    assert data["incline_note"] == el.STEEP_NOTE


def test_rerun_clears_old_nmt_values():
    g = _graph({(1, 2): {"highway": "footway"}})
    el.add_inclines(g, plane(0.05))
    nothing = lambda east, north: np.full(np.shape(east), np.nan)  # noqa: E731
    el.add_inclines(g, nothing)
    assert "incline_percent" not in g[1][2][0]


def _geotiff(z: np.ndarray, left: float, top: float) -> bytes:
    buf = io.BytesIO()
    tifffile.imwrite(
        buf,
        z.astype(np.float32),
        extratags=[
            (33550, "d", 3, (1.0, 1.0, 0.0), False),  # ModelPixelScale
            (33922, "d", 6, (0.0, 0.0, 0.0, left, top, 0.0), False),  # ModelTiepoint
        ],
    )
    return buf.getvalue()


def test_read_tile_and_bilinear_sample_across_tile_seam():
    # dwa kafle 4x4 m stykające się na E=104: wysokość = wschód w metrach od E=100
    cols = np.arange(4) + 0.5
    west = el.read_tile(_geotiff(np.tile(cols, (4, 1)), left=100.0, top=204.0))
    east = el.read_tile(_geotiff(np.tile(cols + 4, (4, 1)), left=104.0, top=204.0))
    grid = el.ElevationGrid([west, east])

    z = grid.sample(np.array([101.0, 103.9, 104.1, 106.0, 99.0]), np.full(5, 202.0))
    assert z[0] == pytest.approx(1.0)
    # na styku kafli (pół piksela przy brzegu) też są dane - bez szczeliny
    assert not np.isnan(z[1]) and not np.isnan(z[2])
    assert z[3] == pytest.approx(6.0)
    assert np.isnan(z[4])  # poza kaflami


def test_segment_sources_mentions_nmt():
    assert segment_sources([{"incline_source": "nmt"}]) == ["OpenStreetMap", "NMT GUGiK"]
    assert segment_sources([{}]) == ["OpenStreetMap"]
