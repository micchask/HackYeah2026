# Skróty dla macOS / Linux / WSL. Każda komenda to zwykłe `docker compose ...`
# opisane w README - na Windows bez make wpisuj je bezpośrednio.

.PHONY: help up down logs ps seed seed-refresh test lint format gen-api db-shell clean

help: ## Lista komend
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-10s\033[0m %s\n", $$1, $$2}'

up: ## Zbuduj i uruchom wszystko (db + backend + frontend)
	docker compose up --build -d --renew-anon-volumes
	@echo "Frontend: http://localhost:5173  |  API docs: http://localhost:8000/docs"

down: ## Zatrzymaj kontenery
	docker compose down

logs: ## Logi (Ctrl+C aby wyjść)
	docker compose logs -f

ps: ## Status kontenerów
	docker compose ps

seed: ## Dane demo (graf + miejsca) ze snapshotu w data/seed/ - bez Overpass
	docker compose exec backend python -m app.seed
	docker compose restart backend
	@echo "Backend wczytuje graf z data/cache/ - trasy za kilka sekund"

seed-refresh: ## Pobierz nowy snapshot z Overpass (wymaga internetu, do 10 min)
	docker compose exec backend python -m app.seed --refresh

test: ## Testy backend + frontend
	docker compose exec backend pytest -q
	docker compose exec frontend npm test

lint: ## Lint + formatowanie + typy (to samo co CI)
	docker compose exec backend ruff check .
	docker compose exec backend ruff format --check .
	docker compose exec frontend npm run lint
	docker compose exec frontend npm run format:check
	docker compose exec frontend npm run typecheck

format: ## Automatyczne formatowanie
	docker compose exec backend ruff check --fix .
	docker compose exec backend ruff format .
	docker compose exec frontend npm run format

gen-api: ## Typy TS z OpenAPI backendu
	docker compose exec frontend npm run gen:api

db-shell: ## Konsola SQL bazy
	docker compose exec db psql -U app -d app

clean: ## Usuń kontenery RAZEM z danymi bazy
	docker compose down -v
