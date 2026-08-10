"""Celery application instance.

Run with `make dev-worker` (`celery -A app.workers.celery_app worker`). A
full assessment takes 30-60s (Companies House rate limit), which is why
`POST /assess/{company_number}` (app/api) enqueues a task here rather than
computing synchronously in the request handler.
"""

from __future__ import annotations

from celery import Celery

from app.config import settings

celery_app = Celery(
    "counterparty_check",
    broker=settings.celery_broker_url,
    backend=settings.celery_result_backend,
    include=["app.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    result_serializer="json",
    accept_content=["json"],
    task_track_started=True,
)
