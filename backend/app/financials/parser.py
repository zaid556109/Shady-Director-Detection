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

from contracts import BalanceSheetItems, ProfitAndLossItems


def parse_ixbrl_document(document_bytes: bytes) -> tuple[BalanceSheetItems, ProfitAndLossItems, float]:
    """Parse one iXBRL accounts document.

    Returns (balance_sheet, profit_and_loss, extraction_confidence).

    Real implementation (Person 2, TODO): use `python-xbrl` or a direct
    lxml walk over `ix:nonFraction` tags matching known uk-gaap/uk-cir
    concept names (e.g. `NetAssetsLiabilities`, `Turnover`,
    `CurrentAssets`). extraction_confidence should reflect how many of the
    expected concepts were actually found tagged in the document.
    """
    raise NotImplementedError("parse_ixbrl_document: implement iXBRL tag extraction. Owner: Person 2.")
