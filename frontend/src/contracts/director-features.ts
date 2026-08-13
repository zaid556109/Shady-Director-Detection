/**
 * TypeScript mirror of contracts/src/contracts/director_feature_set.py and
 * contracts/src/contracts/red_flag.py, plus the EvidenceRef/Severity/
 * RedFlagCategory value types from contracts/src/contracts/common.py that
 * red_flag.py uses.
 *
 * Keep field names/shapes identical to the Pydantic models. Update this
 * file in the same PR as any contracts/ change (see CONTRIBUTING.md).
 */

export type Severity = "info" | "warning" | "critical";
export type RedFlagCategory = "governance" | "financial" | "filing";

export interface OfficerFeatures {
  officer_id: string;
  appointments_count: number;
  dissolved_company_count: number;
  disqualification_flag: boolean;
  avg_tenure_days: number | null;
  shared_address_cluster_size: number;
}

export interface CompanyDirectorAggregates {
  officer_count: number;
  max_dissolved_company_count: number;
  any_disqualified: boolean;
  max_shared_address_cluster_size: number;
  min_avg_tenure_days: number | null;
}

export interface DirectorFeatureSet {
  company_number: string;
  officers: OfficerFeatures[];
  aggregates: CompanyDirectorAggregates;
}

export interface EvidenceRef {
  source_type: string;
  source_id: string;
  detail: string | null;
}

export interface RedFlag {
  id: string;
  severity: Severity;
  category: RedFlagCategory;
  evidence: EvidenceRef[];
  human_label: string;
}
