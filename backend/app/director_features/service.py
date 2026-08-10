"""Public entrypoint for the director_features module.

`build_features` is what `scoring` and the pipeline import. Real
implementation wires app.director_features.graph +
app.director_features.red_flags together; the signature stays the same.
"""

from __future__ import annotations

from app.contracts import ApplicantProfile, DirectorFeatureSet, RedFlag
from app.utils.mock_loader import load_mock_model, load_mock_model_list, resolve_scenario


def build_features(profile: ApplicantProfile) -> tuple[DirectorFeatureSet, list[RedFlag]]:
    """Build governance features and red flags for `profile`.

    Real implementation (Person 3, TODO):
      1. `graph = app.director_features.graph.build_director_graph(profile)`
      2. Derive `DirectorFeatureSet` (per-officer + aggregates) from `graph`.
      3. Run every `app.director_features.red_flags.detect_*` over
         `profile`/`graph` and concatenate the results.

    Mock implementation (current): loads
    `mocks/<scenario>/director_feature_set.json` and
    `mocks/<scenario>/red_flags.json` for the scenario resolved from
    `profile.company_number`.
    """
    scenario = resolve_scenario(profile.company_number)
    features = load_mock_model(scenario, "director_feature_set.json", DirectorFeatureSet)
    flags = load_mock_model_list(scenario, "red_flags.json", RedFlag)
    return features, flags
