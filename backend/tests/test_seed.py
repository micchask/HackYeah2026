import gzip
import json

import pytest

from app.cities import get_city
from app.config import get_settings
from app.providers import get_provider_class
from app.seed import load_cached_places, main, restore_cache, seed_dir


def _write_snapshot(data_dir, city_id: str) -> None:
    city = get_city(city_id)
    osm = get_provider_class("osm")(city)
    places = osm.parse(
        {
            "elements": [
                {"type": "node", "id": 1, "lat": 50.06, "lon": 19.94, "tags": {"wheelchair": "yes"}}
            ]
        }
    )
    out = seed_dir(city_id, data_dir)
    out.mkdir(parents=True)
    payload = json.dumps([p.model_dump(mode="json") for p in places]).encode()
    (out / "osm.json.gz").write_bytes(gzip.compress(payload))
    (out / "graph.graphml.gz").write_bytes(gzip.compress(b"<graphml/>"))


def test_restore_cache_unpacks_snapshot(tmp_path):
    city = get_city("krakow")
    _write_snapshot(tmp_path, city.id)

    restored = restore_cache(city, tmp_path)

    cache = tmp_path / "cache" / city.id
    assert sorted(restored) == [cache / "graph.graphml", cache / "osm.json"]
    assert (cache / "graph.graphml").read_bytes() == b"<graphml/>"
    [place] = load_cached_places(city, tmp_path)
    assert place.id == "osm:node/1"


def test_restore_cache_without_snapshot_fails(tmp_path):
    with pytest.raises(FileNotFoundError):
        restore_cache(get_city("krakow"), tmp_path)


def test_main_no_db(tmp_path, monkeypatch):
    _write_snapshot(tmp_path, "krakow")
    monkeypatch.setattr(get_settings(), "data_dir", tmp_path)

    assert main(["--no-db"]) == 0
    assert (tmp_path / "cache" / "krakow" / "osm.json").exists()


def test_repo_snapshot_covers_demo():
    """Snapshot w repo musi zawierać graf, bez niego routing woła Overpass."""
    assert (seed_dir("krakow") / "graph.graphml.gz").exists()
