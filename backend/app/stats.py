"""Statystyki miasta dla dashboardu (#30): pokrycie danymi, bariery, zgłoszenia, priorytety.

Bez nowych reguł: bariery liczy to samo co `/api/barriers`, braki danych to samo co
`/api/data-gaps`, zgłoszenia pochodzą z magazynu zgłoszeń (#29).
"""

from collections import Counter, defaultdict
from datetime import UTC, datetime

from app.models import Barrier, BarrierType, Report, ReportStatus, ReportType
from app.models.stats import (
    BarrierCount,
    CityStats,
    Coverage,
    PriorityStreet,
    ReportStatusCount,
    ReportTypeCount,
)

# Cechy, których pokrycie pokazujemy (kolejność = kolejność na dashboardzie)
COVERAGE_KEYS = ["surface", "incline_percent", "width_cm", "kerb_height_cm"]

# Waga bariery w rankingu ulic: to, co zatrzymuje wózek całkiem (schody, krawężnik, potwierdzone
# zgłoszenie), waży więcej niż to, co tylko utrudnia (stromo, bruk). Jawna i prosta - do dyskusji
# z miastem, nie ukryty algorytm.
PRIORITY_WEIGHTS: dict[BarrierType, int] = {
    BarrierType.STAIRS: 3,
    BarrierType.KERB: 3,
    BarrierType.REPORTED: 3,
    BarrierType.STEEP: 2,
    BarrierType.ROUGH_SURFACE: 1,
}


def priority_streets(barriers: list[Barrier], top: int = 10) -> list[PriorityStreet]:
    """Ulice z największą sumą wag barier. Bariery bez nazwy ulicy pomijamy."""
    by_street: dict[str, Counter[BarrierType]] = defaultdict(Counter)
    for barrier in barriers:
        if barrier.street:
            by_street[barrier.street][barrier.type] += 1
    ranked = [
        PriorityStreet(
            street=street,
            score=sum(PRIORITY_WEIGHTS[t] * n for t, n in counts.items()),
            barriers=sum(counts.values()),
            by_type=dict(counts),
        )
        for street, counts in by_street.items()
    ]
    ranked.sort(key=lambda s: (-s.score, -s.barriers, s.street))
    return ranked[:top]


def barrier_counts(barriers: list[Barrier]) -> list[BarrierCount]:
    count: Counter[BarrierType] = Counter()
    length: dict[BarrierType, float] = defaultdict(float)
    for barrier in barriers:
        count[barrier.type] += 1
        length[barrier.type] += barrier.length_m or 0.0
    return [
        BarrierCount(type=t, count=n, length_m=round(length[t], 1))
        for t, n in sorted(count.items(), key=lambda item: -item[1])
    ]


def report_counts(
    reports: list[Report],
) -> tuple[list[ReportStatusCount], list[ReportTypeCount]]:
    """Wszystkie statusy i typy, także z zerem - dashboard pokazuje pełny obraz."""
    statuses = Counter(r.status for r in reports)
    types = Counter(r.type for r in reports)
    return (
        [ReportStatusCount(status=s, count=statuses[s]) for s in ReportStatus],
        [ReportTypeCount(type=t, count=types[t]) for t in ReportType],
    )


def build_stats(
    city: str,
    network_length_m: float,
    network_segments: int,
    coverage_m: dict[str, tuple[float, list[str]]],
    gap_length_m: float,
    barriers: list[Barrier],
    reports: list[Report] | None,
) -> CityStats:
    """Czysta funkcja: liczby z bazy -> odpowiedź API (test bez bazy)."""

    def share(meters: float) -> float:
        return round(meters / network_length_m, 3) if network_length_m else 0.0

    by_status, by_type = report_counts(reports or [])
    coverage = []
    for key in COVERAGE_KEYS:
        meters, sources = coverage_m.get(key, (0.0, []))
        coverage.append(
            Coverage(key=key, sources=sources, length_m=round(meters, 1), share=share(meters))
        )
    return CityStats(
        city=city,
        generated_at=datetime.now(UTC),
        network_length_m=round(network_length_m, 1),
        network_segments=network_segments,
        coverage=coverage,
        gap_length_m=round(gap_length_m, 1),
        gap_share=share(gap_length_m),
        barriers_total=len(barriers),
        barriers_by_type=barrier_counts(barriers),
        priority_weights=PRIORITY_WEIGHTS,
        priority_streets=priority_streets(barriers),
        reports_total=None if reports is None else len(reports),
        reports_by_status=by_status,
        reports_by_type=by_type,
    )


def network_coverage(
    city_id: str, bbox: tuple[float, float, float, float]
) -> tuple[float, int, dict[str, tuple[float, list[str]]]]:
    """(długość sieci, liczba odcinków, cecha -> (długość z tą cechą, źródła)).

    Rzuca SQLAlchemyError, gdy baza nie odpowiada.
    """
    from sqlalchemy import func, select

    from app.db.session import SessionLocal
    from app.db.tables import SegmentAttributeRow, SegmentRow

    s, w, n, e = bbox
    in_area = (
        SegmentRow.city == city_id,
        func.ST_Intersects(SegmentRow.geom, func.ST_MakeEnvelope(w, s, e, n, 4326)),
    )
    with SessionLocal() as session:
        total, count = session.execute(
            select(func.coalesce(func.sum(SegmentRow.length_m), 0), func.count()).where(*in_area)
        ).one()
        rows = session.execute(
            select(
                SegmentAttributeRow.key,
                SegmentAttributeRow.source,
                SegmentRow.id,
                SegmentRow.length_m,
            )
            .join(SegmentRow, SegmentRow.id == SegmentAttributeRow.segment_id)
            .where(*in_area, SegmentAttributeRow.key.in_(COVERAGE_KEYS))
        ).all()

    # Odcinek z cechą liczymy raz, nawet gdy ma ją kilka źródeł
    lengths: dict[str, dict[str, float]] = defaultdict(dict)
    sources: dict[str, set[str]] = defaultdict(set)
    for key, source, segment_id, length_m in rows:
        lengths[key][segment_id] = length_m
        sources[key].add(source)
    coverage = {key: (sum(seg.values()), sorted(sources[key])) for key, seg in lengths.items()}
    return float(total), int(count), coverage
