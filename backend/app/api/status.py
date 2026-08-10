"""GET /status/{job_id} — poll an async assessment job's progress."""

from __future__ import annotations

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.contracts import AssessmentJob, JobError, JobStatus, PipelineStage
from app.db.models import AssessmentJob as AssessmentJobRow

router = APIRouter(tags=["status"])


@router.get("/status/{job_id}", response_model=AssessmentJob)
def get_status(job_id: str, db: Session = Depends(get_db)) -> AssessmentJob:
    job_row = db.get(AssessmentJobRow, job_id)
    if job_row is None:
        raise HTTPException(status_code=404, detail=f"No assessment job with id {job_id}")

    error = None
    if job_row.error_message is not None:
        error = JobError(
            stage=PipelineStage(job_row.stage) if job_row.stage else PipelineStage.INGESTION,
            message=job_row.error_message,
            retryable=bool(job_row.error_retryable),
        )

    return AssessmentJob(
        job_id=job_row.job_id,
        company_number=job_row.company_number,
        status=JobStatus(job_row.status),
        stage=PipelineStage(job_row.stage) if job_row.stage else None,
        error=error,
        created_at=job_row.created_at,
        updated_at=job_row.updated_at,
    )
