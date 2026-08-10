"""Companies House API client.

Base URLs and auth: HTTP Basic auth with the API key as the username, blank
password (see app.config.settings.ch_api_key / ch_api_base_url). Rate limit:
600 requests / 5 minutes per key — see app.ingestion.rate_limiter.

Endpoints this client will use (public docs:
https://developer-specs.company-information.service.gov.uk/):

- GET /company/{company_number}
    Core profile: name, status, incorporation date, SIC codes, registered
    office address. -> feeds ApplicantProfile top-level fields.
- GET /company/{company_number}/officers
    List of current + resigned officers with their officer_id (technically
    an "appointment link" ID scoped to this company). -> ApplicantProfile.officers
- GET /officers/{officer_id}/appointments
    Cross-company appointment history for one officer — this is the call
    that makes the director graph possible (Cluster A). Note: CH's
    officer_id here is per-appointment-list, not a stable global person ID;
    Person 3's graph-building code needs to dedupe by name+DOB heuristics,
    documented in director_features/graph.py.
- GET /company/{company_number}/filing-history
    Filing list with dates, types, and (for accounts) links to documents.
    -> ApplicantProfile.filing_history, and the entry point for financials.
- GET /company/{company_number}/filing-history/{transaction_id}
    Single filing detail, including the `links.document_metadata` URL.
- Document API (different base URL, ch_document_api_base_url):
  GET {document_metadata_url} then GET .../content (Accept: application/xhtml+xml
    for iXBRL, or application/pdf) to fetch the actual accounts document that
    `financials.extract_financials` parses.
- GET /company/{company_number}/persons-with-significant-control
    Not used in v1 (out of scope per project summary) but the endpoint most
    likely to be added if shared-address clustering needs PSC data later.

No real HTTP calls happen anywhere in this scaffold — every `fetch_*`
function below raises NotImplementedError. `app.ingestion.service.
build_applicant_profile` does NOT call these yet; it returns mock data (see
app/utils/mock_loader.py). Wiring fetch_* into build_applicant_profile is
Person 1's first real task.
"""

from __future__ import annotations

from typing import Any

from app.ingestion.cache import ResponseCache
from app.ingestion.rate_limiter import RateLimiter


class CompaniesHouseClient:
    """Thin async HTTP client over the Companies House REST + Document APIs."""

    def __init__(self, api_key: str, base_url: str, document_base_url: str, rate_limiter: RateLimiter, cache: ResponseCache) -> None:
        self._api_key = api_key
        self._base_url = base_url
        self._document_base_url = document_base_url
        self._rate_limiter = rate_limiter
        self._cache = cache

    async def fetch_company_profile(self, company_number: str) -> dict[str, Any]:
        """GET /company/{company_number}"""
        raise NotImplementedError("CompaniesHouseClient.fetch_company_profile. Owner: Person 1.")

    async def fetch_officers(self, company_number: str) -> list[dict[str, Any]]:
        """GET /company/{company_number}/officers"""
        raise NotImplementedError("CompaniesHouseClient.fetch_officers. Owner: Person 1.")

    async def fetch_officer_appointments(self, officer_id: str) -> list[dict[str, Any]]:
        """GET /officers/{officer_id}/appointments"""
        raise NotImplementedError("CompaniesHouseClient.fetch_officer_appointments. Owner: Person 1.")

    async def fetch_filing_history(self, company_number: str) -> list[dict[str, Any]]:
        """GET /company/{company_number}/filing-history"""
        raise NotImplementedError("CompaniesHouseClient.fetch_filing_history. Owner: Person 1.")

    async def fetch_filing_document(self, document_metadata_url: str) -> bytes:
        """Document API: resolve document_metadata_url, then GET .../content."""
        raise NotImplementedError("CompaniesHouseClient.fetch_filing_document. Owner: Person 1.")
