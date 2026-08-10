"""Ratio formulas.

Each function takes the raw figures it needs and returns a `RatioValue`
(never a bare float) — if a required input is None, the function should
return `RatioValue(value=None, computable=False, reason=...)` rather than
raising, since sparse micro-entity accounts are the expected common case,
not an edge case.
"""

from __future__ import annotations

from contracts import RatioValue


def current_ratio(current_assets: float | None, current_liabilities: float | None) -> RatioValue:
    """current_assets / current_liabilities.

    Real implementation (Person 2, TODO): guard current_liabilities == 0,
    return computable=False with both operands missing/zero cases covered.
    """
    raise NotImplementedError("current_ratio. Owner: Person 2.")


def gearing(long_term_liabilities: float | None, current_liabilities: float | None, shareholder_funds: float | None) -> RatioValue:
    """(long_term_liabilities + current_liabilities) / shareholder_funds.

    Real implementation (Person 2, TODO): shareholder_funds <= 0 (negative
    equity) is a valid, important, non-error case — should still be
    computable, just a large/negative ratio, and separately feed the
    negative-equity red flag in director_features or scoring.
    """
    raise NotImplementedError("gearing. Owner: Person 2.")


def altman_z(
    working_capital: float | None,
    retained_earnings: float | None,
    ebit: float | None,
    total_assets: float | None,
    total_liabilities: float | None,
    turnover: float | None,
) -> RatioValue:
    """Altman Z-score, private-company variant (Z').

    Real implementation (Person 2, TODO): standard private-firm coefficients
    are 6.56/3.26/6.72/1.05 over (WC/TA, RE/TA, EBIT/TA, BVE/TL) plus a
    turnover term depending on which variant is chosen — pick one, document
    it here, and require all five inputs (return computable=False with a
    combined reason otherwise, since a partial Z-score is misleading rather
    than approximately right).
    """
    raise NotImplementedError("altman_z. Owner: Person 2.")
