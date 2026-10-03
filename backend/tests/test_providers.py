from app.cities import get_city
from app.models import AttributeKey
from app.providers import get_provider_class, registered_providers
from app.providers.base import Provider
from app.providers.service import fetch_city_places


def test_all_city_providers_are_registered():
    city = get_city("krakow")
    for cfg in city.providers:
        assert cfg.name in registered_providers()


def test_osm_parse():
    city = get_city("krakow")
    provider = get_provider_class("osm")(city)
    payload = {
        "elements": [
            {
                "type": "node",
                "id": 1,
                "lat": 50.06,
                "lon": 19.94,
                "tags": {"name": "Kawiarnia", "amenity": "cafe", "wheelchair": "yes"},
            }
        ]
    }
    [place] = provider.parse(payload)
    assert place.id == "osm:node/1"
    assert place.attributes[0].key == AttributeKey.WHEELCHAIR
    assert place.attributes[0].provenance.source == "osm"


def test_fallback_to_cache_when_provider_fails(tmp_path, monkeypatch):
    city = get_city("krakow").model_copy()
    city.providers = [p for p in city.providers if p.name == "osm"]
    osm_cls = get_provider_class("osm")

    monkeypatch.setattr(osm_cls, "fetch_places", lambda self: osm_cls.parse(self, {"elements": []}))
    assert fetch_city_places(city, data_dir=tmp_path).sources == {"osm": "live"}

    def boom(self: Provider):
        raise ConnectionError("Overpass nie działa")

    monkeypatch.setattr(osm_cls, "fetch_places", boom)
    assert fetch_city_places(city, data_dir=tmp_path).sources == {"osm": "cache"}
