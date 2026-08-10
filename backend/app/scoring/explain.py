"""Human-readable explanation generation for a ScoreBreakdown.

Kept separate from scorecard.py because "compute the number" and "describe
the number in a sentence" are different skills/iteration loops — the
explanation can be reworded without touching the math, and vice versa.
"""

from __future__ import annotations

from app.contracts import ClusterSubscores, FeatureContribution, RedFlag


def generate_explanation(total: int, cluster_subscores: ClusterSubscores, contributions: list[FeatureContribution], flags: list[RedFlag]) -> str:
    """Produce a short (1-2 sentence) human-readable summary of the score.

    Real implementation (Person 4, TODO): template off the top 1-2 positive
    and top 1-2 negative FeatureContributions, and mention the highest-
    severity flag if any critical/warning flags exist. Should read like the
    `ScoreBreakdown.explanation` examples in contracts/schemas/score_breakdown.schema.json.
    """
    raise NotImplementedError("generate_explanation. Owner: Person 4.")
