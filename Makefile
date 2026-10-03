.PHONY: help up down logs restart build test test-backend test-frontend lint format gen-api install

help: ## Lista komend
	@grep -E '^[a-zA-Z_-]+:.*?## ' $(MAKEFILE_LIST) | awk 'BEGIN {FS = ":.*?## "}; {printf "  \033[36m%-16s\033[0m %s\n", $$1, $$2}'

up: ## Uruchom wszystko (db + backend + frontend) w Dockerze
	docker compose up --build -d
	@echo "Frontend: http://localhost:5173  |  API docs: http://localhost:8000/docs"

down: ## Zatrzymaj kontenery
	docker compose down

logs: ## Logi wszystkich serwisów (Ctrl+C aby wyjść)
	docker compose logs -f

restart: down up ## Restart

install: ## Zależności lokalnie (bez Dockera): uv + npm + pre-commit
	cd backend && uv sync
	cd frontend && npm install
	uvx pre-commit install

test: test-backend test-frontend ## Wszystkie testy

test-backend:
	cd backend && DB_ENABLED=false uv run pytest -q

test-frontend:
	cd frontend && npm test

lint: ## Lint + sprawdzenie formatowania + typy
	cd backend && uv run ruff check . && uv run ruff format --check .
	cd frontend && npm run lint && npm run format:check && npm run typecheck

format: ## Automatyczne formatowanie
	cd backend && uv run ruff check --fix . && uv run ruff format .
	cd frontend && npm run format

gen-api: ## Odśwież typy TS z OpenAPI backendu (po zmianie modeli/endpointów)
	cd backend && DB_ENABLED=false uv run python -c "import json; from app.main import app; print(json.dumps(app.openapi(), ensure_ascii=False, indent=2))" > ../frontend/openapi.json
	cd frontend && npm run gen:api
