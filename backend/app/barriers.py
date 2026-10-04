"""Bariery dla warstwy mapy i listy tekstowej: odcinki z `segments` + potwierdzone zgłoszenia.

Reguły (co jest barierą) są w `routing/planner.py:edge_barriers` - te same co dla trasy.
"""

from typing import Any

from app.cities import CityConfig
from app.db.tables import SegmentRow
from app.models import Barrier, BarrierType, LatLon, Place, Report
from app.models.barrier import BarrierReport
from app.routing.planner import edge_barriers

Coords = list[tuple[float, float]]
TYPE_ORDER = list(BarrierType)


def segment_edge(row: SegmentRow) -> dict[str, Any]:
    """Atrybuty odcinka z bazy w kształcie krawędzi grafu (klucze jak w `edge_barriers`)."""
    edge: dict[str, Any] = {"highway": row.highway, "length": row.length_m}
    for attribute in row.attributes:
        edge[attribute.key] = (attribute.value or {}).get("v")
    return edge


def segment_barrier(row: SegmentRow, coords: Coords) -> Barrier | None:
    """Jedna bariera na odcinek (typ = najważniejsza), opis wymienia wszystkie."""
    found = edge_barriers(segment_edge(row))
    if not found or not coords:
        return None
    geometry = [LatLon(lat=lat, lon=lon) for lon, lat in coords]
    source = row.attributes[0] if row.attributes else None
    verified = [a.last_verified for a in row.attributes if a.last_verified]
    return Barrier(
        id=f"segment:{row.id}",
        type=found[0].type,
        description="; ".join(b.description for b in found),
        street=row.name,
        location=geometry[len(geometry) // 2],
        geometry=geometry,
        length_m=row.length_m,
        source=source.source if source else "osm",
        source_ref=source.source_ref if source else None,
        confidence=row.confidence,
        last_verified=max(verified) if verified else None,
    )


def report_barrier(place: Place, report: Report | None = None) -> Barrier:
    """Zgłoszenie (provider `user_reports`) jako bariera-punkt; `report` dodaje stan głosowania."""
    attribute = place.attributes[0]
    votes = None
    if report is not None:
        votes = BarrierReport(
            report_id=report.id,
            status=report.status,
            confirmations=report.confirmations,
            denials=report.denials,
        )
    return Barrier(
        id=place.id,
        type=BarrierType.REPORTED,
        description=place.name or "Zgłoszona bariera",
        location=place.location,
        geometry=[place.location],
        source=attribute.provenance.source,
        source_ref=attribute.provenance.source_ref,
        confidence=attribute.confidence,
        last_verified=attribute.provenance.last_verified,
        report=votes,
    )


def _name_unnamed(city: CityConfig, barriers: list[Barrier]) -> None:
    """Schody i chodniki rzadko mają nazwę w OSM - bierzemy najbliższą ulicę, jak w opisie trasy."""
    from app.routing.graph import get_city_graph

    try:
        graph = get_city_graph(city)
    except Exception:
        return  # bez grafu zostają bez nazwy
    for barrier in barriers:
        if barrier.street is None:
            barrier.street = graph.nearby_name(barrier.location.lat, barrier.location.lon)


def _in_bbox(point: LatLon, bbox: tuple[float, float, float, float]) -> bool:
    s, w, n, e = bbox
    return s <= point.lat <= n and w <= point.lon <= e


def barriers_in_bbox(
    city: CityConfig,
    bbox: tuple[float, float, float, float],
    types: set[BarrierType] | None = None,
) -> list[Barrier]:
    """Wszystkie bariery w obszarze: najpierw wg typu (schody, krawężnik…), potem po ulicy.

    Rzuca SQLAlchemyError, gdy baza nie odpowiada.
    """
    from app.db.segments import segments_in_bbox
    from app.providers.user_reports import UserReportsProvider, visible_reports

    # Bariera zawsze oznacza trudny odcinek (te same progi), więc filtr w SQL nic nie gubi
    rows = segments_in_bbox(city.id, bbox, difficulty="hard")
    barriers = [b for row, coords in rows if (b := segment_barrier(row, coords))]
    _name_unnamed(city, barriers)
    # niepotwierdzone też - inni mogą je potwierdzić albo powiedzieć, że problemu już nie ma (#62)
    provider = UserReportsProvider(city)
    barriers += [
        report_barrier(provider.to_place(r), r)
        for r in visible_reports(city.id)
        if _in_bbox(r.location, bbox)
    ]
    if types:
        barriers = [b for b in barriers if b.type in types]
    return sorted(barriers, key=lambda b: (TYPE_ORDER.index(b.type), b.street or "~", b.id))
