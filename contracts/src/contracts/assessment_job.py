"""AssessmentJob — tracks one async assessment run through the Celery
pipeline.

A full assessment takes 30-60s (Companies House rate limit: 600 req / 5 min),
so `POST /assess/{company_number}` returns one of these immediately and the
frontend polls `GET /status/{job_id}` until `status` is COMPLETED or FAILED.
Persisted via the `assessment_jobs` table (`backend/app/db/models.py`).
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from contracts.common import JobStatus, PipelineStage


class JobError(BaseModel):
    """Populated when status=FAILED. Kept structured (not just a string) so
    the frontend can show a stage-specific retry hint."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "stage": "financials",
                "message": "No filed accounts found for this company number.",
                "retryable": False,
            }
        }
    )

    stage: PipelineStage
    message: str
    retryable: bool = Field(description="Whether re-running the job might succeed (e.g. CH rate limit vs. bad input).")


class AssessmentJob(BaseModel):
    """Status record for one async assessment run."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "job_id": "3fa85f64-5717-4562-b3fc-2c963f66afa6",
                "company_number": "01234567",
                "status": "running",
                "stage": "financials",
                "error": None,
                "created_at": "2026-08-10T12:00:00Z",
                "updated_at": "2026-08-10T12:00:20Z",
            }
        }
    )

    job_id: str = Field(description="UUID4, generated when the job is created.")
    company_number: str
    status: JobStatus
    stage: PipelineStage | None = Field(default=None, description="Current/last pipeline stage reached.")
    error: JobError | None = None
    created_at: datetime
    updated_at: datetime
