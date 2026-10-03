from datetime import UTC, datetime

import networkx as nx
import pytest
from shapely.geometry import LineString

from app.api.segments import parse_bbox
from app.db.segments import edge_to_rows, unique_edges

FETCHED = datetime(2026, 10, 3, tzinfo=UTC)


def _row(data: dict, **kwargs):
    return edge_to_rows(1, 2, 0, data, city_id="krakow", fetched_at=FETCHED, **kwargs)


def test_edge_to_rows_geometry_and_attributes():
    row = _row(
        {
            "osmid": "[123, 456]",  # po uproszczeniu grafu osmnx zapisuje listę jako tekst
            "name": "Grodzka",
            "highway": "pedestrian",
            "surface": "sett",
            "width": "2,5 m",
            "incline": "8%",
            "check_date": "2026-03-07",
            "length": 41.237,
            "geometry": LineString([(19.9380, 50.0590), (19.9382, 50.0587)]),
        }
    )
    assert row.id == "1-2-0"
    assert (row.city, row.osm_way_id, row.name, row.highway) == (
        "krakow",
        123,
        "Grodzka",
        "pedestrian",
    )
    assert row.length_m == 41.24
    assert row.difficulty == "hard"  # bruk i nachylenie 8%
    assert row.confidence == 0.6
    assert row.geom == "SRID=4326;LINESTRING(19.938 50.059, 19.9382 50.0587)"

    attrs = {a.key: a for a in row.attributes}
    assert {k: a.value["v"] for k, a in attrs.items()} == {
        "surface": "sett",
        "incline_percent": 8.0,
        "width_cm": 250.0,
    }
    surface = attrs["surface"]
    assert (surface.source, surface.source_type, surface.source_ref) == ("osm", "osm", "way/123")
    assert surface.fetched_at == FETCHED
    assert surface.last_verified == datetime(2026, 3, 7, tzinfo=UTC)
    assert (surface.confidence, surface.status) == (0.6, "unverified")


def test_steps_without_geometry_use_endpoints():
    row = _row(
        {"highway": "steps", "step_count": "81", "length": 30},
        endpoints=[(19.935, 50.055), (19.936, 50.0552)],
    )
    assert row.geom == "SRID=4326;LINESTRING(19.935 50.055, 19.936 50.0552)"
    assert row.difficulty == "hard"
    assert row.confidence == 0.35  # brak nawierzchni
    assert {a.key: a.value["v"] for a in row.attributes} == {"stairs": True, "step_count": 81}


def test_old_check_date_is_outdated_with_lower_confidence():
    row = _row(
        {"surface": "asphalt", "check_date": "2019-05", "length": 10},
        endpoints=[(19.93, 50.05), (19.94, 50.06)],
    )
    [attr] = row.attributes
    assert attr.status == "outdated"
    assert attr.confidence == 0.3


def test_edge_without_geometry_and_endpoints_fails():
    with pytest.raises(ValueError):
        _row({"length": 5})


def test_unique_edges_keeps_one_direction():
    graph = nx.MultiDiGraph()
    graph.add_edge(1, 2, length=10)
    graph.add_edge(2, 1, length=10)
    graph.add_edge(3, 1, length=5)  # tylko w jedną stronę - zostaje
    graph.add_edge(4, 4, length=2)  # pętla
    assert sorted((u, v) for u, v, _k, _d in unique_edges(graph)) == [(1, 2), (3, 1), (4, 4)]


def test_parse_bbox():
    assert parse_bbox("50.045,19.928,50.066,19.95") == (50.045, 19.928, 50.066, 19.95)
    for bad in ("1,2,3", "50.066,19.928,50.045,19.95", "a,b,c,d"):
        with pytest.raises(ValueError):
            parse_bbox(bad)


def test_segments_endpoint_validation(client):
    assert client.get("/api/segments").status_code == 422  # bbox obowiązkowy
    r = client.get("/api/segments", params={"bbox": "1,2,3"})
    assert r.status_code == 422
    assert "bbox" in r.json()["detail"]
    # CI bez bazy - czytelny komunikat zamiast błędu połączenia
    r = client.get("/api/segments", params={"bbox": "50.045,19.928,50.066,19.95"})
    assert r.status_code == 503
    assert "make seed" in r.json()["detail"]
