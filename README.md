# HackYeah2026

Repo do hackatonu 3.10–4.10.2026 dla naszego teamu.

Aplikacja webowa (PWA) do planowania **dostępnych tras** po mieście dla osób na wózkach inwalidzkich i rodziców z wózkami dziecięcymi. Łączy dane z wielu źródeł (OSM, otwarte dane Krakowa, MSIP, zgłoszenia użytkowników) i przy każdej informacji pokazuje, skąd pochodzi i na ile jej ufamy.

**Stack:** React + Vite + TypeScript + MapLibre · FastAPI (Python, uv) · PostgreSQL + PostGIS · Docker Compose

---

## Spis treści

1. [Szybki start](#szybki-start)
2. [Struktura repo](#struktura-repo)
3. [Gdzie dodać kod](#gdzie-dodać-kod)
4. [Jak to działa](#jak-to-działa)
5. [Praca w zespole (git, PR, CI)](#praca-w-zespole)
6. [Komendy](#komendy)
7. [Uruchamianie bez Dockera](#uruchamianie-bez-dockera)
8. [FAQ / problemy](#faq--problemy)

---

## Szybki start

Wymagany: **Docker Desktop** (uruchomiony) i `make`.

```bash
git clone https://github.com/micchask/HackYeah2026.git && cd HackYeah2026
cp .env.example .env
make up
```

| Co | Adres |
|---|---|
| Aplikacja (frontend) | http://localhost:5173 |
| Dokumentacja API (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health |
| Baza PostGIS | `localhost:5432`, user/hasło/baza: `app` / `app` / `app` |

Kod backendu i frontendu jest podmontowany do kontenerów, więc **zmiany w plikach przeładowują się same**. `make up` trzeba powtórzyć tylko po zmianie zależności (`pyproject.toml`, `package.json`).

`make logs` pokazuje logi, `make down` zatrzymuje kontenery.

---

## Struktura repo

```
HackYeah2026/
├── README.md                  ← jesteś tutaj
├── docker-compose.yml         # db (PostGIS) + backend + frontend
├── Makefile                   # make up / test / lint / format / gen-api
├── .env.example               # wzór zmiennych środowiskowych (kopiuj do .env)
├── .pre-commit-config.yaml    # ruff, oxlint, prettier przed commitem
├── .github/
│   ├── workflows/ci.yml       # CI: lint + testy + build (backend i frontend)
│   ├── pull_request_template.md
│   └── CODEOWNERS
│
├── backend/                   # Python 3.12+, FastAPI, zarządzany przez uv
│   ├── pyproject.toml         # zależności + konfiguracja ruff/pytest
│   ├── uv.lock                # zablokowane wersje (commitujemy!)
│   ├── Dockerfile
│   ├── cities/
│   │   └── krakow.yaml        # konfiguracja miasta: bbox, centrum, providery
│   ├── app/
│   │   ├── main.py            # tworzenie aplikacji FastAPI, CORS, start bazy
│   │   ├── config.py          # ustawienia z .env (Settings)
│   │   ├── cities.py          # wczytywanie cities/*.yaml
│   │   ├── api/               # endpointy HTTP (cienka warstwa, bez logiki)
│   │   │   ├── health.py      #   GET  /api/health
│   │   │   ├── cities.py      #   GET  /api/cities
│   │   │   ├── places.py      #   GET  /api/places
│   │   │   ├── routes.py      #   POST /api/routes
│   │   │   └── reports.py     #   POST/GET /api/reports
│   │   ├── models/            # modele Pydantic = kontrakt API
│   │   │   ├── accessibility.py  # AccessibilityAttribute + Provenance  ★
│   │   │   ├── place.py, route.py, report.py, geo.py
│   │   ├── providers/         # źródła danych (OSM, open data, MSIP, zgłoszenia)
│   │   │   ├── base.py        #   klasa bazowa Provider + rejestr
│   │   │   ├── service.py     #   uruchamianie providerów, cache, fallback
│   │   │   └── osm.py, krakow_open_data.py, msip.py, user_reports.py
│   │   ├── normalization/     # łączenie źródeł, konflikty, confidence
│   │   ├── routing/           # profile wag (wheelchair, stroller), graf OSM
│   │   ├── db/                # SQLAlchemy + PostGIS: sesja, tabele
│   │   └── mocks/             # dane przykładowe dla frontendu
│   └── tests/                 # pytest (bez bazy i bez sieci)
│
├── frontend/                  # React 19 + Vite + TypeScript
│   ├── package.json           # skrypty: dev, build, lint, test, gen:api
│   ├── openapi.json           # schemat API wygenerowany z backendu
│   ├── .oxlintrc.json         # linter z regułami dostępności (jsx-a11y)
│   ├── Dockerfile
│   └── src/
│       ├── main.tsx, App.tsx  # wejście, skip link, layout
│       ├── index.css          # zmienne kolorów (kontrast AA), fokus, responsywność
│       ├── api/
│       │   ├── client.ts      # funkcje do wołania API + aliasy typów
│       │   └── schema.d.ts    # GENEROWANE z OpenAPI, nie edytować ręcznie
│       ├── components/        # komponenty wielokrotnego użytku (+ testy *.test.tsx)
│       ├── pages/             # widoki/strony składające komponenty
│       └── test/setup.ts      # konfiguracja vitest
│
├── data/                      # cache i surowe dane (ignorowane przez git)
└── docs/
    ├── architecture.md        # diagram i przepływ danych
    ├── data-sources.md        # tabela źródeł danych i licencji
    ├── business-model.md      # do pitchu
    ├── security-privacy.md    # prywatność, RODO, zasady
    └── wcag-audit.md          # jak testować dostępność + wyniki audytu
```

---

## Gdzie dodać kod

| Chcę… | Gdzie | Uwagi |
|---|---|---|
| **dodać nowe źródło danych** | `backend/app/providers/<nazwa>.py` | klasa `Provider` + `@register_provider("nazwa")`, import w `providers/__init__.py`, wpis w `cities/krakow.yaml`. Szczegóły w [docs/data-sources.md](docs/data-sources.md) |
| **dodać nowe miasto** | `backend/cities/<miasto>.yaml` | skopiuj `krakow.yaml`, zmień bbox/centrum/providery. **Żadnych `if city == ...` w kodzie** |
| **dodać nową cechę dostępności** (np. „szerokość drzwi”) | `AttributeKey` w `backend/app/models/accessibility.py` | potem mapowanie w providerze |
| **zmienić logikę łączenia źródeł / konfliktów** | `backend/app/normalization/merge.py` | |
| **zmienić wagi tras** (schody, nachylenie, nawierzchnia) | `backend/app/routing/profiles.py` | `edge_cost()` i `PROFILES` |
| **budowa grafu / algorytm trasy** | `backend/app/routing/graph.py` | osmnx + networkx |
| **nowy endpoint** | nowy plik w `backend/app/api/` | dodaj router w `api/__init__.py`, potem `make gen-api` |
| **zmienić kształt danych w API** | `backend/app/models/` | potem `make gen-api` i commit `schema.d.ts` |
| **tabela w bazie** | `backend/app/db/tables.py` | tworzy się automatycznie przy starcie (`create_all`) |
| **komponent UI** | `frontend/src/components/` | z testem `*.test.tsx` obok |
| **nowy widok/strona** | `frontend/src/pages/` | |
| **wołanie API z frontu** | `frontend/src/api/client.ts` | używaj typów z `schema.d.ts` |
| **kolory, fokus, layout** | `frontend/src/index.css` | sprawdzaj kontrast (min. 4.5:1) |
| **testy backendu** | `backend/tests/test_*.py` | bez sieci: zapisz próbkę odpowiedzi i testuj `parse()` |
| **dokumentacja / pitch** | `docs/` | |
| **duże pliki z danymi** | `data/raw/` | nie trafiają do gita; opisz źródło w `docs/data-sources.md` |

Szukajcie w kodzie znaczników `TODO(dane)`, `TODO(routing)`, `TODO(api)`, `TODO(frontend)`, `TODO(pitch)` – to są wstępnie przypisane zadania:

```bash
grep -rn "TODO(" backend/app frontend/src docs
```

---

## Jak to działa

### Model danych: provenance od pierwszej godziny

Nie zapisujemy „gołych” wartości typu `wheelchair=yes`. Każda informacja to `AccessibilityAttribute`:

```python
AccessibilityAttribute(
    key="elevator",                 # co (AttributeKey)
    value=True,                     # wartość
    provenance=Provenance(
        source="msip",              # skąd
        source_type="msip",
        source_ref="obj-123",       # ID w źródle
        fetched_at=...,             # kiedy pobrane
        last_verified=...,          # kiedy ostatnio potwierdzone
    ),
    confidence=0.8,                 # na ile ufamy (0–1)
    status="verified",              # verified | unverified | conflicting | outdated
    alternatives=[...],             # wartości z innych źródeł przy konflikcie
)
```

### Przepływ

```
cities/krakow.yaml ─▶ providers (OSM, MSIP, …) ─▶ cache data/ ─▶ normalization ─▶ baza / API ─▶ frontend
                                                  (fallback przy awarii)            ▲
                                       routing: graf OSM + profil wag ─────────────┘
```

1. **Providery** pobierają dane ze źródeł i zamieniają je na `Place` z atrybutami.
2. Jeśli źródło nie odpowiada, `providers/service.py` bierze ostatni zapisany cache z `data/cache/`.
3. **Normalizacja** wybiera wartość o najwyższym confidence, podnosi pewność gdy źródła się zgadzają, oznacza konflikty i dane starsze niż 2 lata.
4. **Routing** liczy koszt każdej krawędzi wg profilu (`wheelchair`, `stroller`) i preferencji użytkownika. Schody lub zbyt strome odcinki = krawędź nieprzejezdna.
5. **API** zwraca trasę z **tekstowym opisem segment po segmencie** – to tekstowa alternatywa mapy (WCAG).

### Kontrakt API frontend ↔ backend

FastAPI generuje schemat OpenAPI z modeli Pydantic. Z niego `openapi-typescript` generuje typy TS:

```bash
make gen-api   # backend/app/models → frontend/openapi.json → frontend/src/api/schema.d.ts
```

Dzięki temu po zmianie modelu na backendzie TypeScript od razu pokaże, co trzeba poprawić na froncie.

### Mocki

`/api/places` i `/api/routes` zwracają na razie dane z `backend/app/mocks/data.py` (odpowiedź ma `is_mock: true`). Frontend może być rozwijany niezależnie od routingu. Gdy prawdziwa implementacja będzie gotowa, podmieniamy wywołanie w `api/*.py` – kontrakt się nie zmienia.

### Dostępność (WCAG 2.2 AA)

To ok. 20% oceny, więc pilnujemy jej od początku:

- linter `oxlint` z pluginem `jsx-a11y` działa w CI i pre-commit,
- mapa nigdy nie jest jedynym nośnikiem informacji (opis trasy + lista miejsc tekstem),
- **nie pytamy o niepełnosprawność**, tylko o preferencje trasy,
- checklista i sposób testowania: [docs/wcag-audit.md](docs/wcag-audit.md).

---

## Praca w zespole

### Podział ról

| Osoba | Obszar | Główne katalogi |
|---|---|---|
| 1 | Dane: providery OSM, Kraków Open Data, MSIP, cache, fallback | `backend/app/providers/`, `backend/cities/`, `docs/data-sources.md` |
| 2 | Routing: graf, profile wag, opis trasy tekstem | `backend/app/routing/` |
| 3 | API + baza: modele, endpointy, zgłoszenia, konflikty | `backend/app/api/`, `models/`, `db/`, `normalization/` |
| 4 | Frontend: mapa, wyszukiwanie, preferencje | `frontend/src/` |
| 5 | Frontend a11y + pitch: WCAG, docs, slajdy, film | `frontend/src/`, `docs/` |

### Git flow

```bash
git checkout main && git pull
git checkout -b feat/routing-graph       # feat/…, fix/…, docs/…, chore/…
# …praca…
make format && make lint && make test
git add -p && git commit -m "routing: graf z osmnx dla bbox miasta"
git push -u origin feat/routing-graph
# → Pull Request na GitHubie
```

Zasady:

- **`main` jest chroniony** – zmiany tylko przez PR.
- PR wymaga **1 review** i **zielonego CI**.
- Małe PR-y, często. Lepiej 5 małych niż 1 ogromny na koniec.
- Zmieniasz modele API? Uruchom `make gen-api` i commituj `frontend/openapi.json` + `frontend/src/api/schema.d.ts` w tym samym PR.
- Nie commitujemy `.env`, danych z `data/` ani sekretów.

### Pre-commit (zalecane)

```bash
uvx pre-commit install    # jednorazowo; potem ruff/oxlint/prettier odpalą się przy commicie
```

### CI

`.github/workflows/ci.yml` przy każdym PR i pushu do `main`:

- **backend:** `ruff check`, `ruff format --check`, `pytest`
- **frontend:** `oxlint`, `prettier --check`, `tsc`, `vitest`, `vite build`

---

## Komendy

```bash
make help          # lista komend
make up            # start wszystkiego w Dockerze
make down          # stop
make logs          # logi
make test          # testy backend + frontend
make lint          # lint + formatowanie + typy (to samo co CI)
make format        # automatyczne poprawki formatowania
make gen-api       # odśwież typy TS z modeli backendu
make install       # zależności lokalnie (bez Dockera) + pre-commit
```

---

## Uruchamianie bez Dockera

Przydatne, gdy chcesz debugować w IDE. Wymagane: [uv](https://docs.astral.sh/uv/getting-started/installation/) (`brew install uv`), Node 24.

```bash
# baza nadal w Dockerze
docker compose up -d db

# backend
cd backend
uv sync
DATABASE_URL=postgresql+psycopg://app:app@localhost:5432/app uv run uvicorn app.main:app --reload
# bez bazy, tylko mocki:  DB_ENABLED=false uv run uvicorn app.main:app --reload

# frontend (w drugim terminalu)
cd frontend
npm install
npm run dev        # proxy /api → http://localhost:8000
```

Dodawanie zależności:

```bash
cd backend && uv add <pakiet>          # lub: uv add --dev <pakiet>
cd frontend && npm install <pakiet>    # lub: npm install -D <pakiet>
```

Po dodaniu zależności w Dockerze: `make up` (przebuduje obraz).

---

## FAQ / problemy

**`make up` – port 5432/8000/5173 zajęty.** Zmień port w `.env` (`POSTGRES_PORT`, `BACKEND_PORT`, `FRONTEND_PORT`).

**Frontend w Dockerze nie widzi nowego pakietu npm.** `docker compose up --build -d frontend` (node_modules są w obrazie, nie na hoście).

**`/api/health` pokazuje `"database": "unavailable"`.** Baza jeszcze startuje albo zły `DATABASE_URL`. API działa dalej na mockach.

**Czemu `imresamu/postgis`, a nie `postgis/postgis`?** Oficjalny obraz nie ma wersji arm64 (Apple Silicon). Ten jest multi-arch i działa wszędzie.

**Overpass (OSM) zwraca 429/504.** Publiczne API ma limity – provider przełączy się na cache z `data/cache/`. Można też zmienić `overpass_url` w `cities/krakow.yaml` na inny mirror.

---

## Formalności

- Przy wygranej trzeba przekazać repozytorium na **GitLab** – na koniec robimy mirror/push z GitHuba.
- Kod z wcześniejszych projektów (np. TatraTracker) – **najpierw pytamy mentora o background IP**.
- Licencje danych (OSM = ODbL, wymagana atrybucja) – zapisujemy w [docs/data-sources.md](docs/data-sources.md).
