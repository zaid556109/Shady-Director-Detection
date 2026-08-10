"""Scorecard: feature weights and point-contribution formulas.

A scorecard (in the credit-risk sense) is a fixed list of (feature, weight)
pairs, each contributing signed points toward the 0-100 total. Keeping
weights in one place (`FEATURE_WEIGHTS`) rather than scattered through
scoring logic is what makes the score auditable/tunable without touching
the calculation code.
"""

from __future__ import annotations

from app.contracts import ClusterSubscores, DirectorFeatureSet, FeatureContribution, RatioSet, RedFlag

# Placeholder weights — Person 4 owns tuning these. Governance + financial
# weights should sum to 1.0 across both clusters.
FEATURE_WEIGHTS: dict[str, float] = {
    "current_ratio": 0.15,
    "gearing": 0.15,
    "net_assets": 0.10,
    "altman_z": 0.10,
    "disqualification_flag": 0.25,
    "dissolved_company_count": 0.15,
    "shared_address_cluster_size": 0.10,
}


def compute_cluster_subscores(ratios: RatioSet, features: DirectorFeatureSet, flags: list[RedFlag]) -> ClusterSubscores:
    """Compute the two 0-100 cluster subscores.

    Real implementation (Person 4, TODO): normalize each ratio/feature into
    a 0-100 partial score (e.g. current_ratio >= 2.0 -> 100, scaling down
    below that) and combine per-cluster using FEATURE_WEIGHTS renormalized
    within the cluster.
    """
    raise NotImplementedError("compute_cluster_subscores. Owner: Person 4.")


def compute_feature_contributions(ratios: RatioSet, features: DirectorFeatureSet, flags: list[RedFlag]) -> list[FeatureContribution]:
    """Compute signed point contributions for every feature in FEATURE_WEIGHTS.

    Real implementation (Person 4, TODO): one FeatureContribution per key in
    FEATURE_WEIGHTS; points = weight * (normalized feature value scaled to
    the 0-100 total). This is what the UI renders as the score's "why".
    """
    raise NotImplementedError("compute_feature_contributions. Owner: Person 4.")
