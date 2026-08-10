#!/usr/bin/env python
"""Export JSON Schema for every top-level contract model into contracts/schemas/.

Run via `make export-schemas` (or `python scripts/export_schemas.py` from
contracts/). These files are committed so they're browsable without a Python
environment, and so a future TS-generation step (e.g. json-schema-to-typescript)
has something to point at — see contracts/README.md.

Regenerate and commit whenever a contract model changes.
"""

from __future__ import annotations

import json
from pathlib import Path

from contracts import (
    ApplicantProfile,
    AssessmentJob,
    DirectorFeatureSet,
    FinancialExtract,
    RatioSet,
    RedFlag,
    ScoreBreakdown,
)

SCHEMAS_DIR = Path(__file__).resolve().parent.parent / "schemas"

# snake_case filename -> model. Keep in sync with contracts/__init__.py's
# "the 7 frozen contracts" list.
MODELS = {
    "applicant_profile": ApplicantProfile,
    "financial_extract": FinancialExtract,
    "ratio_set": RatioSet,
    "director_feature_set": DirectorFeatureSet,
    "red_flag": RedFlag,
    "score_breakdown": ScoreBreakdown,
    "assessment_job": AssessmentJob,
}


def main() -> None:
    SCHEMAS_DIR.mkdir(parents=True, exist_ok=True)
    for name, model in MODELS.items():
        schema = model.model_json_schema()
        out_path = SCHEMAS_DIR / f"{name}.schema.json"
        out_path.write_text(json.dumps(schema, indent=2, sort_keys=True) + "\n")
        print(f"wrote {out_path.relative_to(SCHEMAS_DIR.parent.parent)}")


if __name__ == "__main__":
    main()
