"""Tabele bazy. Pola odpowiadają modelom Pydantic z app/models/."""

from datetime import datetime

from geoalchemy2 import Geometry
from sqlalchemy import JSON, DateTime, Float, ForeignKey, String, func
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
    place_id: Mapped[str | None]
    geom = mapped_column(Geometry("POINT", srid=4326), nullable=False)
    attribute: Mapped[str]
    value: Mapped[dict] = mapped_column(JSON)
    comment: Mapped[str | None]
    status: Mapped[str] = mapped_column(String, default="pending")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
