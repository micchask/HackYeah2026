# Źródła danych

| Źródło | Provider | Typ | Licencja | Status | Co daje |
|---|---|---|---|---|---|
| OpenStreetMap (Overpass) | `osm` | API | ODbL | działa | `wheelchair`, `toilets:wheelchair`, `surface`, `tactile_paving`, graf pieszy |
| Kraków – otwarte dane | `krakow_open_data` | pliki/API | TODO | stub | TODO: wybrać zbiory |
| MSIP Kraków | `msip` | WMS/WFS | TODO | stub | TODO: chodniki, przejścia, schody |
| Zgłoszenia użytkowników | `user_reports` | baza | własne | stub | aktualne problemy (zepsuta winda, remont) |
| Deklaracje dostępności (BIP) | – (plik `backend/datasets/krakow_instytucje_dostepnosc.json`) | plik JSON, opracowany ręcznie | informacja publiczna | dane gotowe, bez providera | 32 instytucje (UMK, ZDMK, Muzeum Krakowa, Teatr KTO): wejścia, windy, toalety, pętle indukcyjne, tłumacz PJM. Brak współrzędnych (`geometry: null`) – do geokodowania po adresie |

## Jak dodać źródło

1. Plik w `backend/app/providers/`, klasa dziedzicząca po `Provider` z `@register_provider("nazwa")`.
2. Import w `backend/app/providers/__init__.py`.
3. Wpis w `backend/cities/krakow.yaml` (`providers:`).
4. Test parsowania na zapisanej próbce odpowiedzi (bez sieci) w `backend/tests/`.
5. Uzupełnij tę tabelę (licencja!).

## Confidence bazowe

Ustawiane w klasie providera (`base_confidence`). Obecnie: MSIP 0.8, open data 0.7, OSM 0.6, zgłoszenia 0.4.
Logika łączenia: `backend/app/normalization/merge.py`.
