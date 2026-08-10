"""Financials — iXBRL parsing and ratio calculation (Cluster B).

Owner: Person 2. Public contract: `extract_financials`, `compute_ratios`.
"""

from app.financials.service import compute_ratios, extract_financials

__all__ = ["compute_ratios", "extract_financials"]
