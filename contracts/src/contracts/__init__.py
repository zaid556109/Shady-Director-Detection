"""CounterpartyCheck data contracts — Pydantic v2 models shared by every
backend module and used as the source for generated JSON Schema /
TypeScript types.

See contracts/README.md for the versioning and change-approval process.
"""

from contracts.applicant_profile import ApplicantProfile, OfficerSummary
from contracts.assessment_job import AssessmentJob, JobError
from contracts.common import (
    Address,
    CompanyStatus,
    EvidenceRef,
    FilingHistorySummary,
    JobStatus,
    PipelineStage,
    RatioValue,
    RedFlagCategory,
    Severity,
    SourceFormat,
)
from contracts.director_feature_set import CompanyDirectorAggregates, DirectorFeatureSet, OfficerFeatures
from contracts.financial_extract import BalanceSheetItems, FinancialExtract, ProfitAndLossItems
from contracts.ratio_set import RatioSet, YoyTrend
from contracts.red_flag import RedFlag
from contracts.score_breakdown import ClusterSubscores, FeatureContribution, ScoreBreakdown

__version__ = "0.1.0"

__all__ = [
    "Address",
    "ApplicantProfile",
    "AssessmentJob",
    "BalanceSheetItems",
    "ClusterSubscores",
    "CompanyDirectorAggregates",
    "CompanyStatus",
    "DirectorFeatureSet",
    "EvidenceRef",
    "FeatureContribution",
    "FilingHistorySummary",
    "FinancialExtract",
    "JobError",
    "JobStatus",
    "OfficerFeatures",
    "OfficerSummary",
    "PipelineStage",
    "ProfitAndLossItems",
    "RatioSet",
    "RatioValue",
    "RedFlag",
    "RedFlagCategory",
    "ScoreBreakdown",
    "Severity",
    "SourceFormat",
    "YoyTrend",
    "__version__",
]
