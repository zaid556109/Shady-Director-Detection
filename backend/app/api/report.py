"""GET /report/{company_number} — synchronous score lookup.

Runs the pipeline directly rather than requiring a prior POST /assess +
poll — with today's mock-data stubs this is instant, and it's the endpoint
the frontend's Report page hits. Once real implementations land (CH calls,
iXBRL parsing) this should switch to reading the most recent persisted
`Score` row for the company instead of recomputing on every request; the
async /assess + /status flow exists for triggering a fresh computation.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException

from app.contracts import ScoreBreakdown
from app.workers.pipeline import run_assessment_pipeline

router = APIRouter(tags=["report"])


@router.get("/report/{company_number}", response_model=ScoreBreakdown)
def get_report(company_number: str) -> ScoreBreakdown:
    try:
        result = run_assessment_pipeline(company_number)
    except Exception as exc:  # noqa: BLE001
        raise HTTPException(status_code=502, detail=f"Assessment pipeline failed: {exc}") from exc
    return result.breakdown
