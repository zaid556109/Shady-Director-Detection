# contracts

The single source of truth for every data shape that crosses a module
boundary in CounterpartyCheck. If you're about to define a `TypedDict`,
`dataclass`, or ad-hoc `dict[str, Any]` for something another module also
needs to read — it probably belongs here instead.

## What's here

- `src/contracts/` — the 7 frozen-ish Pydantic v2 models (`ApplicantProfile`,
  `FinancialExtract`, `RatioSet`, `DirectorFeatureSet`, `RedFlag`,
  `ScoreBreakdown`, `AssessmentJob`) plus shared enums/value types in
  `common.py`. This is an installable package (`pip install -e contracts`),
  imported as `backend/app/ingestion` etc. and re-exported (unchanged) from
  `backend/app/contracts/`.
- `schemas/` — JSON Schema generated from the models above via
  `make export-schemas`. Committed so the shapes are browsable without a
  Python environment. **Generated, don't hand-edit** — the Pydantic models
  in `src/contracts/` are canonical.
- `CHANGELOG.md` — every contract change, versioned. Required reading before
  touching a model; required update after.

## Why Pydantic-first instead of JSON-Schema-first

We considered hand-writing JSON Schema as the canonical source and
generating Pydantic + TypeScript from it (e.g. via
`datamodel-code-generator`). We went the other way — Pydantic models are
canonical, JSON Schema is exported from them — because:

- The team is Python-heavy (4 of 5 modules are backend); writing and
  reviewing Pydantic directly is faster than reviewing generated code.
- `model_config json_schema_extra` examples, field validators, and
  docstrings all live next to the field they document — one file to read,
  not two kept in sync by hand.
- It keeps the dependency list small (no codegen toolchain required to just
  add a field).

**Trade-off:** TypeScript types in `frontend/src/api/types.ts` are currently
hand-written to mirror these models, not generated. They're small and
change rarely enough that this is fine for a 5-person project; if that stops
being true, wiring up `json-schema-to-typescript` against `schemas/*.json`
in a `make generate-ts` target is the natural next step (schemas are already
there for it).

## Versioning

Contracts are versioned together as one package (`contracts.__version__` in
`src/contracts/__init__.py`, currently `0.1.0`), not per-model. See
`CHANGELOG.md` for the semantics and `CONTRIBUTING.md` for the approval
process required to bump it.
