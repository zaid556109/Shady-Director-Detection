/**
 * Mirrors backend/app/utils/mock_loader.py's scenario resolution, so the
 * frontend renders real-looking data before the backend exists. Kept in
 * sync manually via `make sync-mocks` — see contracts/README.md.
 */

import type { ApplicantProfile } from "../contracts/applicant";
import type { DirectorFeatureSet } from "../contracts/director-features";
import type { ScoreBreakdown } from "../contracts/scoring";

import healthyScore from "./healthy_plc/score_breakdown.json";
import riskyScore from "./risky_sme/score_breakdown.json";
import sparseScore from "./sparse_micro/score_breakdown.json";

import healthyFeature from "./healthy_plc/director_feature_set.json";
import riskyFeature from "./risky_sme/director_feature_set.json";
import sparseFeature from "./sparse_micro/director_feature_set.json";

import healthyProfile from "./healthy_plc/applicant_profile.json";
import riskyProfile from "./risky_sme/applicant_profile.json";
import sparseProfile from "./sparse_micro/applicant_profile.json";

const MOCK_COMPANY_NUMBERS: Record<string, ScoreBreakdown> = {
  "01234567": healthyScore as ScoreBreakdown,
  "07654321": riskyScore as ScoreBreakdown,
  "09999999": sparseScore as ScoreBreakdown,
};

const MOCK_FEATURES: Record<string, DirectorFeatureSet> = {
  "01234567": healthyFeature as unknown as DirectorFeatureSet,
  "07654321": riskyFeature as unknown as DirectorFeatureSet,
  "09999999": sparseFeature as unknown as DirectorFeatureSet,
};

const MOCK_PROFILES: Record<string, ApplicantProfile> = {
  "01234567": healthyProfile as unknown as ApplicantProfile,
  "07654321": riskyProfile as unknown as ApplicantProfile,
  "09999999": sparseProfile as unknown as ApplicantProfile,
};

const DEFAULT_SCENARIO = sparseScore as ScoreBreakdown;

export function mockScoreBreakdown(companyNumber: string): ScoreBreakdown {
  return MOCK_COMPANY_NUMBERS[companyNumber] ?? DEFAULT_SCENARIO;
}

export function mockDirectorFeatureSet(companyNumber: string): DirectorFeatureSet {
  return MOCK_FEATURES[companyNumber] ?? (sparseFeature as unknown as DirectorFeatureSet);
}

export function mockApplicantProfile(companyNumber: string): ApplicantProfile {
  return MOCK_PROFILES[companyNumber] ?? (sparseProfile as unknown as ApplicantProfile);
}


