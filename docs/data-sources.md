# Źródła danych

Zasady cyklicznego odświeżania, obsługi awarii i moderacji opisuje
[plan utrzymania danych i moderacji zgłoszeń](data-operations.md).

| Źródło | Provider | Typ | Licencja | Status | Co daje |
|---|---|---|---|---|---|
| OpenStreetMap (Overpass) | `osm` | API | ODbL | działa | `wheelchair`, `toilets:wheelchair`, `surface`, `tactile_paving`, graf pieszy, krawężniki (węzły `barrier=kerb` / `kerb=*` / `kerb:height`) |
| Kraków – otwarte dane | `krakow_open_data` | pliki/API | TODO | stub | TODO: wybrać zbiory |
| MSIP Kraków | `msip` | WMS/WFS | TODO | stub | TODO: chodniki, przejścia, schody |
| Zgłoszenia użytkowników | `user_reports` | baza | własne | stub | aktualne problemy (zepsuta winda, remont) |
| Deklaracje dostępności (BIP) | `accessibility_declarations` (zbiór: `backend/datasets/krakow_instytucje_dostepnosc.json`, snapshot `data/seed/krakow/accessibility_declarations.json.gz`) | plik JSON (opracowany ręcznie z deklaracji na stronach BIP) albo URL | informacja publiczna (ustawa o dostępie do informacji publicznej; deklaracje obowiązkowe wg ustawy o dostępności cyfrowej) | działa | 32 instytucje (UMK, ZDMK, Muzeum Krakowa, Teatr KTO), współrzędne z Photona (#75). Do miejsc trafiają: winda → `elevator`, toaleta → `accessible_toilet`, wejście/wejście główne/boczne → `step_free_entrance`; tekst zamieniany na tak/nie regułami z YAML, niejednoznaczny pomijany. Pozostałe kategorie (pętla, PJM) – tylko w `/api/institutions` |
| GTFS ZTP Kraków (gtfs.ztp.krakow.pl) | – (plik `backend/datasets/krakow_przystanki_stare_miasto.json`) | plik JSON, wyciąg z GTFS | TODO: potwierdzić warunki ZTP | dane gotowe, bez providera | 29 przystanków w `demo_bbox` (18 tramwajowych, 11 autobusowych) ze współrzędnymi i liniami. `wheelchair_boarding` pusty w całym GTFS ZTP – zapisany jako `unknown`, confidence 0.0 |
| NMT GUGiK – numeryczny model terenu, siatka 1 m | – (`backend/app/routing/elevation.py`, krok budowy grafu) | usługa WCS `mapy.geoportal.gov.pl/.../NMT/GRID1/WCS/DigitalTerrainModelFormatTIFF`, coverage `DTM_PL-KRON86-NH_TIFF` (EPSG:2180, wysokości PL-KRON86-NH) | dane GUGiK udostępniane bezpłatnie (Prawo geodezyjne i kartograficzne, art. 40a); źródło: GUGiK | działa | `incline_percent` krawędzi grafu (#10): najbardziej strome ~10 m odcinka, próbkowanie co 5 m, znak w kierunku krawędzi; `elevation` węzłów. Kafle 1×1 km pobierane automatycznie do `data/raw/nmt/<miasto>/` (ok. 35 MB dla obszaru demo, nie do repo) – nachylenie zapisane w snapshocie grafu, więc `make seed` działa bez rastra. Liczbowy tag OSM `incline` ma pierwszeństwo; schody, mosty i tunele pomijane; > 30% zapisane jako ±30% z `incline_note` (stromy stok albo błąd modelu), a nie jako brak danych. Odcinki < 4 m bez wartości (szum NMT większy niż sygnał). W WCS GUGiK `SUBSET x` = easting, `y` = northing |
| Photon (komoot), geokoder | – (`backend/app/geocoding.py`, `GET /api/geocode`, `/api/geocode/reverse`) | API | dane OSM (ODbL); publiczna instancja w trybie fair use | działa | podpowiedzi adresów A/B i adres po kliknięciu na mapie, tylko w `demo_bbox`. Wymaga własnego `User-Agent` (inaczej 403) i nie obsługuje `lang=pl`. Wyniki w cache procesu przez 1 h. Bez internetu: komunikat w UI, zostają trasy demo i wybór na mapie |

## Jak dodać źródło

1. Plik w `backend/app/providers/`, klasa dziedzicząca po `Provider` z `@register_provider("nazwa")`.
2. Import w `backend/app/providers/__init__.py`.
3. Wpis w `backend/cities/krakow.yaml` (`providers:`).
4. Test parsowania na zapisanej próbce odpowiedzi (bez sieci) w `backend/tests/`.
5. Uzupełnij tę tabelę (licencja!).

## Krawężniki w grafie

Krawężnik jest w OSM **węzłem** (`barrier=kerb`, `kerb=raised|lowered|flush|rolled`, czasem `kerb:height`),
a nie drogą. `routing/graph.py` (`add_kerbs`) przenosi go na krawędzie, które dotykają tego węzła:
`kerb_height_cm` (raised ≈ 10, rolled ≈ 6, lowered ≈ 2, flush/no = 0) albo `kerb_unknown`, gdy wysokości brak.
Za wysoki krawężnik dla profilu = krawędź nieprzejezdna, nieznana wysokość = kara za niepewność.
W obszarze demo (3.10.2026): 183 węzły, w większości `lowered` i `flush`, tylko 2 `raised`, 26 bez wysokości.

## Deklaracje dostępności – źródło uniwersalne

Każdy podmiot publiczny w Polsce publikuje deklarację dostępności według jednego wzoru, więc provider
`accessibility_declarations` nie zna żadnego miasta: zbiór (`url` – plik względem `backend/` albo
`http(s)://`) i reguły zamiany tekstu na tak/nie są w `cities/<miasto>.yaml`. Nowe miasto = nowy zbiór
i wpis w YAML. Pewność bierzemy z rekordu (0.95 z datą weryfikacji, 0.75 bez daty).

**Łączenie z OSM** (`normalization/merge.py`, `match_places`): ten sam obiekt = odległość ≤ 30 m **i**
podobna nazwa (≥ 70% słów krótszej nazwy w dłuższej, bez polskich znaków). Sama odległość nie wystarcza:
26 m od Pałacu Krzysztofory jest siłownia, 37 m od Starej Synagogi bar sushi – ich `wheelchair=no`
dałoby fałszywe konflikty. Dopasowane miejsce dostaje id źródła wyżej w YAML (OSM).

Stan 3.10.2026: dopasowane 2 z 32 instytucji (Krakowskie Centrum Świadczeń, Urząd Stanu Cywilnego);
muzea nie mają w OSM punktu z tagiem `wheelchair`, więc zostają osobnymi miejscami. Wspólna cecha z OSM
to tylko `accessible_toilet`, więc konflikty pojawią się dopiero przy dopasowaniu obiektu z toaletą
w obu źródłach.

## Confidence bazowe

Ustawiane w klasie providera (`base_confidence`). Obecnie: MSIP 0.8, open data 0.7, OSM 0.6, zgłoszenia 0.4.
Logika łączenia: `backend/app/normalization/merge.py`.
