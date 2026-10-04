# Audyt WCAG 2.2 AA

## Jak sprawdzać

- **Automatycznie:** Lighthouse (Chrome DevTools → Lighthouse → Accessibility), rozszerzenie axe DevTools.
- **Lint:** `npm run lint` (oxlint z pluginem `jsx-a11y`) – w CI.
- **Klawiatura:** przejdź całą aplikację tylko Tab / Shift+Tab / Enter / Spacja. Fokus zawsze widoczny.
- **Czytnik ekranu:** VoiceOver (macOS: Cmd+F5), NVDA (Windows).
- **Zoom 200% i 320 px szerokości:** brak poziomego scrolla, nic się nie ucina.

## Wzorce w kodzie

- Skip link „Przejdź do treści” (`App.tsx`)
- Mapa ma tekstową alternatywę: `RouteDescription`, `PlaceList`
- Komunikaty błędów `role="alert"`, wyniki w `aria-live="polite"`
- Każde pole formularza ma `<label>`
- Status danych opisany tekstem, nie tylko kolorem
- Cele dotykowe ≥ 24×24 px, widoczny fokus (`:focus-visible`)

## Wyniki

| Data | Narzędzie | Wynik | Uwagi |
|---|---|---|---|
| 4.10.2026 | Lighthouse 13.5 (Accessibility, desktop) | **100/100** | po poprawkach z #32; jedna uwaga informacyjna (waga 0) – fałszywy alarm, patrz niżej |
| 4.10.2026 | axe-core 4.13 (WCAG 2.0/2.1/2.2 A i AA) | **0 problemów** w 7 stanach × tryb jasny i ciemny | przed poprawkami: 3 rodzaje problemów (niżej) |
| | VoiceOver | | #33 |

### Co sprawdzał axe (#32)

Stany aplikacji, każdy w trybie jasnym i ciemnym (`prefers-color-scheme`), okno 1400 × 900:
1. ekran wyboru trybu (pierwsze wejście),
2. panel „Dla Ciebie”,
3. panel „Trasa” (Rynek → Wawel, warianty, tabela porównania),
4. trasa z otwartym panelem szczegółów odcinka,
5. panel „Zgłoś barierę”,
6. wyszukiwarka z rozwiniętymi podpowiedziami,
7. karta miejsca.

### Znalezione i naprawione (#32)

| Problem | Kryterium | Gdzie | Poprawka |
|---|---|---|---|
| Link „MapLibre” w podpisie mapy różnił się od tekstu tylko kolorem (kontrast 2,02:1 z tekstem obok) | 1.4.1 Użycie koloru | każdy ekran z mapą | podkreślenie linków w `.maplibregl-ctrl-attrib` (selektor o wyższej wadze, bo styl MapLibre ładuje się po naszym) |
| Tabela porównania wariantów przewijana w poziomie, ale nieosiągalna z klawiatury | 2.1.1 Klawiatura, 1.4.10 Dopasowanie | panel „Trasa” | tabela mieści się w panelu bez przewijania (`table-layout: fixed`, dzielenie wyrazów z łącznikiem w wartościach) – zamiast robić kontener „do przewijania Tabem” |
| Podpis rodzaju instytucji `#00707a` na ciemnym tle: 2,88:1 | 1.4.3 Kontrast | karta miejsca, okienko na mapie (tryb ciemny) | zmienna `--institution-text`: `#00707a` w jasnym (5,8:1), `#4fc3cc` w ciemnym (8:1) |
| Znaczniki instytucji: widoczny podpis „UMK · Magistrat…” nie występował w nazwie przycisku („Urząd Miasta Krakowa — …”) – sterowanie głosem nie trafia | 2.5.3 Etykieta w nazwie | mapa | `institutionMarkerLabel()`: nazwa zaczyna się od widocznego podpisu, potem pełna nazwa; test |

### Świadomie pozostawione

- **Lighthouse `label-content-name-mismatch` na kafelkach ekranu wyboru trybu (waga 0, nie obniża wyniku).** Nazwą przycisku jest widoczna etykieta („Poruszam się na wózku”), opis pod nią jest podpięty przez `aria-describedby`. Lighthouse porównuje nazwę z całym tekstem kafelka (emoji + etykieta + opis). Kryterium 2.5.3 jest spełnione – komenda głosowa z widoczną etykietą trafia w przycisk.
- **Kafelki mapy (podkład OSM) i znaczniki** nie są w kolejności Tab – tekstową alternatywą są panele i listy (opis trasy, lista miejsc, lista barier, lista instytucji).

### Jak powtórzyć
- **axe:** rozszerzenie axe DevTools w Chrome, przejść stany 1–7 z listy wyżej, w trybie jasnym i ciemnym (DevTools → Rendering → `prefers-color-scheme`). W #32 robione automatycznie skryptem Playwright + `@axe-core/playwright` z tagami `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` (poza repo, żeby nie dokładać zależności do frontendu).
- **Lighthouse:** `npx lighthouse http://localhost:5173 --only-categories=accessibility --preset=desktop` albo Chrome DevTools → Lighthouse.
