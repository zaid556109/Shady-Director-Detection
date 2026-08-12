"""Human-readable explanation generation for a ScoreBreakdown.

Kept separate from scorecard.py because "compute the number" and "describe
the number in a sentence" are different skills/iteration loops — the
explanation can be reworded without touching the math, and vice versa.
"""

from __future__ import annotations

from app.contracts import ClusterSubscores, FeatureContribution, RedFlag, Severity

FEATURE_PHRASES: dict[str, str] = {
    "current_ratio": "a strong current ratio",
    "gearing": "manageable gearing",
    "net_assets": "healthy net assets",
    "altman_z": "a solid Altman Z-score",
    "disqualification_flag": "no active director disqualifications",
    "dissolved_company_count": "a clean history of prior company dissolutions",
    "shared_address_cluster_size": "no unusual shared-address clustering",
}

FEATURE_PHRASES_NEGATIVE: dict[str, str] = {
    "current_ratio": "a weak current ratio",
    "gearing": "high gearing",
    "net_assets": "poor net assets",
    "altman_z": "a low Altman Z-score",
    "disqualification_flag": "an active director disqualification",
    "dissolved_company_count": "directors linked to previously dissolved companies",
    "shared_address_cluster_size": "unusual shared-address clustering",
}

_SEVERITY_ORDER = {Severity.CRITICAL: 2, Severity.WARNING: 1, Severity.INFO: 0}


def _top_positive(
    contributions: list[FeatureContribution], n: int = 2
) -> list[FeatureContribution]:
    ranked = sorted(
        contributions, key=lambda c: c.points / c.weight if c.weight else 0, reverse=True
    )
    return [c for c in ranked if c.weight and (c.points / c.weight) >= 60][:n]


def _top_negative(
    contributions: list[FeatureContribution], n: int = 2
) -> list[FeatureContribution]:
    ranked = sorted(contributions, key=lambda c: c.points / c.weight if c.weight else 0)
    return [c for c in ranked if c.weight and (c.points / c.weight) < 40][:n]


def _top_flag(flags: list[RedFlag]) -> RedFlag | None:
    if not flags:
        return None
    return sorted(flags, key=lambda f: _SEVERITY_ORDER.get(f.severity, 0), reverse=True)[0]


def generate_explanation(
    total: int,
    cluster_subscores: ClusterSubscores,
    contributions: list[FeatureContribution],
    flags: list[RedFlag],
) -> str:
    """Produce a short (1-2 sentence) human-readable summary of the score."""
    positives = _top_positive(contributions)
    negatives = _top_negative(contributions)
    flag = _top_flag(flags)

    pos_phrases = [FEATURE_PHRASES[c.feature_name] for c in positives]
    neg_phrases = [FEATURE_PHRASES_NEGATIVE[c.feature_name] for c in negatives]

    if flag is not None and flag.severity in (Severity.CRITICAL, Severity.WARNING):
        neg_phrases = [flag.human_label[0].lower() + flag.human_label[1:]] + neg_phrases

    if pos_phrases and neg_phrases:
        return (
            f"{', '.join(pos_phrases).capitalize()} support the score, "
            f"offset by {', '.join(neg_phrases[:2])}."
        )
    if pos_phrases and not neg_phrases:
        return f"{', '.join(pos_phrases).capitalize()} support a high reliability score."
    if neg_phrases and not pos_phrases:
        return f"{', '.join(neg_phrases[:2]).capitalize()} drive a low reliability score."
    return "Financial and governance signals are mixed, resulting in a moderate reliability score."
