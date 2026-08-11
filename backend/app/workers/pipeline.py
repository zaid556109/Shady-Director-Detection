"""The assessment pipeline: plain functions, no Celery/DB dependency.

Kept separate from tasks.py so it's directly unit-testable (see
backend/tests/test_pipeline.py) without a broker or database running —
`app.workers.tasks.run_assessment` is a thin Celery wrapper around
`run_assessment_pipeline` that adds job-status bookkeeping.
"""

from __future__ import annotations

import asyncio

from app.contracts import DirectorFeatureSet, FinancialExtract, RatioSet, RedFlag, ScoreBreakdown
from app.director_features import build_features
from app.financials import compute_ratios, extract_financials
from app.ingestion import build_applicant_profile
from app.scoring import score


class PipelineResult:
    """Every intermediate artifact from one pipeline run, not just the final
    score — useful for tests/debugging and for persisting each stage's
    output to its own DB table."""

    def __init__(
        self,
        financial_extracts: list[FinancialExtract],
        ratios: RatioSet,
        features: DirectorFeatureSet,
        flags: list[RedFlag],
        breakdown: ScoreBreakdown,
    ) -> None:
        self.financial_extracts = financial_extracts
        self.ratios = ratios
        self.features = features
        self.flags = flags
        self.breakdown = breakdown


def run_assessment_pipeline(company_number: str) -> PipelineResult:
    """Run ingestion -> financials -> director_features -> scoring in order.

    This is the "demo pipeline" that must work end-to-end on mock data from
    commit 1 (see README "The pipeline"). Financials and director_features
    still return mock data resolved from `company_number`; ingestion now
    has a real (async) implementation, called here with no client so it
    falls back to mock data too — see app.ingestion.service for the
    real-vs-mock split. Wiring a real client through for genuine live
    assessments is Person 5's remaining integration task.
    """
    profile = asyncio.run(build_applicant_profile(company_number))

    financial_extracts = extract_financials(profile)
    ratios = compute_ratios(financial_extracts)

    features, flags = build_features(profile)

    breakdown = score(ratios, features, flags)

    return PipelineResult(
        financial_extracts=financial_extracts,
        ratios=ratios,
        features=features,
        flags=flags,
        breakdown=breakdown,
    )
