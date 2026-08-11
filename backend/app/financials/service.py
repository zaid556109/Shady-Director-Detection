"""Public entrypoints for the financials module.
 
`extract_financials` and `compute_ratios` are what `director_features`,
`scoring`, and the pipeline import. Both currently return mock data; wiring
in app.financials.parser / app.financials.ratios is Person 2's task and
should not change either signature.
"""
 
from __future__ import annotations
 
from dataclasses import dataclass
from pathlib import Path
 
from app.contracts import (
    ApplicantProfile,
    BalanceSheetItems,
    FinancialExtract,
    ProfitAndLossItems,
    RatioSet,
    RatioValue,
    SourceFormat,
)
from app.financials.parser import parse_ixbrl_document
from app.financials.ratios import altman_z, current_ratio, gearing
from app.utils.mock_loader import (
    MOCK_COMPANY_NUMBERS,
    load_mock_model,
    load_mock_model_list,
    resolve_scenario,
)
 
 
@dataclass
class _FetchedDocument:
    """One fetched accounts document, ready to parse.
 
    This shape is a GUESS at what Person 1's real ingestion client will
    return — filing_year/period_start/period_end/source_format/raw_bytes.
    Once app.ingestion.client exists for real, confirm the actual return
    type with Person 1 and adjust `_fetch_accounts_documents` below (and
    this dataclass, if the real shape differs) — nothing else in this file
    needs to change if the field names match.
    """
 
    filing_year: int
    period_start: str
    period_end: str
    source_format: SourceFormat
    raw_bytes: bytes
 
 
def _fetch_accounts_documents(company_number: str) -> list[_FetchedDocument]:
    """TEMPORARY placeholder for Person 1's real ingestion fetch.
 
    Swap this entire function body for a call into app.ingestion.client
    once that exists. Until then, this reads a locally downloaded sample
    file so the rest of the pipeline (parsing + ratios) is testable today.
 
    Convention while this stub is in place: put a downloaded accounts HTML
    file at `backend/app/financials/_sample_docs/<company_number>.html` and
    it'll be picked up here. This whole function — and the convention —
    goes away once real ingestion exists.
    """
    sample_dir = Path(__file__).parent / "_sample_docs"
    sample_path = sample_dir / f"{company_number}.html"
 
    if not sample_path.exists():
        # No sample on disk for this company — return nothing rather than
        # raising, so callers get an empty-but-valid result instead of a
        # crash while this stub is in place.
        return []
 
    raw_bytes = sample_path.read_bytes()
    return [
        _FetchedDocument(
            filing_year=2024,  # TODO: real fetch will know the actual year
            period_start="2023-01-01",
            period_end="2023-12-31",
            source_format=SourceFormat.IXBRL,
            raw_bytes=raw_bytes,
        )
    ]
 
 
def _as_ratio_value(value: float | None) -> RatioValue:
    """Wrap a plain figure (not a formula result) as a RatioValue.
 
    Used for fields like net_assets that are read directly off the balance
    sheet rather than computed from other ratios.
    """
    if value is None:
        return RatioValue(
            value=None, computable=False, reason="net_assets not filed"
        )
    return RatioValue(value=value, computable=True, reason=None)
 
 
def extract_financials(profile: ApplicantProfile) -> list[FinancialExtract]:
    """Parse every filed accounts document for `profile` into FinancialExtracts.
 
    Real implementation: fetches each accounts document for the company and
    parses iXBRL ones via app.financials.parser.parse_ixbrl_document,
    falling back to an empty/zero-confidence extract for non-iXBRL formats
    (e.g. scanned PDF).
 
    Known mock company numbers (MOCK_COMPANY_NUMBERS — used by
    test_pipeline.py's day-1 demo guarantee and by the frontend's mocked
    dashboard) still go through the mock loader, so the existing test suite
    and demo stay green while the real path is developed and tested
    separately against real company numbers / real downloaded filings.
    """
    if profile.company_number in MOCK_COMPANY_NUMBERS:
        scenario = resolve_scenario(profile.company_number)
        return load_mock_model_list(scenario, "financial_extracts.json", FinancialExtract)
 
    documents = _fetch_accounts_documents(profile.company_number)
 
    extracts: list[FinancialExtract] = []
    for doc in documents:
        if doc.source_format != SourceFormat.IXBRL:
            extracts.append(
                FinancialExtract(
                    company_number=profile.company_number,
                    filing_year=doc.filing_year,
                    period_start=doc.period_start,
                    period_end=doc.period_end,
                    currency="GBP",
                    source_format=doc.source_format,
                    extraction_confidence=0.0,
                    balance_sheet=BalanceSheetItems(),
                    profit_and_loss=ProfitAndLossItems(),
                )
            )
            continue
 
        balance_sheet, profit_and_loss, confidence = parse_ixbrl_document(
            doc.raw_bytes
        )
        extracts.append(
            FinancialExtract(
                company_number=profile.company_number,
                filing_year=doc.filing_year,
                period_start=doc.period_start,
                period_end=doc.period_end,
                currency="GBP",
                source_format=SourceFormat.IXBRL,
                extraction_confidence=confidence,
                balance_sheet=balance_sheet,
                profit_and_loss=profit_and_loss,
            )
        )
 
    return extracts
 
 
def compute_ratios(extracts: list[FinancialExtract]) -> RatioSet:
    """Compute a RatioSet from one or more years of FinancialExtracts.
 
    Uses the most recent extract for point-in-time ratios. yoy_trends
    (prior-year comparison) is left empty until multi-year logic is needed.
 
    Known mock company numbers still go through the mock loader — see the
    note on extract_financials above for why.
    """
    if not extracts:
        raise ValueError("compute_ratios requires at least one FinancialExtract")
 
    if extracts[0].company_number in MOCK_COMPANY_NUMBERS:
        scenario = resolve_scenario(extracts[0].company_number)
        return load_mock_model(scenario, "ratio_set.json", RatioSet)
 
    latest = extracts[0]
    bs = latest.balance_sheet
    pl = latest.profit_and_loss
 
    working_capital = (
        bs.current_assets - bs.current_liabilities
        if bs.current_assets is not None and bs.current_liabilities is not None
        else None
    )
    total_assets = (
        bs.fixed_assets + bs.current_assets
        if bs.fixed_assets is not None and bs.current_assets is not None
        else None
    )
    total_liabilities = (
        (bs.current_liabilities or 0) + (bs.long_term_liabilities or 0)
        if bs.current_liabilities is not None or bs.long_term_liabilities is not None
        else None
    )
 
    return RatioSet(
        company_number=latest.company_number,
        filing_year=latest.filing_year,
        current_ratio=current_ratio(bs.current_assets, bs.current_liabilities),
        gearing=gearing(
            bs.long_term_liabilities, bs.current_liabilities, bs.shareholder_funds
        ),
        altman_z=altman_z(
            working_capital=working_capital,
            retained_earnings=bs.net_assets,
            ebit=pl.operating_profit,
            total_assets=total_assets,
            total_liabilities=total_liabilities,
            turnover=pl.turnover,
        ),
        net_assets=_as_ratio_value(bs.net_assets),
        yoy_trends=[],
    )