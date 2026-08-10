"""ScoreBreakdown — the final, explainable output of the pipeline.

Produced by `scoring.score(ratios, features, flags) -> ScoreBreakdown`. This
is what both API response bodies (`GET /report/{company_number}`) and the
frontend Report page render directly, so `explanation` and
`feature_contributions` are meant to be human-readable as-is, not just
machine-readable weights.
"""

from __future__ import annotations

from datetime import datetime

from pydantic import BaseModel, ConfigDict, Field

from contracts.red_flag import RedFlag


class FeatureContribution(BaseModel):
    """How much one feature moved the total score, in either direction."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {"feature_name": "current_ratio", "weight": 0.15, "points": 12.0}
        }
    )

    feature_name: str
    weight: float = Field(description="Configured weight for this feature, 0-1.")
    points: float = Field(description="Signed points contributed to the 0-100 total (can be negative).")


class ClusterSubscores(BaseModel):
    """The two feature clusters' contribution to the total, each 0-100
    before weighting — kept separate so the UI can show two panels."""

    model_config = ConfigDict(json_schema_extra={"example": {"governance": 82.0, "financial": 74.0}})

    governance: float = Field(ge=0, le=100)
    financial: float = Field(ge=0, le=100)


class ScoreBreakdown(BaseModel):
    """Final 0-100 reliability score plus a full explainable breakdown."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "company_number": "01234567",
                "total": 78,
                "cluster_subscores": {"governance": 82.0, "financial": 74.0},
                "feature_contributions": [
                    {"feature_name": "current_ratio", "weight": 0.15, "points": 12.0},
                    {"feature_name": "disqualification_flag", "weight": 0.25, "points": 0.0},
                ],
                "flags": [],
                "explanation": "Strong current ratio and clean director history offset moderate gearing.",
                "generated_at": "2026-08-10T12:00:00Z",
            }
        }
    )

    company_number: str
    total: int = Field(ge=0, le=100)
    cluster_subscores: ClusterSubscores
    feature_contributions: list[FeatureContribution] = Field(default_factory=list)
    flags: list[RedFlag] = Field(default_factory=list)
    explanation: str = Field(description="Short human-readable summary of the total score.")
    generated_at: datetime
