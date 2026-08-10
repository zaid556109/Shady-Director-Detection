# Contributing

## Branch strategy

Trunk-based, short-lived feature branches off `main`:

```
<person>/<feature>
# e.g. person1/ch-client-rate-limiter, person4/scorecard-weights
```

- `main` is always green (CI passing) and always deployable in the sense
  that `make check` succeeds and the mock pipeline runs end-to-end.
- No direct pushes to `main`. Branch, PR, merge.
- Keep branches short-lived (days, not weeks) — rebase on `main` often
  rather than letting a branch drift.
- Delete your branch after merge.

## Pull requests

- Every PR requires: CI green (lint + typecheck + test) **and** 1 approving
  review.
- Keep PRs scoped to one module/feature where possible — easier to review,
  easier to unblock in parallel.
- Use the PR template (`.github/PULL_REQUEST_TEMPLATE.md`); at minimum say
  what changed and how you verified it (tests run, screenshots for UI).
- `CODEOWNERS` will auto-request the relevant module owner as a reviewer.

## Changing `contracts/`

`contracts/` is what lets all five of us work in parallel without waiting on
each other, so changes to it are the one place we slow down deliberately:

1. Any module owner can propose a change (new field, new model, breaking
   change) via a normal PR against `contracts/`.
2. The PR **must** be approved by the integration lead (Person 5, by
   default — see README ownership map) in addition to the usual review.
3. The PR **must** include an entry in `contracts/CHANGELOG.md` with a
   version bump:
   - additive, backward-compatible change (new optional field, new model)
     → bump the **minor** version (`0.1.0` → `0.2.0`)
   - breaking change (renamed/removed field, changed type, new required
     field) → bump the **major** version and call out who needs to update
     their module in the changelog entry
4. Regenerate derived artifacts before merging:
   ```bash
   make export-schemas   # contracts/schemas/*.schema.json
   make generate-mocks   # /mocks/*/*.json (must still validate)
   make sync-mocks       # frontend/src/mocks
   ```
5. `backend/tests/test_contracts.py` is the CI safety net — it fails the
   build if any mock file no longer validates against its model.

If you're only *consuming* a contract (reading fields, not adding/removing
them), no special process — just import from `contracts` / `app.contracts`
as normal.

## Local dev

```bash
make up       # postgres + redis
make setup    # install everything
make migrate  # apply migrations
make check    # lint + typecheck + test, same as CI
```

## Style

- Python: `ruff` (lint + format) and `mypy` — both run in CI, both must be
  clean. Every function signature is fully type-hinted; no untyped `def`s.
- One public function per pipeline module (`build_applicant_profile`,
  `extract_financials`, `compute_ratios`, `build_features`, `score`, ...) —
  that function is the contract with everyone else. Internal helpers can
  change freely; the public signature is what CODEOWNERS review protects.
- Commit messages: short imperative subject line (`Add gearing ratio
  calculation`, not `Added` / `Adding`).

## Tests

- Every module ships tests that run against `/mocks`, not against the real
  Companies House API — no network calls in CI, ever.
- If your module's public function changes behaviour, update or add a test
  in `backend/tests/` alongside it in the same PR.
