# Architektura

```
┌──────────────────────┐      /api/*       ┌───────────────────────────┐      ┌──────────────┐
│ Frontend (React+Vite)│ ───────────────▶  │ Backend (FastAPI)         │ ───▶ │ PostgreSQL + │
│ MapLibre, PWA        │   proxy Vite      │ api → providers →         │      │ PostGIS      │
│ typy z OpenAPI       │ ◀───────────────  │ normalization → routing   │      └──────────────┘
└──────────────────────┘      JSON         └───────────┬───────────────┘
                                                       │ HTTP
                                     ┌─────────────────┴──────────────────┐
                                     │ OSM/Overpass, Kraków Open Data,    │
                                     │ MSIP, zgłoszenia użytkowników      │
                                     └────────────────────────────────────┘
```

## Przepływ danych

1. **Providery** (`backend/app/providers/`) pobierają dane z zewnętrznych źródeł i zamieniają je na `Place` z listą `AccessibilityAttribute`. Każdy atrybut ma provenance.
2. **ProviderService** (`providers/service.py`) uruchamia providery włączone w `cities/<miasto>.yaml`; wynik zapisuje do `data/cache/`. Gdy źródło nie działa – bierze ostatni cache.
3. **Normalizacja** (`normalization/merge.py`) łączy atrybuty z wielu źródeł: wybiera wartość o najwyższym efektywnym confidence, oznacza konflikty (`conflicting`) i przestarzałe dane (`outdated`).
4. **Routing** (`routing/`) – graf pieszy z OSM (osmnx), koszt krawędzi zależny od profilu (`wheelchair`, `stroller`) i preferencji użytkownika.
5. **API** (`api/`) wystawia wszystko pod `/api/*`. OpenAPI → typy TS dla frontendu.

## Kluczowe decyzje

| Decyzja | Dlaczego |
|---|---|
| Web/PWA zamiast natywnej apki | WCAG łatwo audytować (axe, Lighthouse), demo = link |
| Miasto jako plik YAML | Skalowalność: nowe miasto bez zmian w kodzie |
| Provenance w modelu od początku | Wiarygodność danych, obsługa konfliktów |
| Routing w Pythonie (osmnx + networkx) | Pełna kontrola nad wagami, cały zespół zna Pythona |
| Preferencje zamiast pytania o niepełnosprawność | Prywatność i godność użytkownika |
