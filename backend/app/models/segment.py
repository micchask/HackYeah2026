from typing import Literal

from pydantic import BaseModel, Field

from app.models.accessibility import AccessibilityAttribute
from app.models.route import Difficulty


class LineStringGeometry(BaseModel):
    type: Literal["LineString"] = "LineString"
    coordinates: list[tuple[float, float]] = Field(description="Punkty [lon, lat] (RFC 7946)")


class SegmentProperties(BaseModel):
    id: str = Field(description="'{u}-{v}-{key}' - krawędź grafu OSM")
    name: str | None = None
    highway: str | None = Field(default=None, description="Rodzaj drogi z OSM, np. 'footway'")
    osm_way_id: int | None = None
    length_m: float
    difficulty: Difficulty
    confidence: float = Field(
        ge=0, le=1, description="Pewność danych odcinka - ta sama reguła co w opisie trasy"
    )
    attributes: list[AccessibilityAttribute] = Field(default_factory=list)


class SegmentFeature(BaseModel):
    type: Literal["Feature"] = "Feature"
    geometry: LineStringGeometry
    properties: SegmentProperties


class SegmentCollection(BaseModel):
    """Odcinki sieci pieszej jako GeoJSON - do podania wprost do źródła `geojson` w MapLibre."""

    type: Literal["FeatureCollection"] = "FeatureCollection"
    features: list[SegmentFeature]
    truncated: bool = Field(
        default=False, description="True, gdy w bbox jest więcej odcinków niż limit"
    )
