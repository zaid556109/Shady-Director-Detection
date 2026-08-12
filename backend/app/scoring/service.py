"""Public entrypoint for the scoring module.

`score` is the last step of the pipeline and what both API responses and
the frontend Report page render.
"""

from __future__ import annotations

from datetime import UTC, datetime

from app.contracts import DirectorFeatureSet, RatioSet, RedFlag, ScoreBreakdown
from app.scoring import explain, scorecard


def score(ratios: RatioSet, features: DirectorFeatureSet, flags: list[RedFlag]) -> ScoreBreakdown:
    """Combine ratios, director features, and red flags into a ScoreBreakdown."""
    subscores = scorecard.compute_cluster_subscores(ratios, features, flags)
    contributions = scorecard.compute_feature_contributions(ratios, features, flags)

    total = round(sum(c.points for c in contributions))
    total = max(0, min(100, total))

    explanation = explain.generate_explanation(total, subscores, contributions, flags)

    return ScoreBreakdown(
        company_number=ratios.company_number,
        total=total,
        cluster_subscores=subscores,
        feature_contributions=contributions,
        flags=flags,
        explanation=explanation,
        generated_at=datetime.now(UTC),
    )
