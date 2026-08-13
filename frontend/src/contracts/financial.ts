/**
 * TypeScript mirror of contracts/src/contracts/financial_extract.py and
 * contracts/src/contracts/ratio_set.py, plus the RatioValue/SourceFormat
 * value types from contracts/src/contracts/common.py that they use.
 *
 * Keep field names/shapes identical to the Pydantic models. Update this
 * file in the same PR as any contracts/ change (see CONTRIBUTING.md).
 */

export type SourceFormat = "ixbrl" | "pdf_scanned" | "missing";

export interface RatioValue {
  value: number | null;
  computable: boolean;
  reason: string | null;
}

export interface BalanceSheetItems {
  fixed_assets: number | null;
  current_assets: number | null;
  cash: number | null;
  current_liabilities: number | null;
  long_term_liabilities: number | null;
  net_assets: number | null;
  shareholder_funds: number | null;
}

export interface ProfitAndLossItems {
  turnover: number | null;
  gross_profit: number | null;
  operating_profit: number | null;
  profit_before_tax: number | null;
  profit_after_tax: number | null;
}

export interface FinancialExtract {
  company_number: string;
  filing_year: number;
  period_start: string | null;
  period_end: string | null;
  currency: string;
  source_format: SourceFormat;
  extraction_confidence: number;
  balance_sheet: BalanceSheetItems;
  profit_and_loss: ProfitAndLossItems;
}

export interface YoyTrend {
  metric: string;
  direction: string;
  delta_pct: number | null;
}

export interface RatioSet {
  company_number: string;
  filing_year: number;
  current_ratio: RatioValue;
  gearing: RatioValue;
  net_assets: RatioValue;
  altman_z: RatioValue;
  yoy_trends: YoyTrend[];
}
