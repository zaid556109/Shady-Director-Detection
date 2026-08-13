"""Shared fixtures: mock scenario names and raw JSON loading, reused by
test_contracts.py and test_pipeline.py."""

from __future__ import annotations

from typing import Any

import pytest

from app.utils.mock_loader import MOCK_COMPANY_NUMBERS, load_mock_json

SCENARIOS = list(MOCK_COMPANY_NUMBERS.values())

CONTRACT_FILES = [
    "applicant_profile.json",
    "financial_extracts.json",
    "ratio_set.json",
    "director_feature_set.json",
    "red_flags.json",
    "score_breakdown.json",
    "assessment_job.json",
]


@pytest.fixture(params=SCENARIOS)
def scenario(request: pytest.FixtureRequest) -> str:
    return str(request.param)


@pytest.fixture
def load_mock() -> Any:
    return load_mock_json
