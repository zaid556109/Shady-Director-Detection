"""Public entrypoint for the scoring module.

`score` is the last step of the pipeline and what both API responses and
the frontend Report page render. Real implementation wires
app.scoring.scorecard + app.scoring.explain together; the signature stays
the same.
"""

from __future__ import annotations

from app.contracts import DirectorFeatureSet, RatioSet, RedFlag, ScoreBreakdown
from app.utils.mock_loader import load_mock_model, resolve_scenario


def score(ratios: RatioSet, features: DirectorFeatureSet, flags: list[RedFlag]) -> ScoreBreakdown:
    """Combine ratios, director features, and red flags into a ScoreBreakdown.

    Real implementation (Person 4, TODO):
      1. `subscores = app.scoring.scorecard.compute_cluster_subscores(...)`
      2. `contributions = app.scoring.scorecard.compute_feature_contributions(...)`
      3. `total = round(weighted combination of subscores)`
      4. `explanation = app.scoring.explain.generate_explanation(...)`

    Mock implementation (current): loads
    `mocks/<scenario>/score_breakdown.json` for the scenario resolved from
    `ratios.company_number` (ratios and features always share a
    company_number within one pipeline run).
    """
    scenario = resolve_scenario(ratios.company_number)
    return load_mock_model(scenario, "score_breakdown.json", ScoreBreakdown)
