"""Proves the full pipeline runs end-to-end on mock data — this is the
demo/day-1 guarantee from the README, not just unit coverage."""

from __future__ import annotations

from app.utils.mock_loader import MOCK_COMPANY_NUMBERS
from app.workers.pipeline import run_assessment_pipeline


def test_pipeline_runs_for_every_mock_company_number() -> None:
    for company_number in MOCK_COMPANY_NUMBERS:
        result = run_assessment_pipeline(company_number)
        assert result.breakdown.company_number == company_number
        assert 0 <= result.breakdown.total <= 100


def test_pipeline_falls_back_to_sparse_micro_for_unknown_company_number() -> None:
    result = run_assessment_pipeline("00000000")
    assert result.breakdown.company_number == "09999999"
