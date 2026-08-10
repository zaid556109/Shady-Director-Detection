"""DirectorFeatureSet — governance features derived from the director/company
graph.

Produced by `director_features.build_features(profile) -> (DirectorFeatureSet,
list[RedFlag])`. Per-officer features live in `OfficerFeatures`; the
company-level aggregates are what `scoring.score()` mostly consumes directly,
while per-officer detail feeds the UI's director panel and RedFlag evidence.
"""

from __future__ import annotations

from pydantic import BaseModel, ConfigDict, Field


class OfficerFeatures(BaseModel):
    """Governance features for a single officer, aggregated across every
    company they've ever been appointed to (not just this one) — that
    cross-company view is the entire point of building a director graph
    instead of reading one company's officer list in isolation.
    """

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "officer_id": "abc123def456ghi789",
                "appointments_count": 3,
                "dissolved_company_count": 0,
                "disqualification_flag": False,
                "avg_tenure_days": 1460.0,
                "shared_address_cluster_size": 1,
            }
        }
    )

    officer_id: str
    appointments_count: int = Field(ge=0, description="Total companies (any status) this officer is/was appointed to.")
    dissolved_company_count: int = Field(ge=0, description="Of those, how many are now dissolved/liquidated.")
    disqualification_flag: bool = Field(description="True if this officer has an active/past disqualification.")
    avg_tenure_days: float | None = Field(default=None, ge=0, description="Mean days between appointed_on/resigned_on across appointments.")
    shared_address_cluster_size: int = Field(
        ge=1,
        description=(
            "Number of distinct companies registered at the same address as this "
            "officer's correspondence address (1 = no sharing detected)."
        ),
    )


class CompanyDirectorAggregates(BaseModel):
    """Company-level roll-up across all of `ApplicantProfile.officers`."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "officer_count": 2,
                "max_dissolved_company_count": 0,
                "any_disqualified": False,
                "max_shared_address_cluster_size": 1,
                "min_avg_tenure_days": 900.0,
            }
        }
    )

    officer_count: int = Field(ge=0)
    max_dissolved_company_count: int = Field(ge=0, description="Worst dissolved-company count across all officers.")
    any_disqualified: bool
    max_shared_address_cluster_size: int = Field(ge=1)
    min_avg_tenure_days: float | None = Field(default=None, ge=0)


class DirectorFeatureSet(BaseModel):
    """Governance feature set for one company: per-officer detail plus
    company-level aggregates."""

    model_config = ConfigDict(
        json_schema_extra={
            "example": {
                "company_number": "01234567",
                "officers": [
                    {
                        "officer_id": "abc123def456ghi789",
                        "appointments_count": 3,
                        "dissolved_company_count": 0,
                        "disqualification_flag": False,
                        "avg_tenure_days": 1460.0,
                        "shared_address_cluster_size": 1,
                    }
                ],
                "aggregates": {
                    "officer_count": 2,
                    "max_dissolved_company_count": 0,
                    "any_disqualified": False,
                    "max_shared_address_cluster_size": 1,
                    "min_avg_tenure_days": 900.0,
                },
            }
        }
    )

    company_number: str
    officers: list[OfficerFeatures] = Field(default_factory=list)
    aggregates: CompanyDirectorAggregates
