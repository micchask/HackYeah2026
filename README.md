# HackYeah2026

Repo do hackatonu 3.10–4.10.2026 dla naszego teamu.

Aplikacja webowa (PWA) do planowania **dostępnych tras** po mieście dla osób na wózkach inwalidzkich i rodziców z wózkami dziecięcymi. Łączy dane z wielu źródeł (OSM, otwarte dane Krakowa, MSIP, zgłoszenia użytkowników) i przy każdej informacji pokazuje, skąd pochodzi i na ile jej ufamy.

**Stack:** React + Vite + TypeScript + MapLibre · FastAPI (Python, uv) · PostgreSQL + PostGIS · Docker Compose

**Tablica zadań:** https://github.com/users/micchask/projects/3

---

## Spis treści

1. [Szybki start](#1-szybki-start)
2. [Komendy na co dzień](#2-komendy-na-co-dzień)
3. [Praca w zespole](#3-praca-w-zespole)
4. [Struktura repo](#4-struktura-repo)
5. [Gdzie dodać kod](#5-gdzie-dodać-kod)
6. [Jak to działa](#6-jak-to-działa)
7. [Praca bez Dockera (opcjonalnie)](#7-praca-bez-dockera-opcjonalnie)
8. [FAQ i problemy](#8-faq-i-problemy)

---

## 1. Szybki start

Całość działa w Dockerze, więc **nie musisz instalować Pythona, Node ani Postgresa**. Te same komendy działają na Windows, macOS i Linux.

### Krok 1: zainstaluj Git i Docker Desktop (jednorazowo)

| System | Instalacja |
|---|---|
| **Windows** | W PowerShell: `winget install Git.Git` oraz `winget install Docker.DockerDesktop`. Uruchom ponownie komputer. Docker Desktop przy pierwszym starcie poprosi o włączenie **WSL 2** – zgódź się. |
| **macOS** | `brew install git` oraz `brew install --cask docker` (albo pobierz Docker Desktop ze strony docker.com) |
| **Linux** | Git z menedżera pakietów + [Docker Engine z pluginem compose](https://docs.docker.com/engine/install/) |

Uruchom **Docker Desktop** i poczekaj, aż ikonka pokaże „Engine running”. Sprawdź w terminalu:

```
docker compose version
```

### Krok 2: sklonuj repo i odpal projekt

Windows: PowerShell lub Windows Terminal. macOS/Linux: zwykły terminal.

```
git clone https://github.com/micchask/HackYeah2026.git
cd HackYeah2026
docker compose up --build -d
```

Pierwsze uruchomienie trwa kilka minut (pobieranie obrazów i bibliotek). Kolejne to kilka sekund.

### Krok 3: otwórz w przeglądarce

| Co | Adres |
|---|---|
| Aplikacja (frontend) | http://localhost:5173 |
| Dokumentacja API (Swagger) | http://localhost:8000/docs |
| Health check | http://localhost:8000/api/health → `{"status":"ok","database":"ok"}` |
| Baza PostGIS | `localhost:5432`, user / hasło / baza: `app` / `app` / `app` |

Gotowe. Kod jest podmontowany do kontenerów, więc **po zapisaniu pliku backend i frontend przeładowują się same**.

> Plik `.env` jest **opcjonalny** – wszystko ma wartości domyślne. Tworzysz go tylko, gdy chcesz coś zmienić (np. port): skopiuj `.env.example` do `.env` (`copy .env.example .env` na Windows, `cp .env.example .env` na macOS/Linux).

---

## 2. Komendy na co dzień

Wszystko to zwykłe komendy `docker compose`. Działają tak samo w PowerShell, cmd, Git Bash, macOS i Linux. Uruchamiasz je w głównym katalogu repo, przy włączonych kontenerach.

| Co chcę zrobić | Komenda (każdy system) | Skrót `make` |
|---|---|---|
| Uruchomić / przebudować wszystko | `docker compose up --build -d --renew-anon-volumes` | `make up` |
| Zatrzymać | `docker compose down` | `make down` |
| Zobaczyć logi (Ctrl+C aby wyjść) | `docker compose logs -f` | `make logs` |
| Logi tylko backendu | `docker compose logs -f backend` | |
| Status kontenerów | `docker compose ps` | `make ps` |
| Testy backendu | `docker compose exec backend pytest -q` | `make test` (oba) |
| Testy frontendu | `docker compose exec frontend npm test` | |
| Lint backendu | `docker compose exec backend ruff check .` | `make lint` (wszystko) |
| Lint frontendu (z regułami dostępności) | `docker compose exec frontend npm run lint` | |
| Sprawdzenie typów TS | `docker compose exec frontend npm run typecheck` | |
| Automatyczne formatowanie backendu | `docker compose exec backend ruff format .` | `make format` (oba) |
| Automatyczne formatowanie frontendu | `docker compose exec frontend npm run format` | |
| Wygenerować typy TS z API | `docker compose exec frontend npm run gen:api` | `make gen-api` |
| Konsola SQL bazy | `docker compose exec db psql -U app -d app` | `make db-shell` |
| Dodać bibliotekę Pythona | `docker compose exec backend uv add <pakiet>`, potem „Uruchomić / przebudować” | |
| Dodać bibliotekę npm | `docker compose exec frontend npm install <pakiet>`, potem „Uruchomić / przebudować” | |
| Wyczyścić wszystko **razem z danymi bazy** | `docker compose down -v` | `make clean` |

**Skrót `make`** działa od razu na macOS, Linux i w WSL. Na Windows jest opcjonalny (`winget install ezwinports.make`) – bez niego po prostu wpisuj komendy z drugiej kolumny.

**Kiedy przebudować** (`docker compose up --build -d --renew-anon-volumes`): po zmianie zależności (`pyproject.toml`, `package.json`), po `git pull`, który zmienił zależności, albo gdy coś dziwnie nie działa. Zwykłe zmiany w kodzie przeładowują się same.

---

## 3. Praca w zespole

### Agile: jak bierzemy zadania (Kanban)

Pracujemy w prostym Kanbanie na **[tablicy](https://github.com/users/micchask/projects/3)**. Zadania nie są przypisane z góry do osób – kto ma wolne ręce, bierze następne.

**Kolumny:** `Todo` → `In progress` → `Review` → `Done`

**Priorytety:** **P0** = bez tego nie ma demo · **P1** = efekt „wow” · **P2** = jeśli starczy czasu

**Fazy:** 0 Start · 1 Dane i GIS · 2 Routing · 3 Frontend + Dostępność · 4 Biznes i pitch. Fazy 1–3 idą **równolegle** (frontend działa na mockach).

**Cykl jednego zadania:**

1. **Wybierz** z `Todo` zadanie **P0** (P1 dopiero, gdy P0 się skończą). Sprawdź w opisie „Zależy od” – czy poprzednie zadanie jest gotowe.
2. **Przypisz się** (Assignees) i przesuń na `In progress`. **Max 1 zadanie w toku na osobę.**
3. **Branch** o nazwie z issue, np. `feat/R1-routing`.
4. **PR** z `Closes #<nr>` w opisie → przesuń na `Review` → poproś kogoś o review.
5. **Merge** po zielonym CI i 1 review → zadanie samo trafia do `Done`.

**Zasady:**

- Zadanie gotowe = spełnia **Definition of Done** z opisu issue.
- Utknąłeś na >30 min? Napisz na czacie zespołu albo w komentarzu issue – nie siedź w ciszy.
- Zadanie za duże? Podziel je na mniejsze issues i wrzuć do `Todo`.
- Nowy pomysł / bug? Nowe issue z fazą i priorytetem – nie rób „przy okazji” w innym PR.
- Review ma pierwszeństwo przed braniem nowego zadania – nie blokujmy się nawzajem.
- Co kilka godzin krótki **stand-up** (5 min): co zrobiłem, co biorę, co mnie blokuje.

### Git krok po kroku

```
git checkout main
git pull
git checkout -b feat/R1-routing
```

…praca…, potem przed commitem sprawdź lint i testy (sekcja 2):

```
git add .
git commit -m "routing: graf z osmnx dla obszaru demo"
git push -u origin feat/R1-routing
```

Git wypisze link do utworzenia Pull Requesta. Możesz też użyć `gh pr create`.

Nazwy branchy: `feat/…` (nowa funkcja), `fix/…` (poprawka), `docs/…` (dokumentacja), `chore/…` (konfiguracja).

### Zasady

- **`main` jest chroniony** – zmiany tylko przez PR, wymagane **1 review** i **zielone CI** (`backend` i `frontend`).
- Małe PR-y, często. Lepiej 5 małych niż 1 ogromny na koniec.
- Zmieniasz modele API? Wygeneruj typy (`gen:api`) i commituj `frontend/src/api/schema.d.ts` w tym samym PR.
- Nie commitujemy `.env`, danych z `data/` ani sekretów.

### CI

Przy każdym PR i pushu do `main` GitHub Actions uruchamia:

- **backend:** `ruff check`, `ruff format --check`, `pytest`
- **frontend:** `oxlint` (z regułami dostępności), `prettier --check`, `tsc`, `vitest`, `vite build`

Jeśli CI jest czerwone, kliknij „Details” przy checku w PR – zobaczysz, który krok nie przeszedł. Zwykle wystarczy uruchomić formatowanie z sekcji 2.

---

## 4. Struktura repo

```
HackYeah2026/
├── README.md                  ← jesteś tutaj
├── docker-compose.yml         # db (PostGIS) + backend + frontend
├── Makefile                   # skróty do komend docker compose (opcjonalne)
├── .env.example               # wzór zmiennych środowiskowych (opcjonalny .env)
├── .gitattributes             # wymusza końce linii LF (ważne na Windows)
├── .pre-commit-config.yaml    # opcjonalne hooki przed commitem
├── .github/
│   ├── workflows/ci.yml       # CI: lint + testy + build
│   ├── pull_request_template.md
│   └── CODEOWNERS
│
├── backend/                   # Python 3.12+, FastAPI, zależności przez uv
│   ├── pyproject.toml         # zależności + konfiguracja ruff/pytest
│   ├── uv.lock                # zablokowane wersje (commitujemy!)
│   ├── Dockerfile
│   ├── cities/
│   │   └── krakow.yaml        # konfiguracja miasta: bbox, centrum, providery
│   ├── app/
│   │   ├── main.py            # aplikacja FastAPI, CORS, start bazy
│   │   ├── config.py          # ustawienia ze zmiennych środowiskowych
│   │   ├── cities.py          # wczytywanie cities/*.yaml
│   │   ├── api/               # endpointy HTTP (cienka warstwa, bez logiki)
│   │   │   ├── health.py      #   GET  /api/health
│   │   │   ├── cities.py      #   GET  /api/cities
│   │   │   ├── places.py      #   GET  /api/places
│   │   │   ├── routes.py      #   POST /api/routes
│   │   │   └── reports.py     #   POST/GET /api/reports
│   │   ├── models/            # modele Pydantic = kontrakt API
│   │   │   ├── accessibility.py  # AccessibilityAttribute + Provenance  ★
│   │   │   └── place.py, route.py, report.py, geo.py
│   │   ├── providers/         # źródła danych
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
│   ├── .oxlintrc.json         # linter z regułami dostępności (jsx-a11y)
│   ├── Dockerfile
│   ├── scripts/gen-api.mjs    # generowanie typów TS z OpenAPI backendu
│   └── src/
│       ├── main.tsx, App.tsx  # wejście, skip link, layout
│       ├── index.css          # kolory (kontrast AA), fokus, responsywność
│       ├── api/
│       │   ├── client.ts      # funkcje do wołania API + aliasy typów
│       │   └── schema.d.ts    # GENEROWANE z OpenAPI – nie edytuj ręcznie
│       ├── components/        # komponenty (+ testy *.test.tsx obok)
│       ├── pages/             # widoki składające komponenty
│       └── test/setup.ts      # konfiguracja vitest
│
├── data/                      # cache i surowe dane (ignorowane przez git)
└── docs/
    ├── architecture.md        # diagram i przepływ danych
    ├── data-sources.md        # źródła danych i licencje
    ├── business-model.md      # do pitchu
    ├── security-privacy.md    # prywatność, RODO
    └── wcag-audit.md          # jak testować dostępność + wyniki
```

---

## 5. Gdzie dodać kod

| Chcę… | Gdzie | Uwagi |
|---|---|---|
| **dodać nowe źródło danych** | `backend/app/providers/<nazwa>.py` | klasa `Provider` + `@register_provider("nazwa")`, import w `providers/__init__.py`, wpis w `cities/krakow.yaml`. Szczegóły w [docs/data-sources.md](docs/data-sources.md) |
| **dodać nowe miasto** | `backend/cities/<miasto>.yaml` | skopiuj `krakow.yaml`, zmień bbox, centrum i providery. **Żadnych `if city == ...` w kodzie** |
| **dodać cechę dostępności** (np. szerokość drzwi) | `AttributeKey` w `backend/app/models/accessibility.py` | potem mapowanie w providerze |
| **zmienić łączenie źródeł / konflikty** | `backend/app/normalization/merge.py` | |
| **zmienić wagi tras** (schody, nachylenie, nawierzchnia) | `backend/app/routing/profiles.py` | `edge_cost()` i `PROFILES` |
| **budowa grafu / algorytm trasy** | `backend/app/routing/graph.py` | osmnx + networkx |
| **nowy endpoint** | nowy plik w `backend/app/api/` | router w `api/__init__.py`, potem `gen:api` |
| **zmienić kształt danych w API** | `backend/app/models/` | potem `gen:api` i commit `schema.d.ts` |
| **tabela w bazie** | `backend/app/db/tables.py` | tworzy się automatycznie przy starcie |
| **komponent UI** | `frontend/src/components/` | z testem `*.test.tsx` obok |
| **nowy widok / strona** | `frontend/src/pages/` | |
| **wołanie API z frontu** | `frontend/src/api/client.ts` | typy z `schema.d.ts` |
| **kolory, fokus, layout** | `frontend/src/index.css` | kontrast min. 4.5:1 |
| **testy backendu** | `backend/tests/test_*.py` | bez sieci: zapisz próbkę odpowiedzi i testuj `parse()` |
| **dokumentacja / pitch** | `docs/` | |
| **duże pliki z danymi** | `data/raw/` | nie trafiają do gita; opisz źródło w `docs/data-sources.md` |

W kodzie są znaczniki `TODO(dane)`, `TODO(routing)`, `TODO(api)`, `TODO(frontend)`, `TODO(pitch)` – miejsca, od których zaczynają się zadania z tablicy. Najłatwiej je znaleźć wyszukiwaniem w VS Code (Ctrl+Shift+F / Cmd+Shift+F) frazy `TODO(`.

---

## 6. Jak to działa

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

### Przepływ danych

```
cities/krakow.yaml ─▶ providery (OSM, MSIP, …) ─▶ cache w data/ ─▶ normalizacja ─▶ baza / API ─▶ frontend
                                                  (fallback przy awarii)                ▲
                                     routing: graf OSM + profil wag ────────────────────┘
```

1. **Providery** pobierają dane ze źródeł i zamieniają je na `Place` z atrybutami.
2. Gdy źródło nie odpowiada, `providers/service.py` bierze ostatni cache z `data/cache/`.
3. **Normalizacja** wybiera wartość o najwyższym confidence, podnosi pewność, gdy źródła się zgadzają, i oznacza konflikty oraz dane starsze niż 2 lata.
4. **Routing** liczy koszt każdej krawędzi według profilu (`wheelchair`, `stroller`) i preferencji użytkownika. Schody albo zbyt strome odcinki to krawędź nieprzejezdna.
5. **API** zwraca trasę z **tekstowym opisem segment po segmencie** – to tekstowa alternatywa mapy (WCAG).

### Kontrakt API frontend ↔ backend

FastAPI generuje schemat OpenAPI z modeli Pydantic (widać go na http://localhost:8000/docs). Z niego generujemy typy TypeScript:

```
docker compose exec frontend npm run gen:api
```

Po zmianie modelu na backendzie TypeScript od razu pokaże, co trzeba poprawić na froncie.

### Mocki

`/api/places` i `/api/routes` zwracają na razie dane z `backend/app/mocks/data.py` (odpowiedź ma `is_mock: true`). Dzięki temu frontend nie czeka na routing. Gdy prawdziwa implementacja będzie gotowa, podmieniamy wywołanie w `api/*.py`, a kontrakt się nie zmienia.

### Dostępność (WCAG 2.2 AA)

To ok. 20% oceny, więc pilnujemy jej od początku:

- linter `oxlint` z regułami `jsx-a11y` działa w CI,
- mapa nigdy nie jest jedynym nośnikiem informacji (opis trasy i lista miejsc są też tekstem),
- **nie pytamy o niepełnosprawność**, tylko o preferencje trasy,
- checklista i sposób testowania: [docs/wcag-audit.md](docs/wcag-audit.md).

---

## 7. Praca bez Dockera (opcjonalnie)

Przydaje się do debugowania w IDE albo gdy chcesz szybciej odpalać testy. Baza i tak zostaje w Dockerze.

**Instalacja narzędzi (jednorazowo):**

| System | uv (Python) | Node 24 |
|---|---|---|
| Windows | `winget install astral-sh.uv` | `winget install OpenJS.NodeJS` |
| macOS | `brew install uv` | `brew install node` |
| Linux | `curl -LsSf https://astral.sh/uv/install.sh \| sh` | [nodejs.org](https://nodejs.org) lub `nvm` |

**Uruchamianie** (komendy są te same na każdym systemie). Najpierw zatrzymaj kontenery backendu i frontendu, żeby nie zajmowały portów:

```
docker compose stop backend frontend
docker compose up -d db
```

Backend (terminal 1):

```
cd backend
uv sync
uv run uvicorn app.main:app --reload
```

Frontend (terminal 2):

```
cd frontend
npm install
npm run dev
```

Testy i lint lokalnie:

```
cd backend
uv run pytest -q
uv run ruff check .
uv run ruff format .
```

```
cd frontend
npm test
npm run lint
npm run typecheck
npm run format
npm run gen:api
```

Ostatnia komenda (`npm run gen:api`) wymaga backendu działającego na http://localhost:8000.

**Pre-commit (opcjonalnie):** `uvx pre-commit install` – od tej pory ruff, oxlint i prettier odpalą się przy każdym commicie.

---

## 8. FAQ i problemy

**`docker` / `docker compose` nie jest rozpoznawane.**
Docker Desktop nie jest uruchomiony albo terminal był otwarty przed instalacją. Uruchom Docker Desktop, zamknij i otwórz terminal ponownie.

**Windows: Docker Desktop prosi o WSL / „WSL 2 installation is incomplete”.**
W PowerShell jako administrator: `wsl --install`, potem restart komputera.

**Port 5432, 8000 lub 5173 jest zajęty.**
Najczęściej przez lokalnie zainstalowanego Postgresa. Utwórz `.env` z `.env.example` i zmień `POSTGRES_PORT`, `BACKEND_PORT` lub `FRONTEND_PORT` (np. `POSTGRES_PORT=5433`). Potem `docker compose up -d`.

**Zmiany w kodzie nie przeładowują się.**
Sprawdź logi (`docker compose logs -f backend` lub `frontend`). Hot reload korzysta z odpytywania dysku (`FILE_POLLING=true`), więc działa też na Windows. Jeśli dalej nic, zrób przebudowę z sekcji 2.

**Windows: wszystko działa wolno.**
Najszybciej działa repo sklonowane wewnątrz WSL: otwórz terminal Ubuntu (`wsl`), tam `git clone ...` i `docker compose up --build -d`. Kod możesz edytować w VS Code przez rozszerzenie „WSL” (`code .` w terminalu WSL).

**Windows: prettier albo CI krzyczy o końcach linii (CRLF).**
Repo ma `.gitattributes`, który wymusza LF. Jeśli sklonowałeś wcześniej, napraw raz:

```
git rm --cached -r .
git reset --hard
```

Uwaga: `git reset --hard` usuwa niezacommitowane zmiany – najpierw je zacommituj.

**Dodałem bibliotekę npm, a frontend jej nie widzi.**
`docker compose up --build -d --renew-anon-volumes` – `node_modules` są w kontenerze, nie na Twoim dysku, i trzeba je odświeżyć.

**VS Code podkreśla importy na czerwono (brak `node_modules` / bibliotek Pythona).**
Kontenery mają zależności w środku, a edytor szuka ich na dysku. Zainstaluj je lokalnie wg sekcji 7 (`npm install` we `frontend`, `uv sync` w `backend`) – wtedy podpowiedzi działają.

**`/api/health` pokazuje `"database": "unavailable"`.**
Baza jeszcze startuje (poczekaj kilka sekund) albo coś jest nie tak z kontenerem `db` – sprawdź `docker compose logs db`. API działa dalej na mockach.

**Czemu `imresamu/postgis`, a nie `postgis/postgis`?**
Oficjalny obraz nie ma wersji na procesory ARM (Mac z Apple Silicon). Ten działa na wszystkich komputerach.

**Overpass (OSM) zwraca 429 / 504.**
Publiczne API ma limity. Provider przełączy się na cache z `data/cache/`. Można też zmienić `overpass_url` w `cities/krakow.yaml` na inny serwer.

**Chcę zacząć od zera (czysta baza).**
`docker compose down -v`, potem `docker compose up --build -d`. Uwaga: usuwa wszystkie dane z bazy.

---

## Formalności

- Przy wygranej trzeba przekazać repozytorium na **GitLab** – na koniec robimy mirror z GitHuba.
- Kod z wcześniejszych projektów (np. TatraTracker) – **najpierw pytamy mentora o background IP**.
- Licencje danych (OSM = ODbL, wymagana atrybucja) zapisujemy w [docs/data-sources.md](docs/data-sources.md).
