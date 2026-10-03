"""Tabele bazy. Pola odpowiadają modelom Pydantic z app/models/."""

from datetime import date, datetime

from geoalchemy2 import Geometry
from sqlalchemy import JSON, BigInteger, Date, DateTime, Float, ForeignKey, String, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.db.base import Base


class PlaceRow(Base):
    __tablename__ = "places"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    city: Mapped[str] = mapped_column(String, index=True)
    name: Mapped[str | None]
    category: Mapped[str | None]
    geom = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    attributes: Mapped[list["AttributeRow"]] = relationship(
        back_populates="place", cascade="all, delete-orphan"
    )


class AttributeRow(Base):
    __tablename__ = "accessibility_attributes"

    id: Mapped[int] = mapped_column(primary_key=True)
    place_id: Mapped[str] = mapped_column(ForeignKey("places.id"), index=True)
    key: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[dict] = mapped_column(JSON)  # {"v": <wartość>} - bool/int/float/str
    # provenance
    source: Mapped[str]
    source_type: Mapped[str]
    source_ref: Mapped[str | None]
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_verified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confidence: Mapped[float] = mapped_column(Float)
    status: Mapped[str]

    place: Mapped[PlaceRow] = relationship(back_populates="attributes")


class ReportRow(Base):
    __tablename__ = "reports"

    id: Mapped[str] = mapped_column(String, primary_key=True)
    city: Mapped[str] = mapped_column(String, index=True)
    type: Mapped[str] = mapped_column(String, default="barrier", server_default="barrier")
    place_id: Mapped[str | None]
    geom = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    attribute: Mapped[str]
    value: Mapped[dict] = mapped_column(JSON)  # {"v": <wartość>} jak w AttributeRow
    comment: Mapped[str | None]
    valid_until: Mapped[date | None] = mapped_column(Date)
    status: Mapped[str] = mapped_column(String, default="pending", index=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))


class SegmentRow(Base):
    """Krawędź grafu pieszego (OSM) - jeden wiersz na odcinek, bez kierunku."""

    __tablename__ = "segments"

    id: Mapped[str] = mapped_column(String, primary_key=True)  # "{u}-{v}-{key}"
    city: Mapped[str] = mapped_column(String, index=True)
    u: Mapped[int] = mapped_column(BigInteger)
    v: Mapped[int] = mapped_column(BigInteger)
    osm_way_id: Mapped[int | None] = mapped_column(BigInteger)
    name: Mapped[str | None]
    highway: Mapped[str | None]
    length_m: Mapped[float] = mapped_column(Float)
    difficulty: Mapped[str] = mapped_column(String, index=True)
    confidence: Mapped[float] = mapped_column(Float, index=True)
    geom = mapped_column(Geometry("LINESTRING", srid=4326), nullable=False)
    attributes: Mapped[list["SegmentAttributeRow"]] = relationship(
        back_populates="segment", cascade="all, delete-orphan"
    )


class SegmentAttributeRow(Base):
    """Atrybut dostępności odcinka z provenance (te same pola co AttributeRow)."""

    __tablename__ = "segment_attributes"

    id: Mapped[int] = mapped_column(primary_key=True)
    segment_id: Mapped[str] = mapped_column(
        ForeignKey("segments.id", ondelete="CASCADE"), index=True
    )
    key: Mapped[str] = mapped_column(String, index=True)
    value: Mapped[dict] = mapped_column(JSON)  # {"v": <wartość>}
    source: Mapped[str]
    source_type: Mapped[str]
    source_ref: Mapped[str | None]
    fetched_at: Mapped[datetime] = mapped_column(DateTime(timezone=True))
    last_verified: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    confidence: Mapped[float] = mapped_column(Float)
    status: Mapped[str]

    segment: Mapped[SegmentRow] = relationship(back_populates="attributes")
