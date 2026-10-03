# data/

Surowe dane i cache (ignorowane przez git, poza tym plikiem).

- `cache/<miasto>/<provider>.json` – ostatnia udana odpowiedź providera (fallback przy awarii źródła)
- `cache/<miasto>/graph.graphml` – graf pieszy z OSM dla routingu
- `raw/` – ręcznie pobrane pliki (CSV, GeoJSON, SHP) zanim powstanie provider

Nie commitujcie tu dużych plików. Jeśli zbiór trzeba współdzielić, opiszcie skąd go pobrać w `docs/data-sources.md`.
