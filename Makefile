.PHONY: up down setup dev-api dev-worker dev-web test lint typecheck check \
        export-schemas generate-mocks sync-mocks migrate fmt

up: ## Start postgres + redis
	docker compose up -d

down: ## Stop postgres + redis
	docker compose down

setup: ## Install backend (editable, with contracts) and frontend deps
	cd contracts && pip install -e .
	cd backend && pip install -e ".[dev]"
	cd frontend && npm install

dev-api: ## Run the FastAPI app with reload
	cd backend && uvicorn app.main:app --reload --port 8000

dev-worker: ## Run the Celery worker
	cd backend && celery -A app.workers.celery_app worker --loglevel=info

dev-web: ## Run the Vite dev server
	cd frontend && npm run dev

test: ## Run backend test suite
	cd backend && pytest

lint: ## Ruff lint (backend + contracts)
	cd backend && ruff check .
	cd contracts && ruff check .

fmt: ## Ruff format (backend + contracts)
	cd backend && ruff format .
	cd contracts && ruff format .

typecheck: ## mypy on backend
	cd backend && mypy .

check: lint typecheck test ## Everything CI runs

export-schemas: ## Regenerate contracts/schemas/*.schema.json from the Pydantic models
	cd contracts && python scripts/export_schemas.py

generate-mocks: ## Regenerate /mocks/*/*.json from backend/scripts/generate_mocks.py
	cd backend && python scripts/generate_mocks.py

sync-mocks: ## Copy /mocks into frontend/src/mocks so the UI runs with zero backend
	rm -rf frontend/src/mocks
	mkdir -p frontend/src/mocks
	cp -R mocks/* frontend/src/mocks/

migrate: ## Apply Alembic migrations
	cd backend && alembic upgrade head
