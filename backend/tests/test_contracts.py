"""CI safety net: every mock JSON file must validate against its Pydantic
contract. This is what makes `contracts/` a real contract instead of a
convention — a PR that changes a model without updating /mocks fails here.
"""

from __future__ import annotations

from app.contracts import (
    ApplicantProfile,
    AssessmentJob,
    DirectorFeatureSet,
    FinancialExtract,
    RatioSet,
    RedFlag,
    ScoreBreakdown,
)
from app.utils.mock_loader import load_mock_model, load_mock_model_list


def test_applicant_profile_mock_validates(scenario: str) -> None:
    load_mock_model(scenario, "applicant_profile.json", ApplicantProfile)


def test_financial_extracts_mock_validates(scenario: str) -> None:
    load_mock_model_list(scenario, "financial_extracts.json", FinancialExtract)


def test_ratio_set_mock_validates(scenario: str) -> None:
    load_mock_model(scenario, "ratio_set.json", RatioSet)


def test_director_feature_set_mock_validates(scenario: str) -> None:
    load_mock_model(scenario, "director_feature_set.json", DirectorFeatureSet)


def test_red_flags_mock_validates(scenario: str) -> None:
    load_mock_model_list(scenario, "red_flags.json", RedFlag)


def test_score_breakdown_mock_validates(scenario: str) -> None:
    load_mock_model(scenario, "score_breakdown.json", ScoreBreakdown)


def test_assessment_job_mock_validates(scenario: str) -> None:
    load_mock_model(scenario, "assessment_job.json", AssessmentJob)
