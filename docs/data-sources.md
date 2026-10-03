# Źródła danych

| Źródło | Provider | Typ | Licencja | Status | Co daje |
|---|---|---|---|---|---|
| OpenStreetMap (Overpass) | `osm` | API | ODbL | działa | `wheelchair`, `toilets:wheelchair`, `surface`, `tactile_paving`, graf pieszy |
| Kraków – otwarte dane | `krakow_open_data` | pliki/API | TODO | stub | TODO: wybrać zbiory |
| MSIP Kraków | `msip` | WMS/WFS | TODO | stub | TODO: chodniki, przejścia, schody |
| Zgłoszenia użytkowników | `user_reports` | baza | własne | stub | aktualne problemy (zepsuta winda, remont) |
| Deklaracje dostępności (BIP) | – (plik `backend/datasets/krakow_instytucje_dostepnosc.json`) | plik JSON, opracowany ręcznie | informacja publiczna | dane gotowe, bez providera | 32 instytucje (UMK, ZDMK, Muzeum Krakowa, Teatr KTO): wejścia, windy, toalety, pętle indukcyjne, tłumacz PJM. Brak współrzędnych (`geometry: null`) – do geokodowania po adresie |
| GTFS ZTP Kraków (gtfs.ztp.krakow.pl) | – (plik `backend/datasets/krakow_przystanki_stare_miasto.json`) | plik JSON, wyciąg z GTFS | TODO: potwierdzić warunki ZTP | dane gotowe, bez providera | 29 przystanków w `demo_bbox` (18 tramwajowych, 11 autobusowych) ze współrzędnymi i liniami. `wheelchair_boarding` pusty w całym GTFS ZTP – zapisany jako `unknown`, confidence 0.0 |
| Photon (komoot), geokoder | – (`backend/app/geocoding.py`, `GET /api/geocode`, `/api/geocode/reverse`) | API | dane OSM (ODbL); publiczna instancja w trybie fair use | działa | podpowiedzi adresów A/B i adres po kliknięciu na mapie, tylko w `demo_bbox`. Wymaga własnego `User-Agent` (inaczej 403) i nie obsługuje `lang=pl`. Wyniki w cache procesu przez 1 h. Bez internetu: komunikat w UI, zostają trasy demo i wybór na mapie |

## Jak dodać źródło

1. Plik w `backend/app/providers/`, klasa dziedzicząca po `Provider` z `@register_provider("nazwa")`.
2. Import w `backend/app/providers/__init__.py`.
3. Wpis w `backend/cities/krakow.yaml` (`providers:`).
4. Test parsowania na zapisanej próbce odpowiedzi (bez sieci) w `backend/tests/`.
5. Uzupełnij tę tabelę (licencja!).

## Confidence bazowe

Ustawiane w klasie providera (`base_confidence`). Obecnie: MSIP 0.8, open data 0.7, OSM 0.6, zgłoszenia 0.4.
Logika łączenia: `backend/app/normalization/merge.py`.
