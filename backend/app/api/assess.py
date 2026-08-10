"""POST /assess/{company_number} — enqueue an async assessment job.

Real async flow: creates an AssessmentJob row (status=pending) and enqueues
`run_assessment` on Celery, which is the appropriate path once real
Companies House calls make a single assessment take 30-60s (see
app/ingestion/client.py rate-limit docs). Requires postgres + redis running
(`make up`) — unlike GET /report, which computes synchronously against
mocks and needs neither.
"""

from __future__ import annotations

from datetime import UTC, datetime

from fastapi import APIRouter, Depends
from sqlalchemy.orm import Session

from app.api.deps import get_db
from app.contracts import AssessmentJob, JobStatus
from app.db.models import AssessmentJob as AssessmentJobRow
from app.workers.tasks import run_assessment

router = APIRouter(tags=["assess"])


@router.post("/assess/{company_number}", response_model=AssessmentJob, status_code=202)
def create_assessment(company_number: str, db: Session = Depends(get_db)) -> AssessmentJob:
    now = datetime.now(UTC)
    job_row = AssessmentJobRow(company_number=company_number, status=JobStatus.PENDING.value)
    db.add(job_row)
    db.commit()
    db.refresh(job_row)

    run_assessment.delay(job_row.job_id, company_number)

    return AssessmentJob(
        job_id=job_row.job_id,
        company_number=company_number,
        status=JobStatus.PENDING,
        stage=None,
        error=None,
        created_at=now,
        updated_at=now,
    )
