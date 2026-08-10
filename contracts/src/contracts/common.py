"""Shared enums and small value types used across multiple contract models.

Keeping these here (instead of duplicated per-model) is what makes it safe
for e.g. `financials` and `director_features` to both reference a filing
without disagreeing on what a "filing type" is.
"""

from __future__ import annotations

from datetime import date
from enum import StrEnum

from pydantic import BaseModel, ConfigDict, Field


class CompanyStatus(StrEnum):
    """Companies House `company_status` values we care about.

    Not exhaustive of every value CH can return (e.g. "converted-closed"),
    but covers the ones that affect scoring logic. Unknown values from the
    API should be mapped to OTHER rather than raising.
    """

    ACTIVE = "active"
    DISSOLVED = "dissolved"
    LIQUIDATION = "liquidation"
    RECEIVERSHIP = "receivership"
    ADMINISTRATION = "administration"
    VOLUNTARY_ARRANGEMENT = "voluntary-arrangement"
    OTHER = "other"


class SourceFormat(StrEnum):
    """How a FinancialExtract's underlying filing was obtained."""

    IXBRL = "ixbrl"
    PDF_SCANNED = "pdf_scanned"
    MISSING = "missing"


class Severity(StrEnum):
    INFO = "info"
    WARNING = "warning"
    CRITICAL = "critical"


class RedFlagCategory(StrEnum):
    GOVERNANCE = "governance"
    FINANCIAL = "financial"
    FILING = "filing"


class JobStatus(StrEnum):
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"


class PipelineStage(StrEnum):
    """Mirrors the call sequence in `backend/app/workers/pipeline.py`."""

    INGESTION = "ingestion"
    FINANCIALS = "financials"
    DIRECTOR_FEATURES = "director_features"
    SCORING = "scoring"
    DONE = "done"


class Address(BaseModel):
    """A postal address as returned by Companies House.

    All fields except `country` are optional because CH addresses are
    inconsistently populated (e.g. `premises` is often absent for older
    filings).
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "premises": "1",
                "address_line_1": "High Street",
                "address_line_2": None,
                "locality": "London",
                "region": None,
                "postal_code": "EC1A 1AA",
                "country": "England",
            }
        }
    )

    premises: str | None = Field(default=None, description="Building name/number.")
    address_line_1: str | None = None
    address_line_2: str | None = None
    locality: str | None = Field(default=None, description="Town/city.")
    region: str | None = None
    postal_code: str | None = None
    country: str = "United Kingdom"


class RatioValue(BaseModel):
    """A single computed ratio, or an explicit reason it couldn't be computed.

    Micro-entity accounts frequently omit the line items a ratio needs (e.g.
    no P&L filed at all), so every ratio in `RatioSet` is wrapped in this
    rather than being a bare `float | None` — `computable=False` plus
    `reason` is what lets the scoring module and the UI distinguish "this
    company has a ratio of zero" from "we don't have enough data".
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"value": 1.8, "computable": True, "reason": None},
        }
    )

    value: float | None = Field(default=None, description="Null when not computable.")
    computable: bool = Field(description="Whether enough source data existed to compute this.")
    reason: str | None = Field(
        default=None,
        description="Set when computable=False, e.g. 'no P&L filed (micro-entity exemption)'.",
    )


class EvidenceRef(BaseModel):
    """A pointer back to the specific filing/officer record backing a RedFlag.

    Kept generic (`source_type` + `source_id`) rather than a union of
    concrete refs so RedFlag doesn't need to change shape as new evidence
    sources (e.g. PSC data) get added later.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "source_type": "officer",
                "source_id": "abc123def456",
                "detail": "2 dissolved companies in the last 5 years",
            }
        }
    )

    source_type: str = Field(description="e.g. 'filing', 'officer', 'appointment'.")
    source_id: str = Field(description="ID of the record within source_type.")
    detail: str | None = Field(default=None, description="Human-readable pointer, e.g. filing date.")


class FilingHistorySummary(BaseModel):
    """Rolled-up view of a company's filing compliance, used by ApplicantProfile."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "last_accounts_made_up_to": "2024-03-31",
                "next_accounts_due_on": "2025-12-31",
                "last_confirmation_statement_date": "2024-06-01",
                "total_filings": 12,
                "late_filings_count": 1,
            }
        }
    )

    last_accounts_made_up_to: date | None = None
    next_accounts_due_on: date | None = None
    last_confirmation_statement_date: date | None = None
    total_filings: int = Field(ge=0, default=0)
    late_filings_count: int = Field(ge=0, default=0)
