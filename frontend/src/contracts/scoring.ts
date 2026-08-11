/**
 * TypeScript mirror of contracts/src/contracts/score_breakdown.py.
 *
 * Keep field names/shapes identical to the Pydantic model. Update this
 * file in the same PR as any contracts/ change (see CONTRIBUTING.md).
 */

import type { RedFlag } from "./director-features";

export interface FeatureContribution {
  feature_name: string;
  weight: number;
  points: number;
}

export interface ClusterSubscores {
  governance: number;
  financial: number;
}

export interface ScoreBreakdown {
  company_number: string;
  total: number;
  cluster_subscores: ClusterSubscores;
  feature_contributions: FeatureContribution[];
  flags: RedFlag[];
  explanation: string;
  generated_at: string;
}
