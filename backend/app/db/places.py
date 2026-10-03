"""Miejsca w bazie: konwersja Place <-> PlaceRow i zapytania dla /api/places.

Alternatywne wartości z innych źródeł (konflikty z normalizacji) trzymamy w kolumnie JSON
`value` obok wartości: {"v": <wartość>, "alt": [<AccessibilityAttribute jako JSON>]}.
Dzięki temu nie trzeba migrować tabeli.
"""

from typing import Any

from geoalchemy2 import WKTElement
from geoalchemy2.shape import to_shape
from sqlalchemy import func, select
from sqlalchemy.orm import Session, selectinload

from app.db.tables import AttributeRow, PlaceRow
from app.models import (
    AccessibilityAttribute,
    AttributeKey,
    AttributeStatus,
    LatLon,
    Place,
    Provenance,
    SourceType,
)

# [south, west, north, east] - jak bbox w cities/<miasto>.yaml
BBox = tuple[float, float, float, float]


def _attribute_value(attr: AccessibilityAttribute) -> dict[str, Any]:
    value: dict[str, Any] = {"v": attr.value}
    if attr.alternatives:
        value["alt"] = [a.model_dump(mode="json") for a in attr.alternatives]
    return value


def place_to_row(place: Place) -> PlaceRow:
    return PlaceRow(
        id=place.id,
        city=place.city,
        name=place.name,
        category=place.category,
        geom=WKTElement(f"POINT({place.location.lon} {place.location.lat})", srid=4326),
        attributes=[
            AttributeRow(
                key=a.key.value,
                value=_attribute_value(a),
                source=a.provenance.source,
                source_type=a.provenance.source_type.value,
                source_ref=a.provenance.source_ref,
                fetched_at=a.provenance.fetched_at,
                last_verified=a.provenance.last_verified,
                confidence=a.confidence,
                status=a.status.value,
            )
            for a in place.attributes
        ],
    )


def _row_to_attribute(row: AttributeRow) -> AccessibilityAttribute:
    return AccessibilityAttribute(
        key=AttributeKey(row.key),
        value=row.value["v"],
        provenance=Provenance(
            source=row.source,
            source_type=SourceType(row.source_type),
            source_ref=row.source_ref,
            fetched_at=row.fetched_at,
            last_verified=row.last_verified,
        ),
        confidence=row.confidence,
        status=AttributeStatus(row.status),
        alternatives=[AccessibilityAttribute.model_validate(a) for a in row.value.get("alt", [])],
    )


def row_to_place(row: PlaceRow) -> Place:
    point = to_shape(row.geom)
    return Place(
        id=row.id,
        city=row.city,
        name=row.name,
        category=row.category,
        location=LatLon(lat=point.y, lon=point.x),
        attributes=[_row_to_attribute(a) for a in row.attributes],
    )


def has_places(session: Session, city: str) -> bool:
    return session.scalar(select(PlaceRow.id).where(PlaceRow.city == city).limit(1)) is not None


def query_places(
    session: Session, city: str, bbox: BBox, q: str | None = None, limit: int = 200
) -> list[Place]:
    """Miejsca w bbox. Najpierw te z największą liczbą cech dostępności, potem z nazwą."""
    s, w, n, e = bbox
    attr_count = (
        select(AttributeRow.place_id, func.count().label("n"))
        .group_by(AttributeRow.place_id)
        .subquery()
    )
    stmt = (
        select(PlaceRow)
        .outerjoin(attr_count, attr_count.c.place_id == PlaceRow.id)
        .where(
            PlaceRow.city == city,
            func.ST_Intersects(PlaceRow.geom, func.ST_MakeEnvelope(w, s, e, n, 4326)),
        )
        .options(selectinload(PlaceRow.attributes))
        .order_by(
            func.coalesce(attr_count.c.n, 0).desc(),
            PlaceRow.name.is_(None),
            PlaceRow.name,
            PlaceRow.id,
        )
        .limit(limit)
    )
    if q:
        stmt = stmt.where(PlaceRow.name.ilike(f"%{q}%"))
    return [row_to_place(row) for row in session.scalars(stmt)]
