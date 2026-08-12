"""Companies House API client.

Base URLs and auth: HTTP Basic auth with the API key as the username, blank
password. Rate limit: 600 requests / 5 minutes per key.
"""

from __future__ import annotations

import json
from typing import Any, cast

import httpx

from app.ingestion.cache import ResponseCache
from app.ingestion.rate_limiter import RateLimiter


class CompaniesHouseClient:
    """Thin async HTTP client over the Companies House REST + Document APIs."""

    def __init__(
        self,
        api_key: str,
        base_url: str,
        document_base_url: str,
        rate_limiter: RateLimiter,
        cache: ResponseCache,
    ) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._document_base_url = document_base_url
        self._rate_limiter = rate_limiter
        self._cache = cache

    async def _get(self, url: str, cache_key: str, ttl_seconds: int = 3600) -> dict[str, Any]:
        cached = await self._cache.get(cache_key)
        if cached is not None:
            return cast(dict[str, Any], json.loads(cached))

        await self._rate_limiter.acquire()

        async with httpx.AsyncClient() as client:
            response = await client.get(url, auth=(self._api_key, ""))
            response.raise_for_status()
            data = response.json()

        await self._cache.set(cache_key, json.dumps(data), ttl_seconds)
        return cast(dict[str, Any], data)

    async def fetch_company_profile(self, company_number: str) -> dict[str, Any]:
        """GET /company/{company_number}"""
        url = f"{self._base_url}/company/{company_number}"
        return await self._get(url, cache_key=f"ch:profile:{company_number}", ttl_seconds=3600)

    async def fetch_officers(self, company_number: str) -> list[dict[str, Any]]:
        """GET /company/{company_number}/officers"""
        url = f"{self._base_url}/company/{company_number}/officers"
        data = await self._get(url, cache_key=f"ch:officers:{company_number}", ttl_seconds=3600)
        return cast(list[dict[str, Any]], data.get("items", []))

    async def fetch_officer_appointments(self, officer_id: str) -> list[dict[str, Any]]:
        """GET /officers/{officer_id}/appointments"""
        url = f"{self._base_url}/officers/{officer_id}/appointments"
        data = await self._get(url, cache_key=f"ch:appointments:{officer_id}", ttl_seconds=3600)
        return cast(list[dict[str, Any]], data.get("items", []))

    async def fetch_filing_history(self, company_number: str) -> list[dict[str, Any]]:
        """GET /company/{company_number}/filing-history"""
        url = f"{self._base_url}/company/{company_number}/filing-history"
        data = await self._get(url, cache_key=f"ch:filings:{company_number}", ttl_seconds=900)
        return cast(list[dict[str, Any]], data.get("items", []))

    async def fetch_filing_document(self, document_metadata_url: str) -> bytes:
        """Document API: GET {document_metadata_url}/content, following the
        redirect to the pre-signed S3 URL Companies House issues for the
        actual file bytes."""
        await self._rate_limiter.acquire()

        async with httpx.AsyncClient(follow_redirects=True) as client:
            content_response = await client.get(
                f"{document_metadata_url}/content",
                auth=(self._api_key, ""),
                headers={"Accept": "application/xhtml+xml"},
            )
            content_response.raise_for_status()
            return content_response.content
