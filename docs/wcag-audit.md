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
| | Lighthouse | | |
| | axe | | |
| | VoiceOver | | |
