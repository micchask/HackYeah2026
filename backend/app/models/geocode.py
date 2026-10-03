from pydantic import BaseModel, Field

from app.models.geo import LatLon


class GeocodeResult(BaseModel):
    """Podpowiedź wyszukiwarki adresów - ten sam kształt co punkt A/B na froncie."""

    label: str = Field(description="Nazwa do wyświetlenia, np. 'Sukiennice' albo 'Grodzka 20'")
    description: str | None = Field(
        default=None, description="Kontekst: adres i dzielnica, np. 'Rynek Główny 3 · Stare Miasto'"
    )
    kind: str | None = Field(default=None, description="Rodzaj obiektu po polsku, np. 'ulica'")
    point: LatLon
