# Scenariusz demo

> Zadanie: #5 (F0 · S4). Ten dokument wyznacza, **które funkcje są naprawdę potrzebne** na demo
> i **jaki obszar Krakowa** obejmuje demo (wejście do #7 D1).
> Obiekty z OSM sprawdzone zapytaniem Overpass 3.10.2026 – ID podane, żeby każdy mógł je zweryfikować
> (`https://www.openstreetmap.org/way/<id>`).

## TL;DR

**Trasa:** Rynek Główny (Sukiennice) → Wawel (Dziedziniec Arkadowy) → Kazimierz (Plac Nowy).
Około 2 km, cały czas w obrębie Starego Miasta, Wawelu i Kazimierza.

**Co widzi jury w 3 minuty:**

1. Profil **wózek inwalidzki**: trasa omija bruk na Grodzkiej i Kanoniczej oraz schody na Wawel.
2. Zmiana profilu na **rodzinę z wózkiem dziecięcym**: trasa jest krótsza, bo dopuszcza nachylenie do 10% i trochę bruku.
3. Przy każdym odcinku i miejscu widać **źródło danych i pewność**. Gdy źródła się nie zgadzają, aplikacja to mówi.
4. Całość działa **bez myszy**: tekstowy opis trasy, klawiatura, czytnik ekranu.

## Obszar demo (dla #7 D1)

```yaml
# backend/cities/krakow.yaml
demo_bbox: [50.045, 19.928, 50.066, 19.950]  # south, west, north, east
```

To ok. 2,3 × 1,6 km: Stare Miasto, Planty, Wawel, bulwary, Stradom, Kazimierz.
W tym obszarze OSM ma (stan na 3.10.2026):

| Co | Ile | Po co w demo |
|---|---|---|
| schody (`highway=steps`) | 329 odcinków | omijanie schodów |
| ciągi z brukiem (`surface=sett/cobblestone/unhewn_cobblestone`) | 580 odcinków | omijanie bruku |
| odcinki z tagiem `incline` | 33 | podjazd na Wawel |
| schody z `ramp:stroller=yes` | kilkanaście | różnica wózek inwalidzki / dziecięcy |

Graf pieszy dla tego obszaru jest mały, więc buduje się szybko i mieści w cache (#8 D2, #12 D6).

## Punkty

| Punkt | Opis | Współrzędne (lat, lon) |
|---|---|---|
| **A** | Rynek Główny, Sukiennice | 50.0617, 19.9373 (to samo co w `HomePage.tsx` i mockach) |
| **B** | Wawel, Dziedziniec Arkadowy (`paving_stones`) | ok. 50.0541, 19.9355 – potwierdzić na grafie przy #15 |
| **C** | Kazimierz, Plac Nowy (asfalt) | ok. 50.0516, 19.9447 |

## Jak uruchomić demo lokalnie

1. `docker compose up -d`, potem otwórz http://localhost:5173.
2. Przy pierwszym starcie backend pobiera graf pieszy obszaru demo z Overpass do
   `data/cache/krakow/graph.graphml`. Przez mirror trwa to nawet **10 minut**. Kolejne starty ładują graf z pliku
   w ok. 1 s. Dopóki grafu nie ma, `/api/routes` czeka na jego pobranie.
3. Kliknij **Rynek → Wawel**, potem przełącz **Wózek inwalidzki / Rodzina z wózkiem dziecięcym**.
4. Własne punkty: **Wskaż A na mapie** / **Wskaż B na mapie** i kliknięcie na mapie. Punkty spoza obszaru demo
   dostają trasę przykładową (mock) z ostrzeżeniem.

## Bariery na trasie (prawdziwe dane z OSM)

| Bariera | Gdzie | OSM | Dlaczego ważna |
|---|---|---|---|
| Bruk na Drodze Królewskiej | ul. Grodzka (5 odcinków `sett`), ul. Kanonicza (3 odcinki `sett`) | `surface=sett` | najkrótsza droga Rynek → Wawel prowadzi po bruku |
| Bruk na samym Rynku | Rynek Główny (8 odcinków `sett`) | `surface=sett` | punkt startu – uczciwie ostrzegamy już na pierwszym odcinku |
| Schody na wzgórze wawelskie | ok. 50.0552, 19.9358 | way 395982452 (81 stopni), way 395982459 (93 stopnie), `ramp:wheelchair=separate` | klasyczny przykład: piechotą najkrócej, na wózku niemożliwe |
| Brukowany podjazd na Wawel | Droga do Zamku | way 117749402, 117749414, 1173048536 (`surface=sett`, `incline=up`) | jedyna droga bez schodów, ale bruk + nachylenie – aplikacja ostrzega i obniża pewność |
| „Schody z Listy Schindlera” | Kazimierz, przy Placu Nowym, ok. 50.0509, 19.9440 | way 827644994, `ramp=no` | rozpoznawalny obiekt – dobry moment na pitch |
| Bruk na Kazimierzu | ul. Szeroka (8 odcinków `sett`), ul. Józefa (częściowo) | `surface=sett` | alternatywa: Stradomska i Dietla (asfalt) |

Ciągi z gładką nawierzchnią, którymi trasa powinna iść dla profilu wózka inwalidzkiego:
Franciszkańska, Straszewskiego, Bernardyńska, Stradomska, Dietla (asfalt), bulwary wiślane (asfalt).

## Przebieg demo (ok. 3 min)

### Scena 1 – Problem (20 s)

Ekran: mapa Krakowa, Rynek.

> „Najkrótsza piesza droga z Rynku na Wawel to Grodzka i Kanonicza: kilkaset metrów bruku,
> a na wzgórze prowadzą schody, które mają 81 stopni. Dla osoby na wózku albo rodzica z wózkiem to nie jest trasa.”

Przed demo sprawdzić, co dla tej trasy pokazuje Google Maps. Jeśli prowadzi po bruku albo po schodach,
pokazać to na zrzucie ekranu obok naszej trasy.

### Scena 2 – Trasa na wózku inwalidzkim (60 s)

1. Wybieram **A = Rynek Główny**, **B = Wawel** (wyszukiwarka #22 albo kliknięcie na mapie #23).
2. Profil **„Wózek inwalidzki”** (#24). Zostawiam domyślne preferencje: omijaj schody, omijaj bruk, nachylenie max 6%.
3. **Wyznacz trasę.**

Co pokazujemy:

- trasa omija Grodzką, idzie Bracką, Poselską i alejką Plant (asfalt), potem Świętego Idziego i Drogą do Zamku,
- szara przerywana linia to najkrótsza zwykła trasa piesza (Grodzka, Kanonicza, schody na wzgórze) – dla porównania,
- schody na wzgórze są pominięte (`highway=steps` → krawędź nieprzejezdna),
- wynik (stan grafu z 3.10.2026): 1,68 km i 131 m bruku, zamiast 1,07 km, 2 odcinków schodów i 764 m bruku na zwykłej trasie,
- segmenty na mapie mają kolory wg trudności + legenda (#25),
- ostatni odcinek (Droga do Zamku) ma ostrzeżenie: **„bruk i podjazd, brak danych o nachyleniu – pewność niska”**.
  To celowe: pokazujemy, że aplikacja **nie udaje, że wie**.

> „Trasa jest o kilkaset metrów dłuższa, ale bez schodów i prawie bez bruku. A tam, gdzie nie mamy pewności, mówimy to wprost.”

### Scena 3 – Zmiana profilu na rodzinę z wózkiem dziecięcym (30 s)

1. Przełączam profil na **„Rodzina z wózkiem dziecięcym”** (max 10% nachylenia, mniejsza kara za bruk – `routing/profiles.py`).
2. **Wyznacz trasę** ponownie.

Co pokazujemy: trasa jest krótsza (1,46 km), idzie Grodzką i dalej bez schodów. Opis mówi, ile metrów bruku
jest po drodze (357 m). Trasa przelicza się od razu po zmianie profilu.

> „Ta sama trasa, inne potrzeby. Nie pytamy nikogo o niepełnosprawność, tylko o to, czego chce unikać.”

**Opcjonalnie (jeśli zdążymy z #16 R2):** w OSM są schody z szynami dla wózków dziecięcych (`ramp:stroller=yes`),
np. way 28348215, 131387391 (okolice Dworca Głównego / Galerii Krakowskiej). Profil `stroller` może je dopuścić,
profil `wheelchair` nie. To najmocniejszy przykład różnicy między profilami.

### Scena 4 – Skąd to wiemy (40 s)

1. Klikam segment trasy → panel szczegółów (#26): nawierzchnia, nachylenie, **źródło** (OSM / MSIP / zgłoszenie), **data weryfikacji**, **pewność**.
2. Na liście miejsc pokazuję:
   - **Sukiennice** – winda potwierdzona przez otwarte dane miasta (pewność 75%),
   - **Bazylika Mariacka** – wejście bez schodów: **źródła się nie zgadzają** (status `conflicting`, widać obie wartości).

> „Każda informacja ma źródło i datę. Gdy dane z OSM i z miasta się różnią, pokazujemy obie wersje zamiast zgadywać.”

### Scena 5 – Dostępność samej aplikacji (30 s)

1. Wyłączam mysz. Tab → skip link → formularz → **Wyznacz trasę** → opis trasy krok po kroku.
2. Na chwilę włączam VoiceOver / NVDA: czytnik czyta opis trasy i ostrzeżenia.

> „Mapa to dodatek. Cała trasa jest też tekstem, więc aplikacja działa z czytnikiem ekranu i samą klawiaturą.”

### Scena 6 – Dalej: Wawel → Kazimierz (opcjonalnie, jeśli zostaje czas)

A = Wawel, B = Plac Nowy. Trasa wybiera Stradomską i Dietla (asfalt) zamiast Szerokiej (bruk)
i omija „schody z Listy Schindlera”. Dobre zamknięcie przed slajdem o skalowaniu na inne miasta.

## Co jest potrzebne na demo

Na podstawie scenariusza. **Musi być** = bez tego nie ma demo.

| Funkcja | Zadanie | Scena | Priorytet |
|---|---|---|---|
| `demo_bbox` w konfiguracji miasta | #7 D1 | wszystkie | **musi być** |
| graf pieszy z tagami `surface`, `highway=steps`, `incline` | #8 D2 | 2, 3 | **musi być** |
| routing na prawdziwym grafie (`is_mock: false`) | #15 R1 | 2, 3 | **musi być** |
| tekstowy opis trasy (nazwy ulic, metry bruku) | #18 R4 | 2, 5 | **musi być** |
| dane demo bez internetu (`make seed`) | #12 D6 | wszystkie | **musi być** |
| wybór A/B (wyszukiwarka lub klik) | #22 U1 / #23 U2 | 2 | **musi być** (wystarczy jedno z dwóch) |
| wybór profilu wheelchair / stroller | #24 U3 | 3 | **musi być** |
| strojenie kar, żeby profile dawały różne trasy | #16 R2 | 3 | **musi być** |
| confidence / accessibility score segmentu | #17 R3 | 2, 4 | powinno być |
| kolorowanie segmentów + legenda | #25 U4 | 2 | powinno być |
| panel szczegółów segmentu (źródło, data, pewność) | #26 U5 | 4 | powinno być |
| `ramp:stroller` w profilu stroller | #16 R2 | 3 (opcja) | miło mieć |
| porównanie tras / „Why this route?” | #20, #21, #28 | – | miło mieć |
| zgłoś barierę | #29 U8 | – | miło mieć |

## Ryzyka i plan B

| Ryzyko | Plan B |
|---|---|
| **Overpass nie odpowiada.** 3.10.2026 `overpass-api.de` odrzucał połączenia z naszej sieci, a działał mirror `https://maps.mail.ru/osm/tools/overpass/api/interpreter` | demo **zawsze** z cache (`make seed`, #12); w `krakow.yaml` można zmienić `overpass_url` na mirror |
| routing wyznacza dziwną trasę dla B (np. przez dziedziniec bez wejścia) | przed demo zapisać współrzędne A/B/C, które dają dobrą trasę, i trzymać je w presetach |
| brak danych o nachyleniu podjazdu na Wawel | to nie błąd, to funkcja: ostrzeżenie + niska pewność (scena 2) |
| internet na sali | kafelki mapy i API lokalnie; w ostateczności nagrany film (#41) |
| czas | sceny 1–4 to rdzeń (ok. 2,5 min), 5 i 6 skracamy w razie potrzeby |

## Checklista przed demo

- [ ] `docker compose up --build -d` i `make seed` na czystym klonie (#42)
- [ ] A → B dla profilu wheelchair omija Grodzką, Kanoniczą i schody na Wawel
- [ ] A → B dla profilu stroller daje **inną**, krótszą trasę
- [ ] Sukiennice i Bazylika Mariacka widoczne na liście miejsc ze źródłem i pewnością
- [ ] przejście całego scenariusza samą klawiaturą
- [ ] przeglądarka w trybie pełnoekranowym, zoom 125%, wyłączone powiadomienia
