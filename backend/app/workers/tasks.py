"""Celery task(s). Thin wrapper around app.workers.pipeline so the actual
orchestration logic stays unit-testable without a broker.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.contracts import PipelineStage
from app.db.base import SessionLocal
from app.db.models import AssessmentJob as AssessmentJobRow
from app.db.models import Score
from app.workers.celery_app import celery_app
from app.workers.pipeline import run_assessment_pipeline


@celery_app.task(name="run_assessment")  # type: ignore[untyped-decorator]
def run_assessment(job_id: str, company_number: str) -> str:
    """Run the full assessment pipeline for `company_number` and persist the
    result against `job_id`.

    Real implementation (Person 5, TODO): update `AssessmentJobRow.stage`
    between each pipeline step (requires either splitting
    run_assessment_pipeline into stepwise calls here, or having it accept a
    stage-callback) so `GET /status/{job_id}` reflects progress rather than
    jumping straight from pending to completed/failed. Persist
    `PipelineResult.ratios` / `.features` / `.financial_extracts` to their
    respective tables too, not just the final Score — left as-is for now
    since the scaffold's job is to prove the pipeline runs, not to finish
    the persistence layer.

    Returns the job_id so `AsyncResult.get()` has something to return.
    """
    db = SessionLocal()
    job = db.get(AssessmentJobRow, job_id)
    if job is None:
        db.close()
        raise ValueError(f"AssessmentJob {job_id} not found")

    try:
        job.status = "running"
        job.stage = PipelineStage.INGESTION.value
        db.commit()

        result = run_assessment_pipeline(company_number)

        db.add(
            Score(
                company_number=company_number,
                job_id=job_id,
                total=result.breakdown.total,
                breakdown=result.breakdown.model_dump(mode="json"),
            )
        )
        job.status = "completed"
        job.stage = PipelineStage.DONE.value
        job.updated_at = datetime.now(UTC)
        db.commit()
    except Exception as exc:  # noqa: BLE001 — deliberately broad: any stage failure marks the job failed
        job.status = "failed"
        job.error_message = str(exc)
        job.error_retryable = False
        db.commit()
        raise
    finally:
        db.close()

    return job_id
