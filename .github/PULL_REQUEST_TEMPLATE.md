## What changed

<!-- One or two sentences. Link an issue/ticket if there is one. -->

## Why

<!-- What problem does this solve? Skip if obvious from the title. -->

## How I verified it

- [ ] `make check` passes locally (lint + typecheck + test)
- [ ] Added/updated tests for the behaviour change
- [ ] Ran the relevant module against `/mocks` manually, if applicable
- [ ] Screenshot(s) attached, if this touches `frontend/`

## Contract changes?

- [ ] This PR does **not** touch `contracts/`
- [ ] This PR touches `contracts/` — I have:
  - [ ] bumped the version and added an entry in `contracts/CHANGELOG.md`
  - [ ] run `make export-schemas generate-mocks sync-mocks`
  - [ ] requested a review from the integration lead

## Notes for reviewers

<!-- Anything you want a second pair of eyes on specifically. -->
