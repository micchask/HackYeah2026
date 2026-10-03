from app.models import LatLon, RouteBaseline, RouteResponse, RouteSegment
from app.routing.geojson import route_to_geojson

A = LatLon(lat=50.0617, lon=19.9373)
B = LatLon(lat=50.0600, lon=19.9370)
C = LatLon(lat=50.0541, lon=19.9355)


def _route(baseline: bool) -> RouteResponse:
    segments = [
        RouteSegment(
            instruction="Idź prosto.",
            distance_m=200,
            geometry=[A, B],
            surface="asphalt",
            accessibility_score=100,
            confidence=0.6,
        ),
        RouteSegment(
            instruction="Skręć w lewo.",
            distance_m=700,
            geometry=[B, C],
            surface="sett",
            warnings=["Bruk"],
            accessibility_score=25,
            confidence=0.6,
        ),
    ]
    return RouteResponse(
        distance_m=900,
        duration_s=1000,
        segments=segments,
        accessibility_score=60,
        confidence=0.6,
        explanation="Trasa testowa.",
        baseline=RouteBaseline(distance_m=850, stairs_count=1, rough_surface_m=300, geometry=[A, C])
        if baseline
        else None,
    )


def test_features_are_segments_plus_baseline():
    route = _route(baseline=True)
    geojson = route_to_geojson(route)

    assert geojson["type"] == "FeatureCollection"
    assert len(geojson["features"]) == len(route.segments) + 1
    kinds = [f["properties"]["kind"] for f in geojson["features"]]
    assert kinds == ["segment", "segment", "baseline"]


def test_without_baseline_only_segments():
    route = _route(baseline=False)
    assert len(route_to_geojson(route)["features"]) == len(route.segments)


def test_coordinates_are_lon_lat():
    feature = route_to_geojson(_route(baseline=False))["features"][0]

    assert feature["geometry"] == {
        "type": "LineString",
        "coordinates": [[A.lon, A.lat], [B.lon, B.lat]],
    }


def test_segment_properties():
    props = route_to_geojson(_route(baseline=False))["features"][1]["properties"]

    assert props["index"] == 1
    assert props["surface"] == "sett"
    assert props["warnings"] == ["Bruk"]
    assert props["difficulty"] == "easy"
    assert props["confidence"] == 0.6
    assert "geometry" not in props


def test_api_returns_geojson_for_same_request(client):
    body = {
        "origin": {"lat": 50.0617, "lon": 19.9373},
        "destination": {"lat": 50.0672, "lon": 19.9450},
        "preferences": {"profile": "stroller"},
    }
    route = client.post("/api/routes", json=body).json()
    r = client.post("/api/routes/geojson", json=body)

    assert r.status_code == 200
    data = r.json()
    assert data["type"] == "FeatureCollection"
    segments = [f for f in data["features"] if f["properties"]["kind"] == "segment"]
    assert len(segments) == len(route["segments"])
    assert data["properties"]["distance_m"] == route["distance_m"]
    assert data["properties"]["is_mock"] == route["is_mock"]
