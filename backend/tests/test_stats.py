from datetime import UTC, datetime

from app.models import Barrier, BarrierType, LatLon, Report, ReportStatus, ReportType
from app.stats import PRIORITY_WEIGHTS, build_stats, priority_streets

NOW = datetime(2026, 10, 4, tzinfo=UTC)
POINT = LatLon(lat=50.06, lon=19.94)


def barrier(type_: BarrierType, street: str | None, length_m: float = 10) -> Barrier:
    return Barrier(
        id=f"{type_}-{street}-{length_m}",
        type=type_,
        description="opis",
        street=street,
        location=POINT,
        geometry=[POINT],
        length_m=length_m,
        source="osm",
        confidence=0.6,
    )


def report(status: ReportStatus, type_: ReportType = ReportType.BARRIER) -> Report:
    return Report(
        id=f"r-{status}-{type_}",
        city="krakow",
        location=POINT,
        type=type_,
        attribute="stairs",
        value=True,
        status=status,
        created_at=NOW,
    )


BARRIERS = [
    barrier(BarrierType.ROUGH_SURFACE, "Kanonicza", 40),
    barrier(BarrierType.ROUGH_SURFACE, "Kanonicza", 30),
    barrier(BarrierType.ROUGH_SURFACE, "Kanonicza", 20),
    barrier(BarrierType.STAIRS, "Bulwar Wołyński", 5),
    barrier(BarrierType.STEEP, "Bulwar Wołyński", 50),
    barrier(BarrierType.STAIRS, None, 3),  # bez nazwy - poza rankingiem ulic
]


def test_priority_uses_weights_not_just_count():
    ranked = priority_streets(BARRIERS)

    # 1 x schody (3) + 1 x stromo (2) = 5 > 3 x bruk (3)
    assert [s.street for s in ranked] == ["Bulwar Wołyński", "Kanonicza"]
    assert (
        ranked[0].score
        == PRIORITY_WEIGHTS[BarrierType.STAIRS] + PRIORITY_WEIGHTS[BarrierType.STEEP]
    )
    assert ranked[0].by_type == {BarrierType.STAIRS: 1, BarrierType.STEEP: 1}
    assert ranked[1].barriers == 3


def test_build_stats_totals_and_shares():
    stats = build_stats(
        "krakow",
        network_length_m=1000,
        network_segments=12,
        coverage_m={"surface": (900, ["osm"]), "incline_percent": (950, ["nmt_gugik"])},
        gap_length_m=100,
        barriers=BARRIERS,
        reports=[
            report(ReportStatus.PENDING),
            report(ReportStatus.CONFIRMED, ReportType.CONSTRUCTION),
        ],
    )

    coverage = {c.key: c for c in stats.coverage}
    assert coverage["surface"].share == 0.9
    assert coverage["incline_percent"].sources == ["nmt_gugik"]
    assert coverage["width_cm"].length_m == 0  # brak danych też jest pokazany
    assert stats.gap_share == 0.1
    assert stats.barriers_total == 6
    assert [(b.type, b.count) for b in stats.barriers_by_type][0] == (BarrierType.ROUGH_SURFACE, 3)
    assert stats.reports_total == 2
    by_status = {r.status: r.count for r in stats.reports_by_status}
    assert by_status == {"pending": 1, "confirmed": 1, "rejected": 0, "resolved": 0}


def test_reports_unavailable_is_none_not_zero():
    stats = build_stats("krakow", 1000, 1, {}, 0, [], reports=None)

    assert stats.reports_total is None
    assert all(r.count == 0 for r in stats.reports_by_status)


def test_api_without_database_returns_503(client):
    r = client.get("/api/stats")
    assert r.status_code == 503
    assert "make seed" in r.json()["detail"]
