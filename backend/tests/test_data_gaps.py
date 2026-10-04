from typing import NamedTuple

from app.db.data_gaps import CELL_DEG, summarize


class Row(NamedTuple):
    name: str | None
    highway: str | None
    length_m: float
    confidence: float
    has_surface: bool
    lat: float
    lon: float


# Dwa kwadraty siatki: przy "Poselskiej" i daleko od niej
A = (50.0571, 19.9357)
B = (50.0571 + 5 * CELL_DEG, 19.9357)

ROWS = [
    Row("Poselska", "residential", 100, 0.6, True, *A),  # nazwana ulica z danymi
    Row(None, "footway", 50, 0.35, False, *A),  # chodnik bez nawierzchni
    Row(None, "footway", 30, 0.25, False, *A),  # bez nawierzchni i z nieprecyzyjnym nachyleniem
    Row(None, "service", 200, 0.35, False, *B),  # dużo braków, bez nazwanej ulicy w okolicy
    Row(None, "footway", 20, 0.5, True, *B),  # nachylenie nieprecyzyjne, ale nawierzchnia jest
]


def test_totals_use_confidence_threshold():
    s = summarize(ROWS, max_confidence=0.4, top=10)

    assert s.total_length_m == 400
    assert s.gap_length_m == 280
    assert s.gap_segments == 3
    assert s.gap_share == 0.7
    assert s.no_surface_m == 280
    assert s.imprecise_incline_m == 30


def test_by_kind_sorted_with_polish_labels():
    kinds = summarize(ROWS, max_confidence=0.4, top=10).by_kind

    assert [(k.label, k.gap_length_m) for k in kinds] == [("droga dojazdowa", 200), ("chodnik", 80)]


def test_areas_sorted_and_labelled_by_nearest_named_street():
    areas = summarize(ROWS, max_confidence=0.4, top=10).areas

    assert [a.gap_length_m for a in areas] == [200, 80]
    assert areas[1].label == "okolice: Poselska"
    # brak nazwanej ulicy w kwadracie i u sąsiadów -> współrzędne zamiast nazwy
    assert areas[0].label.startswith("okolice 50.")
    assert len(summarize(ROWS, max_confidence=0.4, top=1).areas) == 1


def test_higher_threshold_counts_more():
    assert summarize(ROWS, max_confidence=0.5, top=10).gap_length_m == 300


def test_api_without_database_returns_503(client):
    # testy działają bez bazy (DB_ENABLED=false)
    r = client.get("/api/data-gaps")
    assert r.status_code == 503
    assert "make seed" in r.json()["detail"]


def test_api_rejects_bad_params(client):
    assert client.get("/api/data-gaps", params={"bbox": "abc"}).status_code == 422
    assert client.get("/api/data-gaps", params={"max_confidence": 2}).status_code == 422
