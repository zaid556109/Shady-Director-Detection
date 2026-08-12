/**
 * Mirrors backend/app/utils/mock_loader.py's scenario resolution, so the
 * frontend renders real-looking data before the backend exists. Kept in
 * sync manually via `make sync-mocks` — see contracts/README.md.
 */

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

const MOCK_FEATURES: Record<string, any> = {
  "01234567": healthyFeature,
  "07654321": riskyFeature,
  "09999999": sparseFeature,
};

const MOCK_PROFILES: Record<string, any> = {
  "01234567": healthyProfile,
  "07654321": riskyProfile,
  "09999999": sparseProfile,
};

const DEFAULT_SCENARIO = sparseScore as ScoreBreakdown;

export function mockScoreBreakdown(companyNumber: string): ScoreBreakdown {
  return MOCK_COMPANY_NUMBERS[companyNumber] ?? DEFAULT_SCENARIO;
}

export function mockDirectorFeatureSet(companyNumber: string): any {
  return MOCK_FEATURES[companyNumber] ?? sparseFeature;
}

export function mockApplicantProfile(companyNumber: string): any {
  return MOCK_PROFILES[companyNumber] ?? sparseProfile;
}

