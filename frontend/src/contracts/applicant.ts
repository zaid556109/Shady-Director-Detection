/**
 * TypeScript mirror of contracts/src/contracts/applicant_profile.py, plus
 * the Address/FilingHistorySummary/CompanyStatus value types from
 * contracts/src/contracts/common.py that it uses.
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

export interface Address {
  premises: string | null;
  address_line_1: string | null;
  address_line_2: string | null;
  locality: string | null;
  region: string | null;
  postal_code: string | null;
  country: string;
}

export interface FilingHistorySummary {
  last_accounts_made_up_to: string | null;
  next_accounts_due_on: string | null;
  last_confirmation_statement_date: string | null;
  total_filings: number;
  late_filings_count: number;
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
  filing_history: FilingHistorySummary;
  accounts_overdue: boolean;
  data_completeness: number;
}
