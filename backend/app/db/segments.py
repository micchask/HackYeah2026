"""Zapis grafu pieszego do tabeli `segments` (PostGIS).

Z tabeli korzystają mapa barier (#27), dashboard miasta (#30) i mapa braków danych (#31).
Reguły trudności i pewności są te same co w opisie trasy - importujemy je, nie kopiujemy.
"""

from collections.abc import Iterator
from datetime import UTC, datetime
from typing import Any

import networkx as nx

from app.cities import CityConfig
from app.db.tables import SegmentAttributeRow, SegmentRow
from app.models import AttributeKey, AttributeStatus
from app.normalization.merge import STALE_AFTER, STALE_PENALTY
from app.providers.osm import OsmProvider
from app.routing.planner import edge_difficulty, graph_fetched_at, last_verified
from app.routing.profiles import incline_percent, is_steps, kerb_cm, tag
from app.routing.scores import data_confidence

Edge = tuple[int, int, int, dict[str, Any]]


def _int(value: Any) -> int | None:
    try:
        return int(str(value).strip())
    except (TypeError, ValueError):
        return None


def _width_cm(value: Any) -> float | None:
    """OSM `width` jest w metrach, np. "1.5" albo "1,5 m"."""
    if value is None:
        return None
    try:
        return round(float(str(value).replace(",", ".").removesuffix("m").strip()) * 100, 1)
    except ValueError:
        return None


def edge_attributes(data: dict[str, Any]) -> list[tuple[AttributeKey, bool | int | float | str]]:
    """Cechy dostępności krawędzi z tagów OSM (tylko te, które są w danych)."""
    attrs: list[tuple[AttributeKey, bool | int | float | str]] = []
    if surface := tag(data, "surface"):
        attrs.append((AttributeKey.SURFACE, str(surface)))
    if is_steps(data):
        attrs.append((AttributeKey.STAIRS, True))
    if (steps := _int(tag(data, "step_count"))) is not None:
        attrs.append((AttributeKey.STEP_COUNT, steps))
    if (incline := incline_percent(data)) is not None:
        attrs.append((AttributeKey.INCLINE_PERCENT, incline))
    if (kerb := kerb_cm(data)) is not None:
        attrs.append((AttributeKey.KERB_HEIGHT_CM, kerb))
    if (width := _width_cm(tag(data, "width"))) is not None:
        attrs.append((AttributeKey.WIDTH_CM, width))
    ramp = tag(data, "ramp:wheelchair") or tag(data, "ramp")
    if ramp in ("yes", "no"):
        attrs.append((AttributeKey.RAMP, ramp == "yes"))
    if (tactile := tag(data, "tactile_paving")) in ("yes", "no"):
        attrs.append((AttributeKey.TACTILE_PAVING, tactile == "yes"))
    if wheelchair := tag(data, "wheelchair"):
        attrs.append((AttributeKey.WHEELCHAIR, str(wheelchair)))
    return attrs


def edge_to_rows(
    u: int,
    v: int,
    key: int,
    data: dict[str, Any],
    *,
    city_id: str,
    fetched_at: datetime,
    endpoints: list[tuple[float, float]] | None = None,
) -> SegmentRow:
    """Krawędź grafu -> wiersz `segments` z atrybutami. Bez bazy: tylko buduje obiekty ORM.

    `endpoints` ([lon, lat] węzłów u i v) służą za geometrię, gdy krawędź nie ma własnej.
    """
    geometry = data.get("geometry")
    coords = list(geometry.coords) if hasattr(geometry, "coords") else list(endpoints or [])
    if len(coords) < 2:
        raise ValueError(f"Krawędź {u}-{v}-{key} nie ma geometrii")

    osm_way_id = _int(tag(data, "osmid"))
    verified = last_verified([data])
    stale = verified is not None and fetched_at - verified > STALE_AFTER
    confidence = OsmProvider.base_confidence * (STALE_PENALTY if stale else 1.0)

    name = tag(data, "name")
    highway = tag(data, "highway")
    return SegmentRow(
        id=f"{u}-{v}-{key}",
        city=city_id,
        u=u,
        v=v,
        osm_way_id=osm_way_id,
        name=str(name) if name else None,
        highway=str(highway) if highway else None,
        length_m=round(float(data.get("length", 0.0)), 2),
        difficulty=edge_difficulty(data).value,
        confidence=data_confidence([data]),
        geom="SRID=4326;LINESTRING(" + ", ".join(f"{x} {y}" for x, y in coords) + ")",
        attributes=[
            SegmentAttributeRow(
                key=attr_key.value,
                value={"v": value},
                source=OsmProvider.name,
                source_type=OsmProvider.source_type.value,
                source_ref=f"way/{osm_way_id}" if osm_way_id else None,
                fetched_at=fetched_at,
                last_verified=verified,
                confidence=round(confidence, 3),
                status=(AttributeStatus.OUTDATED if stale else AttributeStatus.UNVERIFIED).value,
            )
            for attr_key, value in edge_attributes(data)
        ],
    )


def unique_edges(graph: nx.MultiDiGraph) -> Iterator[Edge]:
    """Każda ulica raz: graf pieszy ma krawędzie w obie strony, zostawiamy tę z u < v."""
    for u, v, key, data in graph.edges(keys=True, data=True):
        if u < v or u == v or not graph.has_edge(v, u):
            yield u, v, key, data


Coords = list[tuple[float, float]]


def segments_in_bbox(
    city_id: str,
    bbox: tuple[float, float, float, float],
    *,
    difficulty: str | None = None,
    max_confidence: float | None = None,
    limit: int | None = None,
) -> list[tuple[SegmentRow, Coords]]:
    """Odcinki przecinające bbox (s, w, n, e) z atrybutami i geometrią [lon, lat].

    Rzuca SQLAlchemyError, gdy baza nie odpowiada.
    """
    import json

    from sqlalchemy import func, select
    from sqlalchemy.orm import selectinload

    from app.db.session import SessionLocal

    s, w, n, e = bbox
    query = (
        select(SegmentRow, func.ST_AsGeoJSON(SegmentRow.geom))
        .where(SegmentRow.city == city_id)
        .where(func.ST_Intersects(SegmentRow.geom, func.ST_MakeEnvelope(w, s, e, n, 4326)))
        .options(selectinload(SegmentRow.attributes))
        .order_by(SegmentRow.id)
    )
    if difficulty is not None:
        query = query.where(SegmentRow.difficulty == difficulty)
    if max_confidence is not None:
        query = query.where(SegmentRow.confidence <= max_confidence)
    if limit is not None:
        query = query.limit(limit)
    with SessionLocal() as session:
        return [
            (row, [tuple(p) for p in json.loads(geojson)["coordinates"]])
            for row, geojson in session.execute(query).all()
        ]


def save_graph_to_db(city: CityConfig) -> int:
    """Zapisuje graf miasta (z cache / snapshotu) do `segments`. Zwraca liczbę odcinków."""
    from sqlalchemy import delete

    from app.db.session import SessionLocal, init_db
    from app.routing.graph import load_graph

    init_db()
    graph = load_graph(city)
    fetched_at = graph_fetched_at(graph.graph) or datetime.now(UTC)

    def endpoints(u: int, v: int) -> list[tuple[float, float]]:
        return [(graph.nodes[n]["x"], graph.nodes[n]["y"]) for n in (u, v)]

    rows = [
        edge_to_rows(
            u, v, key, data, city_id=city.id, fetched_at=fetched_at, endpoints=endpoints(u, v)
        )
        for u, v, key, data in unique_edges(graph)
    ]
    with SessionLocal.begin() as session:
        # atrybuty znikają razem z odcinkami (ON DELETE CASCADE)
        session.execute(delete(SegmentRow).where(SegmentRow.city == city.id))
        session.add_all(rows)
    return len(rows)
