"""Rate-limiter interface for the Companies House API.

CH allows 600 requests / 5 minutes per API key (see .env.example
CH_RATE_LIMIT_REQUESTS / CH_RATE_LIMIT_WINDOW_SECONDS). This module defines
the interface only; `TokenBucketRateLimiter` is the concrete implementation,
backed by Redis so it's shared across worker processes, not per-process
in-memory.
"""

from __future__ import annotations

import asyncio
from typing import Protocol

import redis.asyncio as redis


class RateLimiter(Protocol):
    """Something that can gate outbound Companies House requests."""

    async def acquire(self) -> None:
        """Block (async) until a request slot is available."""
        ...


class TokenBucketRateLimiter:
    """Redis-backed fixed-window counter, shared across worker processes.

    Capacity = CH_RATE_LIMIT_REQUESTS, window = CH_RATE_LIMIT_WINDOW_SECONDS
    (see app.config.settings).
    """

    def __init__(self, redis_url: str, capacity: int, window_seconds: int) -> None:
        self._redis_url = redis_url
        self._client = redis.from_url(redis_url, decode_responses=True)
        self._capacity = capacity
        self._window_seconds = window_seconds
        self._key = "ch:rate_limit:counter"

    async def acquire(self) -> None:
        while True:
            current = await self._client.incr(self._key)
            if current == 1:
                await self._client.expire(self._key, self._window_seconds)

            if current <= self._capacity:
                return

            ttl = await self._client.ttl(self._key)
            wait_time = ttl if ttl > 0 else 1
            await asyncio.sleep(wait_time)