"""Resolves a company number to one of the three /mocks scenarios and loads
+ validates the corresponding JSON fixture.

Every module's public stub function (`build_applicant_profile`,
`extract_financials`, `build_features`, `score`, ...) goes through this
instead of reading `/mocks` directly, so there's exactly one place that
knows the on-disk layout and exactly one place to swap out once real
implementations land (delete this import, keep the function signature).
"""

from __future__ import annotations

import json
from pathlib import Path
from typing import TypeVar

from pydantic import BaseModel

MOCKS_DIR = Path(__file__).resolve().parents[3] / "mocks"

# Fake-but-consistent company numbers used across the 3 mock scenarios.
# See /mocks/README.md for what each scenario represents.
MOCK_COMPANY_NUMBERS: dict[str, str] = {
    "01234567": "healthy_plc",
    "07654321": "risky_sme",
    "09999999": "sparse_micro",
}
DEFAULT_SCENARIO = "sparse_micro"

ModelT = TypeVar("ModelT", bound=BaseModel)


def resolve_scenario(company_number: str) -> str:
    """Map a company number to a /mocks scenario folder name.

    Unknown company numbers deliberately fall back to the low-confidence
    "sparse_micro" scenario rather than raising, so any random company
    number typed into the demo still produces a plausible-looking result.
    """
    return MOCK_COMPANY_NUMBERS.get(company_number, DEFAULT_SCENARIO)


def load_mock_json(scenario: str, filename: str) -> object:
    """Load and JSON-decode `mocks/<scenario>/<filename>`."""
    path = MOCKS_DIR / scenario / filename
    return json.loads(path.read_text())


def load_mock_model(scenario: str, filename: str, model: type[ModelT]) -> ModelT:
    """Load `mocks/<scenario>/<filename>` and validate it as `model`."""
    return model.model_validate(load_mock_json(scenario, filename))


def load_mock_model_list(scenario: str, filename: str, model: type[ModelT]) -> list[ModelT]:
    """Load `mocks/<scenario>/<filename>` (a JSON array) and validate each
    item as `model`."""
    data = load_mock_json(scenario, filename)
    assert isinstance(data, list)
    return [model.model_validate(item) for item in data]
