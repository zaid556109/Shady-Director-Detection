# Changelog

All notable changes to `contracts/` are recorded here. Versioning:

- **minor** bump — additive, backward-compatible (new optional field, new
  model)
- **major** bump — breaking (renamed/removed field, changed type, new
  required field); the entry below must say who needs to update their
  module

See `CONTRIBUTING.md` for the required approval process.

## 0.1.0 — 2026-08-10

Initial scaffold commit. Defines the 7 core contracts and shared value
types:

- `ApplicantProfile` (+ `OfficerSummary`)
- `FinancialExtract` (+ `BalanceSheetItems`, `ProfitAndLossItems`)
- `RatioSet` (+ `YoyTrend`)
- `DirectorFeatureSet` (+ `OfficerFeatures`, `CompanyDirectorAggregates`)
- `RedFlag`
- `ScoreBreakdown` (+ `FeatureContribution`, `ClusterSubscores`)
- `AssessmentJob` (+ `JobError`)
- Shared: `Address`, `RatioValue`, `EvidenceRef`, `FilingHistorySummary`,
  `CompanyStatus`, `SourceFormat`, `Severity`, `RedFlagCategory`,
  `JobStatus`, `PipelineStage`

No prior version to migrate from — this is commit 1.
