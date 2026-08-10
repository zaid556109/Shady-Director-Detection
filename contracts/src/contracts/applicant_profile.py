"""ApplicantProfile — the normalized snapshot of a company that everything
downstream (financials, director_features, scoring) is computed from.

This is the output of `ingestion.build_applicant_profile()` and the input to
both feature-cluster modules; it's the widest "fan-out" contract in the
system, so changes here ripple the furthest (see CONTRIBUTING.md).
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from contracts.common import Address, CompanyStatus, FilingHistorySummary


class OfficerSummary(BaseModel):
    """One director/officer as they appear on this company's record.

    Deliberately thin — full history (other appointments, dissolved
    companies, etc.) lives in `DirectorFeatureSet`, keyed by `officer_id`.
    This is just "who is on this company today/historically".
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "officer_id": "abc123def456ghi789",
                "name": "SMITH, John Michael",
                "role": "director",
                "appointed_on": "2018-05-14",
                "resigned_on": None,
                "nationality": "British",
                "occupation": "Company Director",
            }
        }
    )

    officer_id: str = Field(description="Companies House officer/appointment ID.")
    name: str
    role: str = Field(description="e.g. 'director', 'secretary'.")
    appointed_on: date | None = None
    resigned_on: date | None = None
    nationality: str | None = None
    occupation: str | None = None


class ApplicantProfile(BaseModel):
    """Normalized company profile assembled from the Companies House API.

    Produced by `ingestion.build_applicant_profile(company_number)`. Every
    other contract in the pipeline either derives from this directly
    (financials, director features) or references its `company_number`.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "company_number": "01234567",
                "company_name": "HEALTHY EXAMPLE PLC",
                "status": "active",
                "incorporation_date": "2005-03-11",
                "sic_codes": ["62012", "62020"],
                "registered_address": {
                    "premises": "1",
                    "address_line_1": "High Street",
                    "address_line_2": None,
                    "locality": "London",
                    "region": None,
                    "postal_code": "EC1A 1AA",
                    "country": "England",
                },
                "officers": [],
                "filing_history": {
                    "last_accounts_made_up_to": "2024-03-31",
                    "next_accounts_due_on": "2025-12-31",
                    "last_confirmation_statement_date": "2024-06-01",
                    "total_filings": 12,
                    "late_filings_count": 0,
                },
                "accounts_overdue": False,
                "data_completeness": 0.95,
            }
        }
    )

    company_number: str = Field(description="8-character CH company number, as filed (may have leading zeros).")
    company_name: str
    status: CompanyStatus
    incorporation_date: date | None = None
    sic_codes: list[str] = Field(default_factory=list, description="UK SIC 2007 codes.")
    registered_address: Address
    officers: list[OfficerSummary] = Field(default_factory=list)
    filing_history: FilingHistorySummary = Field(default_factory=FilingHistorySummary)
    accounts_overdue: bool = False
    data_completeness: float = Field(
        ge=0.0,
        le=1.0,
        description=(
            "Fraction of expected profile fields CH actually returned. Feeds "
            "into RedFlag/ScoreBreakdown confidence, not just a UI hint."
        ),
    )
