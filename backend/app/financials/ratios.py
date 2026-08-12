"""Ratio formulas.

Each function takes the raw figures it needs and returns a `RatioValue`
(never a bare float) — if a required input is None, the function returns
`RatioValue(value=None, computable=False, reason=...)` rather than raising,
since sparse micro-entity accounts are the expected common case, not an
edge case.
"""

from __future__ import annotations

from contracts import RatioValue


def current_ratio(current_assets: float | None, current_liabilities: float | None) -> RatioValue:
    """current_assets / current_liabilities."""
    if current_assets is None or current_liabilities is None:
        return RatioValue(
            value=None,
            computable=False,
            reason="current_assets and/or current_liabilities not filed "
            "(common for micro-entity exemption filings)",
        )
    if current_liabilities == 0:
        return RatioValue(
            value=None,
            computable=False,
            reason="current_liabilities is zero — ratio undefined",
        )
    return RatioValue(
        value=round(current_assets / current_liabilities, 2),
        computable=True,
        reason=None,
    )


def gearing(
    long_term_liabilities: float | None,
    current_liabilities: float | None,
    shareholder_funds: float | None,
) -> RatioValue:
    """(long_term_liabilities + current_liabilities) / shareholder_funds.

    Negative equity (shareholder_funds < 0) is a valid, important,
    non-error case — it should still be computable (the ratio will simply
    be negative/large), not treated as a failure. That result feeds a
    separate negative-equity red flag elsewhere in the pipeline; this
    function's only job is the arithmetic.
    """
    if long_term_liabilities is None and current_liabilities is None:
        return RatioValue(
            value=None,
            computable=False,
            reason="liabilities breakdown not filed (common for micro-entity exemption filings)",
        )
    if shareholder_funds is None:
        return RatioValue(
            value=None,
            computable=False,
            reason="shareholder_funds not filed",
        )
    if shareholder_funds == 0:
        return RatioValue(
            value=None,
            computable=False,
            reason="shareholder_funds is zero — ratio undefined",
        )

    total_liabilities = (long_term_liabilities or 0) + (current_liabilities or 0)
    return RatioValue(
        value=round(total_liabilities / shareholder_funds, 2),
        computable=True,
        reason=None,
    )


def altman_z(
    working_capital: float | None,
    retained_earnings: float | None,
    ebit: float | None,
    total_assets: float | None,
    total_liabilities: float | None,
    turnover: float | None,
) -> RatioValue:
    """Altman Z-score, private-company variant (Z').

    Using the standard private-firm coefficients over four ratios, plus a
    turnover/total-assets term:

        Z' = 6.56*(WC/TA) + 3.26*(RE/TA) + 6.72*(EBIT/TA)
             + 1.05*(BVE/TL) + 1.0*(Sales/TA)

    All six inputs are required — a partial Z-score is misleading rather
    than approximately right, so this returns computable=False unless
    every input is present. In practice, most micro-entity filings (which
    omit the P&L) will not have ebit/turnover available, and this will
    correctly report as not computable rather than fabricate a score.
    """
    inputs = {
        "working_capital": working_capital,
        "retained_earnings": retained_earnings,
        "ebit": ebit,
        "total_assets": total_assets,
        "total_liabilities": total_liabilities,
        "turnover": turnover,
    }
    missing = [name for name, val in inputs.items() if val is None]
    if missing:
        return RatioValue(
            value=None,
            computable=False,
            reason=f"missing required inputs for Altman Z: {', '.join(missing)}",
        )
    if total_assets == 0 or total_liabilities == 0:
        return RatioValue(
            value=None,
            computable=False,
            reason="total_assets and/or total_liabilities is zero — Z-score undefined",
        )

    z = (
        6.56 * (working_capital / total_assets)
        + 3.26 * (retained_earnings / total_assets)
        + 6.72 * (ebit / total_assets)
        + 1.05 * (total_assets - total_liabilities) / total_liabilities
        + 1.0 * (turnover / total_assets)
    )
    return RatioValue(value=round(z, 2), computable=True, reason=None)
