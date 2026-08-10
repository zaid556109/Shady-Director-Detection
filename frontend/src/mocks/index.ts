/**
 * Mirrors backend/app/utils/mock_loader.py's scenario resolution, so the
 * frontend renders real-looking data before the backend exists. Kept in
 * sync manually via `make sync-mocks` — see contracts/README.md.
 */

import type { ScoreBreakdown } from "../api/types";

import healthyScore from "./healthy_plc/score_breakdown.json";
import riskyScore from "./risky_sme/score_breakdown.json";
import sparseScore from "./sparse_micro/score_breakdown.json";

const MOCK_COMPANY_NUMBERS: Record<string, ScoreBreakdown> = {
  "01234567": healthyScore as ScoreBreakdown,
  "07654321": riskyScore as ScoreBreakdown,
  "09999999": sparseScore as ScoreBreakdown,
};

const DEFAULT_SCENARIO = sparseScore as ScoreBreakdown;

export function mockScoreBreakdown(companyNumber: string): ScoreBreakdown {
  return MOCK_COMPANY_NUMBERS[companyNumber] ?? DEFAULT_SCENARIO;
}
