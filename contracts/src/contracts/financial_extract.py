"""FinancialExtract — one filed accounts period, parsed into structured line
items.

Produced by `financials.extract_financials(profile) -> list[FinancialExtract]`
(one per filing year found). Every balance-sheet/P&L field is Optional
because micro-entity accounts legally omit most of them — `RatioSet`
downstream is responsible for degrading gracefully when fields are missing,
not this model.
"""

from __future__ import annotations

from datetime import date

from pydantic import BaseModel, ConfigDict, Field

from contracts.common import SourceFormat


class BalanceSheetItems(BaseModel):
    """Balance sheet line items, GBP, as filed. All optional — micro-entity
    accounts under FRS 105 typically file only `net_assets` and share capital.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "fixed_assets": 250000.0,
                "current_assets": 180000.0,
                "cash": 90000.0,
                "current_liabilities": 60000.0,
                "long_term_liabilities": 40000.0,
                "net_assets": 330000.0,
                "shareholder_funds": 330000.0,
            }
        }
    )

    fixed_assets: float | None = None
    current_assets: float | None = None
    cash: float | None = None
    current_liabilities: float | None = None
    long_term_liabilities: float | None = None
    net_assets: float | None = None
    shareholder_funds: float | None = None


class ProfitAndLossItems(BaseModel):
    """P&L line items, GBP, as filed. Often entirely absent for micro-entity
    accounts (FRS 105 doesn't require filing a P&L)."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "turnover": 900000.0,
                "gross_profit": 400000.0,
                "operating_profit": 150000.0,
                "profit_before_tax": 140000.0,
                "profit_after_tax": 112000.0,
            }
        }
    )

    turnover: float | None = None
    gross_profit: float | None = None
    operating_profit: float | None = None
    profit_before_tax: float | None = None
    profit_after_tax: float | None = None


class FinancialExtract(BaseModel):
    """One filing period's parsed accounts.

    `source_format` and `extraction_confidence` exist so downstream ratio
    calculation and scoring can distinguish "clean iXBRL parse" from "we
    scraped numbers out of a scanned PDF" — the latter should weight lower
    in `ScoreBreakdown`, not error out.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "company_number": "01234567",
                "filing_year": 2024,
                "period_start": "2023-04-01",
                "period_end": "2024-03-31",
                "currency": "GBP",
                "source_format": "ixbrl",
                "extraction_confidence": 0.98,
                "balance_sheet": {
                    "fixed_assets": 250000.0,
                    "current_assets": 180000.0,
                    "cash": 90000.0,
                    "current_liabilities": 60000.0,
                    "long_term_liabilities": 40000.0,
                    "net_assets": 330000.0,
                    "shareholder_funds": 330000.0,
                },
                "profit_and_loss": {
                    "turnover": 900000.0,
                    "gross_profit": 400000.0,
                    "operating_profit": 150000.0,
                    "profit_before_tax": 140000.0,
                    "profit_after_tax": 112000.0,
                },
            }
        }
    )

    company_number: str
    filing_year: int = Field(description="Calendar year the accounting period ends in.")
    period_start: date | None = None
    period_end: date | None = None
    currency: str = "GBP"
    source_format: SourceFormat
    extraction_confidence: float = Field(
        ge=0.0, le=1.0, description="1.0 = clean structured parse, lower = degraded/manual extraction."
    )
    balance_sheet: BalanceSheetItems = Field(default_factory=BalanceSheetItems)
    profit_and_loss: ProfitAndLossItems = Field(default_factory=ProfitAndLossItems)
