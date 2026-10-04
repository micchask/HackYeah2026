"""Podsumowanie braków danych na odcinkach sieci pieszej (tabela `segments`, #76).

"Brak danych" = pewność odcinka <= max_confidence. Pewność liczy ta sama reguła co w opisie
trasy (`routing/scores.py: data_confidence`): nawierzchnia znana 0.60, brak nawierzchni 0.35,
nachylenie oznaczone bez wartości -0.10. Nie wymyślamy tu nowych reguł.
"""

import math
from collections import defaultdict

from app.models import LatLon
from app.models.data_gaps import DataGapsSummary, GapArea, GapKind
from app.routing.planner import HIGHWAY_PL

# Kwadraty ~220 x 140 m (Kraków) - na tyle małe, by wskazać konkretne miejsce w terenie
CELL_DEG = 0.002
HIGHWAY_LABEL = {**HIGHWAY_PL, "corridor": "korytarz", "elevator": "winda"}
# Z reguły data_confidence: brak nawierzchni (0.35) minus nieprecyzyjne nachylenie (0.10)
NO_SURFACE_AND_INCLINE = 0.3


def _rows(city_id: str, bbox: tuple[float, float, float, float]):
    from sqlalchemy import exists, func, select

    from app.db.session import SessionLocal
    from app.db.tables import SegmentAttributeRow, SegmentRow

    s, w, n, e = bbox
    centroid = func.ST_Centroid(SegmentRow.geom)
    has_surface = exists().where(
        SegmentAttributeRow.segment_id == SegmentRow.id, SegmentAttributeRow.key == "surface"
    )
    query = (
        select(
            SegmentRow.name,
            SegmentRow.highway,
            SegmentRow.length_m,
            SegmentRow.confidence,
            has_surface.label("has_surface"),
            func.ST_Y(centroid).label("lat"),
            func.ST_X(centroid).label("lon"),
        )
        .where(SegmentRow.city == city_id)
        .where(func.ST_Intersects(SegmentRow.geom, func.ST_MakeEnvelope(w, s, e, n, 4326)))
    )
    with SessionLocal() as session:
        return session.execute(query).all()


def _nearest_street(
    cell_names: dict[tuple[int, int], dict[str, float]], cell: tuple[int, int]
) -> str | None:
    """Najdłuższa nazwana ulica w kwadracie, a gdy brak - w sąsiednich (chodniki w OSM
    zwykle nie mają nazwy, nazwę ma ulica obok)."""
    for ring in (0, 1):
        totals: dict[str, float] = defaultdict(float)
        for dlat in range(-ring, ring + 1):
            for dlon in range(-ring, ring + 1):
                for name, length in cell_names.get((cell[0] + dlat, cell[1] + dlon), {}).items():
                    totals[name] += length
        if totals:
            return max(totals, key=totals.__getitem__)
    return None


def summarize(rows, max_confidence: float, top: int) -> DataGapsSummary:
    """Czysta funkcja na wierszach (name, highway, length_m, confidence, has_surface, lat, lon)."""
    total = gap = no_surface = imprecise = 0.0
    gap_count = 0
    by_kind: dict[str | None, float] = defaultdict(float)
    cell_gap: dict[tuple[int, int], list[float]] = defaultdict(lambda: [0.0, 0, 0.0, 0.0])
    cell_names: dict[tuple[int, int], dict[str, float]] = defaultdict(lambda: defaultdict(float))

    for r in rows:
        cell = (math.floor(r.lat / CELL_DEG), math.floor(r.lon / CELL_DEG))
        total += r.length_m
        if r.name:
            cell_names[cell][r.name] += r.length_m
        if r.confidence > max_confidence:
            continue
        gap += r.length_m
        gap_count += 1
        by_kind[r.highway] += r.length_m
        if not r.has_surface:
            no_surface += r.length_m
        if r.confidence < NO_SURFACE_AND_INCLINE:
            imprecise += r.length_m
        acc = cell_gap[cell]
        acc[0] += r.length_m
        acc[1] += 1
        acc[2] += r.lat * r.length_m
        acc[3] += r.lon * r.length_m

    areas = []
    for cell, (length, count, lat_w, lon_w) in sorted(
        cell_gap.items(), key=lambda item: item[1][0], reverse=True
    )[:top]:
        street = _nearest_street(cell_names, cell)
        center = LatLon(lat=round(lat_w / length, 6), lon=round(lon_w / length, 6))
        areas.append(
            GapArea(
                label=f"okolice: {street}" if street else f"okolice {center.lat}, {center.lon}",
                center=center,
                gap_length_m=round(length, 1),
                segments=count,
            )
        )

    return DataGapsSummary(
        max_confidence=max_confidence,
        total_length_m=round(total, 1),
        gap_length_m=round(gap, 1),
        gap_share=round(gap / total, 3) if total else 0.0,
        gap_segments=gap_count,
        no_surface_m=round(no_surface, 1),
        imprecise_incline_m=round(imprecise, 1),
        by_kind=[
            GapKind(
                highway=h,
                label=HIGHWAY_LABEL.get(h or "", h or "inna droga"),
                gap_length_m=round(m, 1),
            )
            for h, m in sorted(by_kind.items(), key=lambda item: item[1], reverse=True)
        ],
        areas=areas,
    )


def data_gaps(
    city_id: str, bbox: tuple[float, float, float, float], max_confidence: float, top: int
) -> DataGapsSummary:
    """Rzuca SQLAlchemyError, gdy baza nie odpowiada."""
    return summarize(_rows(city_id, bbox), max_confidence, top)
