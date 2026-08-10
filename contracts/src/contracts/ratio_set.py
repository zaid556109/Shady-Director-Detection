"""RatioSet — financial ratios derived from one or more FinancialExtracts.

Produced by `financials.compute_ratios(extracts) -> RatioSet`. Every ratio is
a `RatioValue` (value + computable + reason) rather than a bare float,
because the whole point of this contract is to let sparse micro-entity
accounts flow through the pipeline without the ratio calculator (or scoring)
having to special-case "missing data" — it's a first-class, explainable
outcome instead of a null that gets silently treated as zero.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from contracts.common import RatioValue


class YoyTrend(BaseModel):
    """Year-over-year direction for one ratio, computed when 2+ filing years
    are available."""

    model_config = ConfigDict(
        json_schema_extra={"example": {"metric": "net_assets", "direction": "improving", "delta_pct": 12.5}}
    )

    metric: str = Field(description="Which underlying figure this trend describes, e.g. 'net_assets'.")
    direction: str = Field(description="'improving' | 'deteriorating' | 'flat'.")
    delta_pct: float | None = Field(default=None, description="% change year-over-year, null if not computable.")


class RatioSet(BaseModel):
    """Financial ratios for a company, computed from its most recent (and
    prior, for trends) FinancialExtracts.

    `company_number` is here (not just on FinancialExtract) so that
    `scoring.score()` can resolve mock/real data by company number from
    this object alone — see `backend/app/workers/pipeline.py`.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "company_number": "01234567",
                "filing_year": 2024,
                "current_ratio": {"value": 3.0, "computable": True, "reason": None},
                "gearing": {"value": 0.12, "computable": True, "reason": None},
                "net_assets": {"value": 330000.0, "computable": True, "reason": None},
                "altman_z": {"value": 4.1, "computable": True, "reason": None},
                "yoy_trends": [{"metric": "net_assets", "direction": "improving", "delta_pct": 12.5}],
            }
        }
    )

    company_number: str
    filing_year: int = Field(description="Most recent filing year these ratios are computed as-of.")

    current_ratio: RatioValue = Field(description="current_assets / current_liabilities.")
    gearing: RatioValue = Field(description="(long_term_liabilities + current_liabilities) / shareholder_funds.")
    net_assets: RatioValue = Field(description="Passthrough of balance_sheet.net_assets, flagged if negative.")
    altman_z: RatioValue = Field(description="Altman Z-score (private-company variant).")

    yoy_trends: list[YoyTrend] = Field(default_factory=list)
