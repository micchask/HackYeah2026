from app.institutions import load_institutions, parse_institution
from app.models import InstitutionDataStatus

RAW = {
    "id": "x",
    "institution": "Urząd testowy",
    "address": "ul. Testowa 1, Kraków",
    "poiType": "urząd",
    "attributes": [
        {
            "category": "winda",
            "value": "brak",
            "source": "Deklaracja dostępności (BIP)",
            "lastVerified": "2026-03-31",
            "confidence": 0.95,
            "status": "potwierdzone",
        },
        {
            "category": "nowa_kategoria",
            "value": None,
            "source": "Deklaracja dostępności (BIP)",
            "lastVerified": None,
            "confidence": 0.0,
            "status": "cos_nowego",
        },
    ],
    "geometry": {"type": "Point", "coordinates": [19.94, 50.06]},
    "geometrySource": {"source": "Photon (dane OpenStreetMap)", "match": "przybliżony"},
}


def test_parse_maps_status_label_and_location():
    inst = parse_institution(RAW)
    winda, nowa = inst.attributes
    assert winda.label == "Winda"
    assert winda.status == InstitutionDataStatus.CONFIRMED
    assert str(winda.last_verified) == "2026-03-31"
    # nieznany klucz -> czytelna etykieta, nieznany status -> brak informacji (nie "potwierdzone")
    assert nowa.label == "Nowa kategoria"
    assert nowa.status == InstitutionDataStatus.UNKNOWN
    assert inst.location.point.lat == 50.06
    assert inst.location.exact is False


def test_without_geometry_has_no_location():
    inst = parse_institution({**RAW, "geometry": None})
    assert inst.location is None


def test_dataset_loads_with_locations():
    institutions = load_institutions("krakow")
    assert len(institutions) == 32
    assert all(i.location for i in institutions)
    assert load_institutions("nieznane-miasto") == []


def test_endpoint(client):
    r = client.get("/api/institutions")
    assert r.status_code == 200
    data = r.json()
    assert len(data) == 32
    krzysztofory = next(i for i in data if i["id"] == "mk-krzysztofory")
    assert krzysztofory["location"]["exact"] is True
    assert any(a["label"] == "Winda" for a in krzysztofory["attributes"])
