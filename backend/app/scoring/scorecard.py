"""Scorecard: feature weights and point-contribution formulas.

A scorecard (in the credit-risk sense) is a fixed list of (feature, weight)
pairs, each contributing signed points toward the 0-100 total. Keeping
weights in one place (`FEATURE_WEIGHTS`) rather than scattered through
scoring logic is what makes the score auditable/tunable without touching
the calculation code.
"""

from __future__ import annotations

from app.contracts import (
    ClusterSubscores,
    DirectorFeatureSet,
    FeatureContribution,
    RatioSet,
    RedFlag,
)

FEATURE_WEIGHTS: dict[str, float] = {
    "current_ratio": 0.15,
    "gearing": 0.15,
    "net_assets": 0.10,
    "altman_z": 0.10,
    "disqualification_flag": 0.25,
    "dissolved_company_count": 0.15,
    "shared_address_cluster_size": 0.10,
}

FINANCIAL_KEYS = {"current_ratio", "gearing", "net_assets", "altman_z"}
GOVERNANCE_KEYS = {
    "disqualification_flag",
    "dissolved_company_count",
    "shared_address_cluster_size",
}

# Used when a ratio isn't computable — don't punish sparse accounts.
NEUTRAL_SCORE = 50.0


def _clamp(value: float, low: float = 0.0, high: float = 100.0) -> float:
    return max(low, min(high, value))


def _score_current_ratio(ratios: RatioSet) -> float:
    rv = ratios.current_ratio
    if not rv.computable or rv.value is None:
        return NEUTRAL_SCORE
    return _clamp((rv.value / 2.0) * 100)


def _score_gearing(ratios: RatioSet) -> float:
    rv = ratios.gearing
    if not rv.computable or rv.value is None:
        return NEUTRAL_SCORE
    if rv.value <= 0:
        return 100.0
    return _clamp(100 - (rv.value / 2.0) * 100)


def _score_net_assets(ratios: RatioSet) -> float:
    rv = ratios.net_assets
    if not rv.computable or rv.value is None:
        return NEUTRAL_SCORE
    if rv.value < 0:
        return 0.0
    return _clamp(40 + (rv.value / 100_000.0) * 60, low=40.0)


def _score_altman_z(ratios: RatioSet) -> float:
    rv = ratios.altman_z
    if not rv.computable or rv.value is None:
        return NEUTRAL_SCORE
    if rv.value >= 3.0:
        return 100.0
    if rv.value <= 1.8:
        return 0.0
    return _clamp((rv.value - 1.8) / (3.0 - 1.8) * 100)


def _score_disqualification(features: DirectorFeatureSet) -> float:
    return 0.0 if features.aggregates.any_disqualified else 100.0


def _score_dissolved_companies(features: DirectorFeatureSet) -> float:
    count = features.aggregates.max_dissolved_company_count
    return _clamp(100 - count * 30)


def _score_shared_address(features: DirectorFeatureSet) -> float:
    size = features.aggregates.max_shared_address_cluster_size
    return _clamp(100 - (size - 1) * 20)


def _normalized_scores(
    ratios: RatioSet, features: DirectorFeatureSet
) -> dict[str, float]:
    return {
        "current_ratio": _score_current_ratio(ratios),
        "gearing": _score_gearing(ratios),
        "net_assets": _score_net_assets(ratios),
        "altman_z": _score_altman_z(ratios),
        "disqualification_flag": _score_disqualification(features),
        "dissolved_company_count": _score_dissolved_companies(features),
        "shared_address_cluster_size": _score_shared_address(features),
    }


def compute_cluster_subscores(
    ratios: RatioSet, features: DirectorFeatureSet, flags: list[RedFlag]
) -> ClusterSubscores:
    """Compute the two 0-100 cluster subscores."""
    normalized = _normalized_scores(ratios, features)

    financial_weight_total = sum(FEATURE_WEIGHTS[k] for k in FINANCIAL_KEYS)
    governance_weight_total = sum(FEATURE_WEIGHTS[k] for k in GOVERNANCE_KEYS)

    financial_subscore = sum(
        (FEATURE_WEIGHTS[k] / financial_weight_total) * normalized[k]
        for k in FINANCIAL_KEYS
    )
    governance_subscore = sum(
        (FEATURE_WEIGHTS[k] / governance_weight_total) * normalized[k]
        for k in GOVERNANCE_KEYS
    )

    return ClusterSubscores(
        governance=round(governance_subscore, 1),
        financial=round(financial_subscore, 1),
    )


def compute_feature_contributions(
    ratios: RatioSet, features: DirectorFeatureSet, flags: list[RedFlag]
) -> list[FeatureContribution]:
    """Compute signed point contributions for every feature in FEATURE_WEIGHTS."""
    normalized = _normalized_scores(ratios, features)

    return [
        FeatureContribution(
            feature_name=name,
            weight=weight,
            points=round(weight * normalized[name], 1),
        )
        for name, weight in FEATURE_WEIGHTS.items()
    ]
