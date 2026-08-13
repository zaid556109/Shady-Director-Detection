"""iXBRL parsing for filed accounts documents.
 
Companies House accounts are filed as iXBRL (inline XBRL — HTML with
embedded XBRL tags) for digitally-filed accounts, or as scanned PDF for
older/paper filings (no structured data recoverable beyond OCR — out of
scope for extraction, hence `SourceFormat.PDF_SCANNED` exists as a
degrade-gracefully case rather than something we parse).
 
UK GAAP accounts use the FRC's `uk-gaap` iXBRL taxonomy; micro-entity
accounts (FRS 105) additionally use `uk-cir` / a reduced tag set and legally
omit the P&L and most notes — that's the taxonomy-level reason
`ProfitAndLossItems` fields are Optional and why `sparse_micro` in /mocks
has an almost-empty FinancialExtract.
 
This module parses a single filed document into structured line items.
`extract_financials` (service.py) is responsible for fetching the document
(via app.ingestion.client) and looping over filing years; this module just
does one document -> BalanceSheetItems/ProfitAndLossItems.
"""
 
from __future__ import annotations
 
from bs4 import BeautifulSoup
 
from contracts import BalanceSheetItems, ProfitAndLossItems
 
# ---------------------------------------------------------------------------
# Concept-name keyword mapping.
#
# Real filings use different namespace prefixes (uk-gaap:, uk-bus:, core:,
# frs105:, uk-cir:, ...) for the same concept, and even the concept name
# itself varies slightly by taxonomy version/filing software. Matching on
# the meaningful substring rather than an exact qualified name is
# deliberately more resilient than a hardcoded exact-match table — verified
# by pulling several real Companies House filings and comparing tag names
# before writing this list (see PR description / team notes for examples
# seen). Extend these lists as new filings surface new variants.
# ---------------------------------------------------------------------------
 
BALANCE_SHEET_CONCEPTS: dict[str, list[str]] = {
    "current_assets": ["CurrentAssets"],
    "current_liabilities": [
        "CreditorsDueWithinOneYear",
        "AccrualsAndDeferredIncomeWithinOneYear",
    ],
    "long_term_liabilities": [
        "CreditorsDueAfterOneYear",
        "ProvisionsForLiabilities",
    ],
    "fixed_assets": ["FixedAssets", "PropertyPlantEquipment"],
    "cash": ["CashBankInHand", "CashBankOnHand", "CashAndCashEquivalents"],
    "net_assets": [
        "NetAssetsLiabilities",
        "NetAssetsLiabilitiesIncludingPensionAssetLiability",
    ],
    "shareholder_funds": ["ShareholdersFunds", "Equity"],
}
 
PROFIT_AND_LOSS_CONCEPTS: dict[str, list[str]] = {
    "turnover": ["Turnover", "Revenue"],
    "gross_profit": ["GrossProfitLoss"],
    "operating_profit": ["OperatingProfitLoss"],
    "profit_before_tax": ["ProfitLossOnOrdinaryActivitiesBeforeTax"],
    "profit_after_tax": ["ProfitLoss", "ProfitLossForPeriod"],
}
 
 
def _extract_all_facts(soup: BeautifulSoup) -> list[dict]:
    """Pull every ix:nonfraction fact out of the parsed document."""
    facts: list[dict] = []
    for tag in soup.find_all("ix:nonfraction"):
        name = tag.get("name", "")
        concept = name.split(":")[-1] if name else ""
        sign = tag.get("sign", "")
        raw_value = tag.get_text(strip=True).replace(",", "")
        try:
            value = float(raw_value) if raw_value else None
        except ValueError:
            value = None
        if sign == "-" and value is not None:
            value = -value
        if concept:
            facts.append({"concept": concept, "value": value})
    return facts
 
 
def _find_first_match(facts: list[dict], keywords: list[str]) -> float | None:
    """First fact whose concept name contains any of the given keywords."""
    for kw in keywords:
        for fact in facts:
            if kw.lower() in fact["concept"].lower() and fact["value"] is not None:
                return fact["value"]
    return None
 
 
def parse_ixbrl_document(
    document_bytes: bytes,
) -> tuple[BalanceSheetItems, ProfitAndLossItems, float]:
    """Parse one iXBRL accounts document.
 
    Returns (balance_sheet, profit_and_loss, extraction_confidence).
    """
    html = document_bytes.decode("utf-8", errors="ignore")
    soup = BeautifulSoup(html, "lxml")
    facts = _extract_all_facts(soup)
 
    bs_values = {
        field: _find_first_match(facts, keywords)
        for field, keywords in BALANCE_SHEET_CONCEPTS.items()
    }
    pl_values = {
        field: _find_first_match(facts, keywords)
        for field, keywords in PROFIT_AND_LOSS_CONCEPTS.items()
    }
 
    balance_sheet = BalanceSheetItems(**bs_values)
    profit_and_loss = ProfitAndLossItems(**pl_values)
 
    # Confidence = fraction of all expected fields (balance sheet + P&L)
    # that we actually found tagged in the document. A micro-entity filing
    # legitimately omitting the P&L should score lower than a full filing,
    # without that being treated as a parsing failure.
    all_expected = list(bs_values.values()) + list(pl_values.values())
    filled = sum(1 for v in all_expected if v is not None)
    extraction_confidence = round(filled / len(all_expected), 2) if all_expected else 0.0
 
    return balance_sheet, profit_and_loss, extraction_confidence