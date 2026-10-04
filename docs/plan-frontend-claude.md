> **Plan zrealizowany 4.10.2026** (zadania #86–#97, potem redesign #117). Dokument zostaje jako zapis
> decyzji projektowych; aktualny układ kodu opisuje `docs/development.md`.

# Plan przebudowy frontendu – wersja Claude

> Specyfikacja dla agenta (LLM) i zespołu. Bazuje na `planfront.txt` (główny odnośnik) i stanie repo z 4.10.2026.
> Budżet: **6 h**, tylko **web na laptopie** (szerokość ≥ 1280 px). Telefon poza zakresem.
> Inspiracje: Google Maps (panel kontekstowy + mapa), Jakdojade (wybór wariantów trasy), Janosik (bariery na trasie).

## 0. Zasady nadrzędne (nie łamać)

1. **Najpierw wybór profilu, potem mapa.** Profil to preset, nie klatka: zawsze widoczny chip „Tryb: …” z `[Zmień]` i `[Dostosuj]`.
2. **Jeden panel, jeden kontekst naraz** (jak Google Maps). Panel ma stany; nigdy nie ma w nim wszystkich funkcji jedna pod drugą.
3. **Żadnych martwych przycisków.** Funkcje bez danych z backendu (ławki, parkingi OzN, wydarzenia, przewijaki) działają na **danych przykładowych** z `src/api/demo.ts` w tym samym kształcie co przyszłe API (§5.8). Podmiana na backend = zmiana jednej funkcji. Każdy taki obiekt ma źródło „dane przykładowe”, widoczne w karcie miejsca.
4. **Pytamy o potrzeby, nie o niepełnosprawność** (README, `RoutePreferences`). Etykiety profili opisują sposób poruszania się.
5. **WCAG 2.2 AA bez wyjątków:** cała ścieżka demo działa z klawiatury, informacja nie jest przekazywana tylko kolorem ani tylko mapą.
6. **Demo i narracja = osoba na wózku.** Pozostałe profile pokazują szerokość produktu, ale scenariusz demo (`docs/demo-scenario.md`) się nie zmienia.
7. **Nie przepisujemy działających komponentów.** Przenosimy je do nowych widoków i podajemy im propsy.

## 1. Różnice względem `planfront.txt` (propozycje)

| # | `planfront.txt` | Ta wersja | Dlaczego |
|---|---|---|---|
| R1 | Osobny ekran tytułowy, potem mapa | Ekran startowy jako **pełnoekranowa warstwa nad mapą** (bez routera). Wybór zapamiętany w `localStorage`; powracający użytkownik od razu widzi mapę z chipem trybu | Brak routera = mniej pracy; mapa ładuje się w tle; „Zmień” wraca do tego samego ekranu |
| R2 | Etykiety „Osoba na wózku”, „Senior”, „Turysta” | **Zaakceptowane.** Wybór profilu = ustawienie filtrów i preferencji wg naszych reguł + informacja, jaki tryb ktoś wybrał. Ten sam zestaw, ale sformułowany jako potrzeba: **„Poruszam się na wózku”**, **„Wolniejsze tempo, mniej podejść”** (senior), **„Zwiedzam miasto”**, **„Jestem z wózkiem dziecięcym”**, **„Bez profilu”** | Zgodne z zasadą „nie pytamy o niepełnosprawność”; jury od dostępności to zauważy. Emoji/ikony zostają |
| R3 | 4 profile + gość, każdy z innymi warstwami | Profil = **preferencje trasy + domyślne warstwy mapy**. Backend dostaje presety `senior` i `walk` (dziś nieznany profil = po cichu wózek!) | Bez poprawki backendu „Turysta” i „Gość” dostawałyby trasy dla wózka |
| R4 | Szybkie akcje: Toalety, Parking, Bariery, Miejsca, Wydarzenia | **Zaakceptowane z danymi przykładowymi.** Chipy = warstwy: Bariery, Toalety i zdrowie, Instytucje, Jedzenie i kultura, Odpoczynek (ławki), Parking OzN, Wydarzenia, Zgłoszenia. Ławki/parking/wydarzenia/przewijaki na danych przykładowych (§5.8), backend później | Chipy porządkują też bałagan z #81 |
| R5 | Panel „Dla Ciebie” z polecanymi, toaletami, wydarzeniami, ostatnio używanymi | „Dla Ciebie” = **trasy demo jako szybki start** + **dostępne w pobliżu dla profilu** + **wydarzenia (przykładowe)** + **bariery w widoku** | Trasy demo muszą zostać pod ręką na pitch |
| R6 | Trasy: najłatwiejsza / najszybsza / najpewniejsza / samochód + wózek | Warianty z API (#73/#80) z etykietami w stylu Jakdojade; **bez** samochodu | Samochód = #64 (Faza 5), brak danych o parkingach |
| R7 | Karta miejsca: paszport, wejście, toaleta, parking, zdjęcia, wiarygodność | Karta miejsca w **panelu** (nie w dymku na mapie): atrybuty z API z źródłem, datą i pewnością + „Prowadź tutaj”, „Ustaw jako start”, „Zgłoś zmianę”. Bez zdjęć | Dane są; zdjęcia = #57 (Faza 5). Dymek na mapie zostaje mały (nazwa + „Szczegóły”) |
| R8 | Personalizacja: 3 sekcje, w tym ławki, windy, „tylko zweryfikowane” | Szuflada z 3 sekcjami: Ruch i trasy (`RoutePreferences` + „pokazuj miejsca odpoczynku na trasie”), Na mapie (warstwy), Dane (pokazuj miejsca bez danych / ostrzegaj o zgłoszeniach). „Tylko zweryfikowane” pominięte – brak logiki | Ławki działają na danych przykładowych (§5.8) |
| R9 | – | **Rozbicie `HomePage.tsx` (507 linii, 24 stany) na stan aplikacji + osobne pliki widoków** jako pierwsze zadanie | Ten plik powodował konflikty przez cały dzień; bez podziału 5 osób nie zrobi zadań równolegle |
| R10 | – | **Zaakceptowane.** Zgłoszenie bariery jako **osobny stan panelu**, uruchamiany z karty miejsca, z odcinka trasy albo z mapy – nie jako sekcja w „Dla Ciebie” | Dziś formularz wisi na stałe w panelu |

## 2. Docelowy układ (laptop)

```
┌────────────────────────────────────────────────────────────────────────────┐
│ [logo] Kraków bez Barier  [🔍 Dokąd chcesz dotrzeć?        ] [Tryb: ♿ … ▾] │  ← TopBar
│                           [Bariery][Toalety i zdrowie][Instytucje][…]       │  ← chipy warstw
├──────────────────────┬─────────────────────────────────────────────────────┤
│ PANEL (400 px)       │                                                     │
│ ← Wstecz   Tytuł     │                    MAPA                             │
│ ──────────────────── │          (MapView, cała pozostała przestrzeń)       │
│ treść zależna od     │                                                     │
│ stanu panelu         │                                   [Legenda ▾]       │
│ (explore/route/      │                                                     │
│  place/report)       │                                                     │
└──────────────────────┴─────────────────────────────────────────────────────┘
StartScreen: warstwa na całym ekranie, dopóki profil nie jest wybrany.
SettingsDrawer: szuflada z prawej („Dostosuj”), nad mapą.
```

## 3. Stan aplikacji (kontrakt – ustalić w FE1, reszta zadań z niego korzysta)

Plik `frontend/src/app/AppState.tsx`: React Context + `useReducer`. **Jedyny** właściciel stanu, który dziś siedzi w `HomePage`.

```ts
type ProfileId = 'wheelchair' | 'senior' | 'tourist' | 'stroller' | 'guest'
type LayerId =
  | 'barriers' | 'health' | 'institutions' | 'places' | 'reports'   // dane z backendu
  | 'rest' | 'parking' | 'events'                                     // dane przykładowe (§5.8)

type PanelState =
  | { kind: 'explore' }                                   // „Dla Ciebie”
  | { kind: 'route' }                                     // A/B, warianty, opis
  | { kind: 'place'; place: SelectedPlace }               // karta miejsca
  | { kind: 'report'; point: NamedPoint | null }          // zgłoszenie

interface AppState {
  profile: ProfileId | null          // null = pokaż StartScreen
  prefs: RoutePreferences            // z presetu, potem ręcznie zmieniane
  customized: boolean                // true po zmianie w szufladzie → chip „Tryb: … (dostosowany)”
  layers: Record<LayerId, boolean>   // domyślne z presetu
  panel: PanelState
  history: PanelState[]              // „← Wstecz”
  origin: NamedPoint | null
  destination: NamedPoint | null
  route: RouteResponse | null
  variant: number
  segment: number | null
  settingsOpen: boolean
}
```

Akcje (nazwy obowiązują w zadaniach): `chooseProfile`, `resetProfile`, `setPrefs`, `toggleLayer`, `openPanel`, `back`, `setOrigin`, `setDestination`, `setRoute`, `setVariant`, `setSegment`, `openSettings`, `closeSettings`.
Utrwalane w `localStorage` (try/catch): `profile`, `prefs`, `customized`, `layers`. **Nie** utrwalamy lokalizacji (prywatność).
Pobieranie trasy zostaje jak dziś (debounce + `AbortController`), przeniesione do hooka `useRoute()` w `src/app/`.

## 4. Presety profili (jedno źródło: backend)

| Profil (UI) | `profile` w API | Ruch i trasy | Warstwy domyślnie włączone |
|---|---|---|---|
| ♿ Poruszam się na wózku | `wheelchair` | bez schodów, nachylenie ≤ 6%, krawężnik ≤ 2 cm, omija bruk | bariery, toalety i zdrowie, instytucje, parking |
| 👴 Wolniejsze tempo, mniej podejść | `senior` (**nowy**) | bez schodów, nachylenie ≤ 8%, krawężnik ≤ 5 cm, lekka kara za bruk; miejsca odpoczynku na trasie | toalety i zdrowie, odpoczynek, instytucje |
| 🧳 Zwiedzam miasto | `walk` (**nowy**) | schody dozwolone, bez limitów, bez kar | instytucje, jedzenie i kultura, wydarzenia |
| 👶 Jestem z wózkiem dziecięcym | `stroller` | jak dziś; przewijaki w kartach toalet | bariery, toalety i zdrowie, odpoczynek |
| 👤 Bez profilu | `walk` | jak „Zwiedzam miasto” | instytucje |

Backend (`routing/profiles.py`): dodać `PROFILES["senior"]` i `PROFILES["walk"]` (neutralny: brak kar, `wheelchair_no_impassable=False`) oraz zmienić fallback w `profile_from_preferences` z `wheelchair` na `walk`. Endpoint `GET /api/profiles` (etykieta, opis, ikona, domyślne `RoutePreferences`, domyślne warstwy), żeby frontend nie trzymał kopii (dziś presety są w dwóch miejscach: `profiles.py` i `api/client.ts`).

## 5. Ekrany i stany panelu

### 5.1 StartScreen (`src/views/StartScreen.tsx`)
- Nagłówek „Kraków bez Barier”, podtytuł „Jak się poruszasz? Dopasujemy trasy i mapę.”
- 4 duże kafelki (`button`, ikona + etykieta + 1 linia opisu) + link-przycisk „Kontynuuj bez profilu”.
- Pod spodem: „Zawsze możesz to zmienić i dostosować na mapie.”
- A11y: `role="dialog" aria-modal="true"`, fokus na nagłówku, kafelki w jednej grupie z `aria-describedby`, Esc = „bez profilu”.
- Akcja: `chooseProfile(id)` → presety z `/api/profiles` → StartScreen znika, panel `explore`.

### 5.2 TopBar (`src/views/TopBar.tsx`)
- `MapSearch` (istnieje, #78) jako główne pole „Dokąd chcesz dotrzeć?”. Wybór wyniku → `openPanel({kind:'place'})`.
- `ProfileChip`: „Tryb: ♿ Poruszam się na wózku” (+ „· dostosowany”), menu: `Zmień tryb` (→ `resetProfile`), `Dostosuj` (→ `openSettings`).
- `LayerChips`: przełączniki `aria-pressed` dla `LayerId`; stan w `layers`. Chip pokazuje liczbę obiektów w widoku, gdy > 0.

### 5.3 Panel `explore` – „Dla Ciebie” (`src/views/panels/ExplorePanel.tsx`)
1. **Zaplanuj trasę:** przycisk „Wyznacz trasę” (→ `route`) + trasy demo jako chipy (`PRESETS` z `HomePage`).
2. **Dostępne w pobliżu:** do 5 miejsc z widoku mapy pasujących do profilu (`wheelchair=yes`/`limited`), każde → karta miejsca.
3. **Bariery w widoku:** `BarrierList` (istnieje, #79), zwinięta do 5 pozycji + „Pokaż wszystkie”.

### 5.4 Panel `route` (`src/views/panels/RoutePanel.tsx`)
Kolejność: `RoutePoints` (A/B z `AddressSearch` i pinezkami) → `RouteAlternatives` (karty wariantów w stylu Jakdojade: czas, długość, schody, bruk, wynik) → `RouteSummary` (z barierami na trasie) → `RouteDescription` z `SegmentDetails`. Na dole: „Zgłoś barierę na tej trasie” (→ `report` z punktem wybranego odcinka).

### 5.5 Panel `place` – karta miejsca (`src/views/panels/PlacePanel.tsx`)
- Nagłówek: nazwa, kategoria po polsku, odległość.
- Status dostępności słowem + ikoną (dostępne / częściowo / niedostępne / brak danych – brak danych **nigdy** jako „dostępne”).
- Paszport: lista atrybutów (`ATTRIBUTE_LABEL`, `VALUE_LABEL`), przy każdym źródło, data (`formatDate`), pewność, status (`dataStatus.ts`); konflikty pokazane wprost.
- Akcje: **„Prowadź tutaj”** (`setDestination` + `route`), „Ustaw jako start”, „Zgłoś zmianę” (→ `report`).
- Źródło danych: `Place` z `/api/places`, instytucja z `/api/institutions`, wynik z `/api/search` – mapowane do jednego typu `SelectedPlace` w `src/app/selectedPlace.ts`.
- Dymek na mapie (`MapPopupCard`) zostaje tylko z nazwą i przyciskiem „Szczegóły”.

### 5.6 Panel `report` (`src/views/panels/ReportPanel.tsx`)
`ReportForm` (istnieje, #72) przeniesiony do panelu; punkt podany z kontekstu (miejsce / odcinek / klik na mapie). Po wysłaniu: potwierdzenie i „← Wróć”.

### 5.7 SettingsDrawer – personalizacja (`src/views/SettingsDrawer.tsx`)
- **Ruch i trasy:** omijaj schody, omijaj nierówną nawierzchnię, maks. nachylenie, maks. krawężnik (dzisiejszy `PreferencesForm`).
- **Na mapie:** te same warstwy co chipy, z opisami.
- **Dane:** „Pokazuj miejsca bez danych o dostępności” (domyślnie tak), „Pokazuj zgłoszenia użytkowników” (= warstwa `reports`).
- Przyciski: „Przywróć ustawienia trybu”, „Zamknij”. Zmiana = `customized: true`, trasa przelicza się sama.
- A11y: `role="dialog"`, pułapka fokusu, Esc zamyka, fokus wraca na chip trybu.

### 5.8 Dane przykładowe (`src/api/demo.ts`, `src/api/demoData/*.json`)
Kontrakt jak przyszłe API: funkcje asynchroniczne (`Promise`), filtr po `bbox`, te same typy co później w `schema.d.ts`.
```ts
interface DemoPoi { id: string; kind: 'bench' | 'shelter' | 'parking_disabled' | 'changing_table'
  name: string | null; location: LatLon; details: Record<string, string | number | boolean>; source: 'demo' }
interface DemoEvent { id: string; title: string; start: string; end: string; venueName: string
  location: LatLon; features: ('napisy' | 'PJM' | 'audiodeskrypcja' | 'pętla indukcyjna')[]; source: 'demo' }
export const demoApi = {
  restSpots(bbox: string): Promise<DemoPoi[]>,       // ławki i zadaszenia (~30, wzdłuż Plant i tras demo)
  parkingSpots(bbox: string): Promise<DemoPoi[]>,    // koperty OzN (~8, Rynek/Wawel/Kazimierz), details: liczba miejsc
  events(): Promise<DemoEvent[]>,                    // ~6 wydarzeń w instytucjach z #75
  changingTables(): Promise<DemoPoi[]>,              // ~5 przewijaków przy toaletach
}
```
- Współrzędne realistyczne (np. ławki odczytane z OSM `amenity=bench`), żeby demo było wiarygodne.
- `source: 'demo'` → w karcie miejsca etykieta „dane przykładowe”.
- „Miejsca odpoczynku na trasie”: liczone we froncie (punkty `restSpots` ≤ 30 m od geometrii trasy), pokazywane w panelu trasy.
- Backend później: ławki i przewijaki z OSM (`amenity=bench`, `changing_table=yes`), parking = #64, wydarzenia = #60. Podmiana = zamiana ciała funkcji w `demoApi` na `request()`.

## 6. Mapa (`MapView.tsx`)
- Bez zmiany API trasy. Nowy prop `layers: Record<LayerId, boolean>` steruje widocznością warstw (`setLayoutProperty('visibility')`).
- Miejsca jako warstwa GeoJSON z klastrami (#81) zamiast 200 znaczników DOM. Jeśli #81 nie zdąży: minimum to ukrycie miejsc pod chipem „Jedzenie i kultura” (domyślnie wyłączony dla wózka).
- Klik w obiekt → `openPanel({kind:'place'})`, klik w odcinek trasy → `setSegment` (jak dziś).

## 7. Podział plików (żeby zadania nie kolidowały)

| Plik / katalog | Właściciel (zadanie) | Inni |
|---|---|---|
| `src/app/AppState.tsx`, `src/app/useRoute.ts`, `src/app/selectedPlace.ts` | FE1 | tylko czytają / wołają akcje |
| `src/pages/HomePage.tsx` → cienki `MapScreen` (layout) | FE1 | **nikt więcej go nie edytuje** |
| `src/views/StartScreen.tsx`, `ProfileChip` | FE2 | |
| `src/views/TopBar.tsx`, `LayerChips` | FE3 | |
| `src/views/panels/ExplorePanel.tsx` | FE4 | |
| `src/views/panels/RoutePanel.tsx` | FE5 | |
| `src/views/panels/PlacePanel.tsx` | FE6 | |
| `src/views/SettingsDrawer.tsx` | FE7 | |
| `src/views/panels/ReportPanel.tsx` | FE8 | |
| `src/api/demo.ts`, `src/api/demoData/` | FE9 | czytają FE3, FE4, FE5, FE6 |
| warstwy `rest`, `parking`, `events` w `MapView` + ich karty | FE10 | |
| `backend/app/routing/profiles.py`, `backend/app/api/profiles.py` | BE1 | |
| `MapView.tsx` | FE3 (warstwy) | FE6 tylko klik → panel |

FE1 tworzy **puste szkielety** wszystkich plików z `views/` (komponent z nagłówkiem i `TODO`), podpięte w `MapScreen`. Każde kolejne zadanie wypełnia swój plik.

## 8. Harmonogram (6 h, ok. 5 osób)

| Czas | Równolegle |
|---|---|
| 0:00–1:15 | **FE1** (stan + szkielety, blokuje resztę), **BE1** (presety backend), **FE9** (dane przykładowe), **FE2** (StartScreen – na mocku stanu z §3), **FE7** (szuflada – komponent na propsach) |
| 1:15–4:00 | FE3, FE4, FE5, FE6, FE8, FE10 (każdy w swoim pliku) |
| 4:00–5:00 | integracja, przejście ścieżki demo klawiaturą, poprawki |
| 5:00–6:00 | zamrożenie, `make seed` na czystym klonie, próba demo, aktualizacja `docs/demo-scenario.md` |

Zasada merge'ów: małe PR-y, każdy po `git pull` i z zielonym CI; FE1 merge'owany jako pierwszy, możliwie szybko.

## 9. Kryteria odbioru całości
1. Pierwsze wejście → StartScreen; wybór „Poruszam się na wózku” → mapa z chipem trybu i panelem „Dla Ciebie”.
2. „Rynek → Wawel” z „Dla Ciebie” → panel trasy z wariantami, opisem i panelem odcinka; mapa pokazuje trasę.
3. Wyszukanie „apteka” → karta miejsca w panelu z paszportem i źródłami → „Prowadź tutaj” → trasa.
4. „Dostosuj” → zmiana maks. krawężnika → trasa przelicza się, chip „· dostosowany”.
5. „Zmień tryb” → StartScreen; „Bez profilu” → trasa dopuszcza schody.
6. Całość klawiaturą: Tab nie przechodzi przez setki znaczników; panel ma „← Wstecz”; Esc zamyka szufladę i StartScreen.
7. Odświeżenie strony zachowuje tryb i personalizację.
8. Testy: istniejące zielone, nowe dla reducera `AppState`, StartScreen i SettingsDrawer.

## 10. Poza zakresem (świadomie)
Telefon i responsywność, routing samochodowy (#64), prawdziwe API ławek/parkingów/wydarzeń (backend później), zdjęcia (#57), panel moderatora i potwierdzanie zgłoszeń (#62), konta użytkowników, routing URL.

## 11. Wpływ na istniejące zadania (do potwierdzenia w kroku „taski”)
- **#81** (porządek na mapie) → wchłonięte przez FE3 (warstwy + klastry).
- **#35** (zapamiętywanie preferencji) → wchłonięte przez FE1/FE2 (`localStorage`); PWA zostaje osobno.
- **#55** (rozszerzony profil, Faza 5) → presety `senior`/`walk` i `/api/profiles` przechodzą do BE1; reszta zostaje.
- **#59** („Miejsca dla mnie”, Faza 5) → minimalna wersja w FE4 („Dostępne w pobliżu”).
- **#56** (paszport, Faza 5) → FE6 pokazuje istniejące atrybuty; nowe dane zostają w #56.
- **#33, #34, #32** (a11y, Faza 3) → zostają, ale testują nowy układ; #34 bez telefonu.

## 12. Zadania na tablicy (Faza 3)

| Zadanie | Issue | Czas | Zależy od |
|---|---|---|---|
| FE1 Stan aplikacji i szkielet układu (**pierwsze**) | #86 | 1 h | – |
| BE1 Presety trybów + `/api/profiles` | #87 | 1 h | – |
| FE9 Dane przykładowe | #89 | 1 h | – |
| FE2 Ekran wyboru trybu + chip | #88 | 1 h | #86, #87 |
| FE7 Personalizacja (szuflada) | #94 | 1 h | #86 |
| FE3 Górny pasek, chipy warstw, porządek na mapie | #90 | 2 h | #86 (zamyka #81) |
| FE4 Panel „Dla Ciebie” | #91 | 1 h | #86, #89 |
| FE5 Panel trasy | #92 | 1 h | #86, #89 |
| FE6 Karta miejsca | #93 | 1,5 h | #86 |
| FE8 Zgłoszenie jako stan panelu | #95 | 45 min | #86 |
| FE10 Warstwy z danymi przykładowymi | #96 | 1 h | #90, #89 |
| BE2 Ławki i przewijaki z OSM (jeśli starczy czasu) | #97 | 1,5 h | #89 |
