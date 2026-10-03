"""Dane przykładowe, żeby frontend mógł pracować zanim działają prawdziwe providery/routing."""

from datetime import UTC, datetime

from app.models import (
    AccessibilityAttribute,
    AttributeKey,
    AttributeStatus,
    LatLon,
    Place,
    Provenance,
    RouteRequest,
    RouteResponse,
    RouteSegment,
    SourceType,
)
from app.routing.scores import aggregate_route_scores

_NOW = datetime(2026, 10, 1, tzinfo=UTC)


def _prov(source: str, source_type: SourceType, ref: str) -> Provenance:
    return Provenance(
        source=source, source_type=source_type, source_ref=ref, fetched_at=_NOW, last_verified=_NOW
    )


MOCK_PLACES: list[Place] = [
    Place(
        id="mock:sukiennice",
        city="krakow",
        name="Sukiennice",
        category="museum",
        location=LatLon(lat=50.0617, lon=19.9373),
        attributes=[
            AccessibilityAttribute(
                key=AttributeKey.WHEELCHAIR,
                value="limited",
                provenance=_prov("osm", SourceType.OSM, "way/1"),
                confidence=0.6,
            ),
            AccessibilityAttribute(
                key=AttributeKey.ELEVATOR,
                value=True,
                provenance=_prov("krakow_open_data", SourceType.OPEN_DATA, "obj-1"),
                confidence=0.75,
                status=AttributeStatus.VERIFIED,
            ),
        ],
    ),
    Place(
        id="mock:galeria-krakowska",
        city="krakow",
        name="Galeria Krakowska",
        category="mall",
        location=LatLon(lat=50.0672, lon=19.9450),
        attributes=[
            AccessibilityAttribute(
                key=AttributeKey.WHEELCHAIR,
                value="yes",
                provenance=_prov("osm", SourceType.OSM, "way/2"),
                confidence=0.8,
                status=AttributeStatus.VERIFIED,
            ),
            AccessibilityAttribute(
                key=AttributeKey.ACCESSIBLE_TOILET,
                value=True,
                provenance=_prov("osm", SourceType.OSM, "way/2"),
                confidence=0.6,
            ),
        ],
    ),
    Place(
        id="mock:kosciol-mariacki",
        city="krakow",
        name="Bazylika Mariacka",
        category="place_of_worship",
        location=LatLon(lat=50.0616, lon=19.9393),
        attributes=[
            AccessibilityAttribute(
                key=AttributeKey.STEP_FREE_ENTRANCE,
                value=False,
                provenance=_prov("user_reports", SourceType.USER_REPORT, "r-1"),
                confidence=0.5,
                status=AttributeStatus.CONFLICTING,
            ),
        ],
    ),
]


def mock_route(req: RouteRequest) -> RouteResponse:
    o, d = req.origin, req.destination
    mid = LatLon(lat=o.lat, lon=d.lon)
    segments = [
        RouteSegment(
            instruction="Idź prosto na wschód chodnikiem z płyt betonowych.",
            distance_m=320,
            geometry=[o, mid],
            surface="paving_stones",
            incline_percent=1.5,
            accessibility_score=85,
            data_status=AttributeStatus.VERIFIED,
            confidence=0.8,
        ),
        RouteSegment(
            instruction="Skręć w lewo. Uwaga: odcinek z kostki brukowej, ok. 40 m.",
            distance_m=210,
            geometry=[mid, d],
            surface="sett",
            incline_percent=3.0,
            warnings=["Nierówna nawierzchnia (kostka brukowa)"],
            accessibility_score=40,
            data_status=AttributeStatus.UNVERIFIED,
            confidence=0.5,
        ),
    ]
    distance = sum(s.distance_m for s in segments)
    accessibility, confidence = aggregate_route_scores(segments)
    return RouteResponse(
        distance_m=distance,
        duration_s=distance / 0.9,
        segments=segments,
        accessibility_score=accessibility,
        confidence=confidence,
        warnings=["To jest trasa przykładowa (mock) - routing w budowie."],
        is_mock=True,
    )
