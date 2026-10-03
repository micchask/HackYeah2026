from pydantic import BaseModel, Field

from app.models.accessibility import AccessibilityAttribute
from app.models.geo import LatLon


class Place(BaseModel):
    id: str = Field(description="Stabilne ID, np. 'osm:node/123'")
    city: str
    name: str | None = None
    category: str | None = Field(default=None, description="np. 'cafe', 'pharmacy', 'tram_stop'")
    location: LatLon
    attributes: list[AccessibilityAttribute] = Field(default_factory=list)
