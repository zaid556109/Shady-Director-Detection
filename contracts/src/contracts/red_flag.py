"""RedFlag — a single, traceable governance or financial concern surfaced
during feature building.

Produced alongside `DirectorFeatureSet` by `director_features.build_features()`
(and, in principle, could be raised by `financials` too — category exists for
that reason). Every flag must cite `evidence` back to a specific filing or
officer record: a flag nobody can trace to source data isn't trustworthy
enough to dock a company's score for.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field

from contracts.common import EvidenceRef, RedFlagCategory, Severity


class RedFlag(BaseModel):
    """A single explainable red flag with traceable evidence."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "id": "dissolved-companies-2",
                "severity": "warning",
                "category": "governance",
                "evidence": [
                    {
                        "source_type": "officer",
                        "source_id": "abc123def456ghi789",
                        "detail": "2 dissolved companies in the last 5 years",
                    }
                ],
                "human_label": "A director has 2 previously dissolved companies",
            }
        }
    )

    id: str = Field(description="Stable slug, unique within one assessment (not globally).")
    severity: Severity
    category: RedFlagCategory
    evidence: list[EvidenceRef] = Field(default_factory=list, description="At least one item in production; empty only in placeholder mocks.")
    human_label: str = Field(description="Short, UI-ready description of the flag.")
