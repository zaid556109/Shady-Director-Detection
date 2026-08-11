"""Caching interface for Companies House API responses.

CH data changes rarely (a company's officer list doesn't change hour to
hour), so caching raw responses is what keeps a re-run assessment fast and
keeps us well under the rate limit during development/demo. Interface only —
`RedisResponseCache` is the concrete implementation Person 1 will fill in.
"""

from __future__ import annotations

from typing import Protocol

import redis.asyncio as redis


class ResponseCache(Protocol):
    """Cache for raw (pre-parsing) Companies House API responses."""

    async def get(self, key: str) -> str | None:
        """Return the cached raw JSON body for `key`, or None on a miss."""
        ...

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        """Cache `value` under `key` for `ttl_seconds`."""
        ...


class RedisResponseCache:
    """Redis-backed cache. Key scheme: `ch:{endpoint}:{company_number_or_officer_id}`.

    TTLs: company profile 1h, officers/appointments 1h, filing history 15m
    (accounts can be filed at any time), documents indefinite.
    """

    def __init__(self, redis_url: str) -> None:
        self._redis_url = redis_url
        self._client = redis.from_url(redis_url, decode_responses=True)

    async def get(self, key: str) -> str | None:
        return await self._client.get(key)

    async def set(self, key: str, value: str, ttl_seconds: int) -> None:
        await self._client.set(key, value, ex=ttl_seconds)