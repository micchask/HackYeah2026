import json
from datetime import UTC, datetime
from pathlib import Path

from app.cities import get_city
from app.models import (
    AccessibilityAttribute,
    AttributeKey,
    AttributeStatus,
    LatLon,
    Place,
    Provenance,
    SourceType,
)
from app.normalization.merge import match_places, merge_places, name_similarity
from app.providers import get_provider_class
from app.providers.declarations import text_to_bool

SAMPLE = json.loads(
    (Path(__file__).parent / "fixtures" / "declarations_sample.json").read_text(encoding="utf-8")
)
NOW = datetime(2026, 10, 3, tzinfo=UTC)


def _provider():
    city = get_city("krakow")
    cfg = next(p for p in city.providers if p.name == "accessibility_declarations")
    return get_provider_class("accessibility_declarations")(city, cfg.options)


def _by_key(place: Place) -> dict[AttributeKey, AccessibilityAttribute]:
    return {a.key: a for a in place.attributes}


def test_parse_sample_without_network():
    places = _provider().parse(SAMPLE)

    # rekord bez współrzędnych pomijamy
    assert [p.id for p in places] == [
        "accessibility_declarations:mk-stara-synagoga",
        "accessibility_declarations:zdmk-centralna",
    ]
    synagogue = _by_key(places[0])
    assert synagogue[AttributeKey.STEP_FREE_ENTRANCE].value is False
    assert synagogue[AttributeKey.ELEVATOR].value is False
    assert synagogue[AttributeKey.ACCESSIBLE_TOILET].value is False
    # kategoria bez mapowania (tłumacz PJM) nie trafia do atrybutów
    assert len(synagogue) == 3


def test_provenance():
    attr = _by_key(_provider().parse(SAMPLE)[0])[AttributeKey.ELEVATOR]

    assert attr.provenance.source == "accessibility_declarations"
    assert attr.provenance.source_type == SourceType.OPEN_DATA
    assert attr.provenance.source_ref == "mk-stara-synagoga#winda"
    assert attr.confidence == 0.95
    entrance = _by_key(_provider().parse(SAMPLE)[0])[AttributeKey.STEP_FREE_ENTRANCE]
    assert entrance.provenance.last_verified == datetime(2025, 3, 31, tzinfo=UTC)


def test_any_step_free_entrance_wins_and_ambiguous_text_is_skipped():
    zdmk = _by_key(_provider().parse(SAMPLE)[1])

    # wejście główne po schodach, boczne dostosowane -> jest wejście bez schodów
    assert zdmk[AttributeKey.STEP_FREE_ENTRANCE].value is True
    # "jest, ale bywa wyłączona" - niejednoznaczne, więc brak informacji
    assert AttributeKey.ELEVATOR not in zdmk


def test_text_to_bool():
    rule = {"negative": ["brak"], "positive": ["tak", "dostepn"]}
    assert text_to_bool("Brak toalety", rule) is False
    assert text_to_bool("dostępna, parter", rule) is True
    assert text_to_bool("tak, kabina 1,1x2,2 m", rule) is True
    assert text_to_bool("kontakt telefoniczny", rule) is None  # "tak" tylko na początku wyrazu
    assert text_to_bool("w remoncie", rule) is None


def _place(pid: str, name: str | None, lat: float, lon: float, *attrs) -> Place:
    return Place(
        id=pid, city="krakow", name=name, location=LatLon(lat=lat, lon=lon), attributes=list(attrs)
    )


def _toilet(value: bool, source: str, confidence: float) -> AccessibilityAttribute:
    return AccessibilityAttribute(
        key=AttributeKey.ACCESSIBLE_TOILET,
        value=value,
        provenance=Provenance(source=source, source_type=SourceType.OSM, fetched_at=NOW),
        confidence=confidence,
    )


def test_name_similarity():
    assert (
        name_similarity("Urząd Miasta Krakowa — Urząd Stanu Cywilnego", "Urząd Stanu Cywilnego")
        == 1
    )
    assert name_similarity("Muzeum Krakowa — Pałac Krzysztofory", "Fitagain") == 0


def test_same_object_from_two_sources_gets_osm_id_and_conflict():
    osm = _place("osm:way/1", "Urząd Stanu Cywilnego", 50.0600, 19.9400, _toilet(True, "osm", 0.6))
    city = _place(
        "accessibility_declarations:usc",
        "Urząd Miasta Krakowa — Urząd Stanu Cywilnego",
        50.0601,  # ~11 m dalej
        19.9400,
        _toilet(False, "accessibility_declarations", 0.75),
    )

    [merged] = merge_places([osm, city])
    assert merged.id == "osm:way/1"
    toilet = _by_key(merged)[AttributeKey.ACCESSIBLE_TOILET]
    assert toilet.status == AttributeStatus.CONFLICTING
    assert toilet.value is False  # wyższa pewność
    assert [a.provenance.source for a in toilet.alternatives] == ["osm"]


def test_neighbour_with_other_name_is_not_matched():
    # przypadek z prawdziwych danych: siłownia 26 m od Pałacu Krzysztofory
    gym = _place("osm:node/2", "Fitagain", 50.0619, 19.9370)
    museum = _place(
        "accessibility_declarations:mk", "Muzeum Krakowa — Pałac Krzysztofory", 50.0621, 19.9372
    )

    assert [p.id for p in match_places([gym, museum])] == ["osm:node/2", museum.id]


def test_same_name_far_away_is_not_matched():
    a = _place("osm:node/3", "Urząd Stanu Cywilnego", 50.0600, 19.9400)
    b = _place("accessibility_declarations:usc", "Urząd Stanu Cywilnego", 50.0700, 19.9400)

    assert len(merge_places([a, b])) == 2
