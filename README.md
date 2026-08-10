# CounterpartyCheck (working title)

Company due-diligence / loan-eligibility scoring for UK companies, built on
Companies House data.

**Input:** a UK company number.
**Output:** a 0–100 reliability score with an explainable, feature-level
breakdown, assembled from two feature clusters:

- **Cluster A — Governance.** Director appointment history from the Companies
  House API (officer IDs, disqualifications, dissolved-company frequency,
  shared-address clustering, filing lateness), assembled into a
  director↔company graph.
- **Cluster B — Financials.** iXBRL parsing of filed accounts into ratios
  (current ratio, gearing, negative equity, Altman Z), with graceful
  degradation for sparse micro-entity accounts.

## Status

Scaffold stage. Every module exposes one typed public function that returns
realistic **mock data** (see [`/mocks`](./mocks)) so the whole pipeline runs
end-to-end from commit 1, before any real Companies House integration or
scoring logic exists. Nobody should be blocked waiting on someone else's
module — build against the contract, not the implementation.

## Why "contracts first"

[`contracts/`](./contracts) holds the Pydantic v2 models that every module
and the frontend agree to. They are frozen enough to build against but not
literally frozen — see [CONTRIBUTING.md](./CONTRIBUTING.md) for the process
to change one. Everything else (DB schema, API responses, mock fixtures,
frontend types) is derived from or validated against these models.

## Quickstart

```bash
git clone <this repo>
cd counterparty-check   # or whatever you cloned it as

cp .env.example .env
make up                 # postgres + redis via docker-compose
make setup              # pip install -e contracts, backend[dev]; npm install frontend
make migrate            # apply Alembic migrations

make dev-api            # FastAPI on :8000  (http://localhost:8000/docs)
make dev-worker         # Celery worker (separate terminal)
make dev-web            # Vite dev server on :5173 (separate terminal)

make test               # backend pytest, includes the mock end-to-end pipeline
make check              # lint + typecheck + test (what CI runs)
```

Requirements: Python 3.11+, Node 20+, Docker.

## Repository layout

```
counterparty-check/
├── contracts/            # Pydantic v2 models — the source of truth (see below)
├── backend/
│   └── app/
│       ├── api/                # FastAPI routes: /assess, /report, /status
│       ├── ingestion/          # CH API client + build_applicant_profile()
│       ├── financials/         # iXBRL parsing + ratio calculation
│       ├── director_features/  # director graph + red-flag detection
│       ├── scoring/            # scorecard + explanation generation
│       ├── db/                 # SQLAlchemy models + Alembic
│       ├── workers/            # Celery app + the assessment pipeline task
│       └── contracts/          # thin re-export of the `contracts` package
├── frontend/              # React + Vite + TS loan-officer dashboard
└── mocks/                 # 3 realistic mock companies, one JSON per contract
```

## Ownership map

Five people, five vertical slices. Every module has exactly one owner for
day-to-day changes; anyone can read anything, and contract changes need
sign-off regardless of who's touching them (see CONTRIBUTING.md).

| Module | Owner (role) | Key files |
|---|---|---|
| Ingestion / Companies House client | Person 1 — Ingestion | `backend/app/ingestion/` |
| Financials / iXBRL / ratios | Person 2 — Financials | `backend/app/financials/` |
| Director graph / red flags | Person 3 — Governance | `backend/app/director_features/` |
| Scoring / explanations | Person 4 — Scoring | `backend/app/scoring/` |
| API, DB, workers, CI/infra, frontend | Person 5 — Platform & Integration Lead | `backend/app/api/`, `backend/app/db/`, `backend/app/workers/`, `frontend/`, `.github/`, `docker-compose.yml` |
| Contracts (shared) | Integration lead approves, any module owner can propose | `contracts/` |

Update `.github/CODEOWNERS` and this table with real GitHub handles once the
group is finalized — placeholders are `@person1`–`@person5`.

## The pipeline (mock mode today, real mode later)

```
company_number
   │
   ▼
build_applicant_profile()        [ingestion]     → ApplicantProfile
   │
   ├─▶ extract_financials()      [financials]     → list[FinancialExtract]
   │       └─▶ compute_ratios()  [financials]     → RatioSet
   │
   └─▶ build_features()          [director_features] → DirectorFeatureSet, list[RedFlag]
   │
   ▼
score()                          [scoring]        → ScoreBreakdown
```

`backend/app/workers/pipeline.py` wires these calls in order; the Celery task
in `backend/app/workers/tasks.py` is a thin wrapper so the same pipeline
function is directly testable without a broker. Every stub currently returns
mock data resolved from `company_number` (see
`backend/app/utils/mock_loader.py`) — swapping a stub for a real
implementation is a same-signature, same-file change.

## Data model

`backend/app/db/models.py` defines: `companies`, `officers`, `appointments`,
`filings`, `financial_extracts`, `feature_sets`, `scores`, `assessment_jobs`.
See `backend/alembic/versions/0001_initial.py` for the initial migration.

## Frontend

Vite + React + TypeScript dashboard for a "loan officer" persona: search a
company number, view the score, two cluster panels, and a director-graph
placeholder. `frontend/src/mocks/` mirrors `/mocks` (`make sync-mocks`) so
the UI runs fully standalone before the backend exists.
