"""Rate-limiter interface for the Companies House API.

CH allows 600 requests / 5 minutes per API key (see .env.example
CH_RATE_LIMIT_REQUESTS / CH_RATE_LIMIT_WINDOW_SECONDS). A full assessment
makes on the order of 10-30 CH calls (company profile, officers list, one
appointments-history call per officer, filing history, one document-download
per accounts filing), so a single assessment is nowhere near the limit — the
limiter exists to protect against many *concurrent* assessments (Celery
workers) exhausting it together.

This module defines the interface only; `TokenBucketRateLimiter` is the
concrete implementation Person 1 will fill in (backed by Redis so it's
shared across worker processes, not per-process in-memory).
"""

from __future__ import annotations

from typing import Protocol


class RateLimiter(Protocol):
    """Something that can gate outbound Companies House requests."""

    async def acquire(self) -> None:
        """Block (async) until a request slot is available.

        Implementations should raise on misconfiguration but never on
        contention — contention means waiting, not erroring.
        """
        ...


class TokenBucketRateLimiter:
    """Redis-backed token bucket, shared across worker processes.

    Bucket capacity = CH_RATE_LIMIT_REQUESTS, refill window =
    CH_RATE_LIMIT_WINDOW_SECONDS (see app.config.settings).
    """

    def __init__(self, redis_url: str, capacity: int, window_seconds: int) -> None:
        self._redis_url = redis_url
        self._capacity = capacity
        self._window_seconds = window_seconds

    async def acquire(self) -> None:
        raise NotImplementedError(
            "TokenBucketRateLimiter.acquire: implement using a Redis-backed "
            "token bucket (e.g. INCR + EXPIRE or a sorted-set sliding window). "
            "Owner: Person 1."
        )
