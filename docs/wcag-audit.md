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
| 4.10.2026 | Lighthouse 13.5 (Accessibility, desktop) | **100/100**, bez uwag | nowy wygląd (#117), po poprawkach z #32 |
| 4.10.2026 | axe-core 4.13 (WCAG 2.0 / 2.1 / 2.2, A i AA) | **0 problemów** w 12 stanach × tryb jasny i ciemny (24 przebiegi) | przed poprawkami: 3 problemy (niżej) |
| | VoiceOver | | #33 |

### Co sprawdzał axe (#32, nowy wygląd)

Okno 1400 × 900, każdy stan w trybie jasnym i ciemnym (`prefers-color-scheme`), **wszystkie zwijane sekcje rozwinięte**:

1. ekran powitalny „Kraków bez Barier”,
2. ekran powitalny z wybranym kafelkiem,
3. panel „Dla Ciebie”,
4. pełna lista („Pokaż więcej”),
5. trasa Rynek → Wawel: warianty, „Porównanie i szczegóły” (tabela), „Opis krok po kroku”, panel szczegółów odcinka,
6. „Zgłoś barierę na tej trasie”,
7. wyszukiwarka z podpowiedziami,
8. karta miejsca z rozwiniętymi sekcjami (Dostępność, Źródła danych, Zdjęcia, Zgłoszenia),
9. personalizacja (chip profilu),
10. „Warstwy”,
11. „Legenda”,
12. dashboard miasta (`#/miasto`).

### Znalezione i naprawione (#32)

| Problem | Kryterium | Gdzie | Poprawka |
|---|---|---|---|
| Tabela porównania wariantów przewijana w poziomie (`min-width: 620px`), ale nieosiągalna z klawiatury | 2.1.1 Klawiatura, 1.4.10 Dopasowanie | trasa → „Porównanie i szczegóły” | tabela mieści się w panelu bez przewijania (`table-layout: fixed`, dzielenie wyrazów z łącznikiem w wartościach, nazwy cech w pierwszej kolumnie bez dzielenia) – zamiast robić kontener „do przewijania Tabem” |
| Podpis rodzaju instytucji `#00707a` na ciemnym tle: 2,97:1 | 1.4.3 Kontrast | karta miejsca, okienko na mapie (tryb ciemny) | zmienna `--institution-text`: `#00707a` w jasnym (5,8:1), `#4fc3cc` w ciemnym (6,8–9:1 na wszystkich tłach redesignu) |
| Znaczniki instytucji: widoczny podpis „UMK · Magistrat…” nie występował w nazwie przycisku („Urząd Miasta Krakowa — …”) – sterowanie głosem nie trafia | 2.5.3 Etykieta w nazwie | mapa | `institutionMarkerLabel()`: nazwa zaczyna się od widocznego podpisu, potem pełna nazwa (2 testy) |

Wcześniejszy audyt starego wyglądu (#114) znalazł też link „MapLibre” w podpisie mapy rozpoznawalny tylko kolorem – w nowym wyglądzie ten problem nie występuje.

### Świadomie pozostawione

- **Kafelki mapy i znaczniki** nie są w kolejności Tab – tekstową alternatywą są panele i listy (opis trasy, „Dla Ciebie”, pełne listy miejsc, barier i instytucji).

### Jak powtórzyć
- **axe:** rozszerzenie axe DevTools w Chrome, przejść stany 1–12 z listy wyżej z rozwiniętymi sekcjami, w trybie jasnym i ciemnym (DevTools → Rendering → `prefers-color-scheme`). W #32 robione automatycznie skryptem Playwright + `@axe-core/playwright` z tagami `wcag2a, wcag2aa, wcag21a, wcag21aa, wcag22aa` (poza repo, żeby nie dokładać zależności do frontendu).
- **Lighthouse:** `npx lighthouse http://localhost:5173 --only-categories=accessibility --preset=desktop` albo Chrome DevTools → Lighthouse.
