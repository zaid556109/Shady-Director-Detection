/**
 * Hand-written mirror of contracts/src/contracts/*.py — see
 * contracts/README.md for why these are hand-written rather than generated,
 * and contracts/schemas/*.schema.json for the generated JSON Schema these
 * should stay in sync with.
 *
 * Keep field names/shapes identical to the Pydantic models. Update this
 * file in the same PR as any contracts/ change (see CONTRIBUTING.md).
 */

export type CompanyStatus =
  | "active"
  | "dissolved"
  | "liquidation"
  | "receivership"
  | "administration"
  | "voluntary-arrangement"
  | "other";

export type SourceFormat = "ixbrl" | "pdf_scanned" | "missing";
export type Severity = "info" | "warning" | "critical";
export type RedFlagCategory = "governance" | "financial" | "filing";
export type JobStatus = "pending" | "running" | "completed" | "failed";
export type PipelineStage = "ingestion" | "financials" | "director_features" | "scoring" | "done";

export interface Address {
  premises: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
}

export interface RatioValue {
  value: number | null;
  computable: boolean;
  reason: string | null;
}

export interface OfficerSummary {
  officer_id: string;
  name: string;
  role: string;
  appointed_on: string | null;
  resigned_on: string | null;
  nationality: string | null;
  occupation: string | null;
}

export interface ApplicantProfile {
  company_number: string;
  company_name: string;
  status: CompanyStatus;
  incorporation_date: string | null;
  sic_codes: string[];
  registered_address: Address;
  officers: OfficerSummary[];
  accounts_overdue: boolean;
  data_completeness: number;
}

export interface RatioSet {
  company_number: string;
  filing_year: number;
  current_ratio: RatioValue;
  gearing: RatioValue;
  net_assets: RatioValue;
  altman_z: RatioValue;
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

export interface JobError {
  stage: PipelineStage;
  message: string;
  retryable: boolean;
}

export interface AssessmentJob {
  job_id: string;
  company_number: string;
  status: JobStatus;
  stage: PipelineStage | null;
  error: JobError | null;
  created_at: string;
  updated_at: string;
}
