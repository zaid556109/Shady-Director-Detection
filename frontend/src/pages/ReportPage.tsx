import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import DirectorGraphVisualizer from "../components/DirectorGraphVisualizer";
import {
  mockApplicantProfile,
  mockDirectorFeatureSet,
  mockFinancialExtracts,
  mockRatioSet,
  mockScoreBreakdown,
} from "../mocks";

function scoreTier(total: number): "good" | "warn" | "bad" {
  if (total >= 70) return "good";
  if (total >= 40) return "warn";
  return "bad";
}

const TIER_COLOR: Record<"good" | "warn" | "bad", string> = {
  good: "var(--color-good)",
  warn: "var(--color-warn)",
  bad: "var(--color-bad)",
};

const FEATURE_HUMAN_NAMES: Record<string, { label: string; description: string }> = {
  dissolved_company_count: {
    label: "Dissolved Company History",
    description: "Evaluates historical company dissolutions across active directors",
  },
  disqualification_flag: {
    label: "Director Disqualification Status",
    description: "Evaluates officer disqualification records from Companies House register",
  },
  shared_address_cluster_size: {
    label: "Registered Address Density",
    description: "Number of distinct companies registered at the exact same office address",
  },
  current_ratio: {
    label: "Current Ratio Liquidity",
    description: "Ability to cover short-term obligations from current liquid assets",
  },
  gearing: {
    label: "Gearing / Financial Leverage",
    description: "Proportion of net debt relative to total equity capital",
  },
  net_assets: {
    label: "Net Assets / Equity Balance",
    description: "Total assets remaining after deducting all short and long-term liabilities",
  },
  altman_z: {
    label: "Altman Z-Score Solvency",
    description: "Statistical formula predicting corporate bankruptcy/insolvency risk",
  },
};

export default function ReportPage() {
  const { companyNumber = "" } = useParams();
  const breakdown = mockScoreBreakdown(companyNumber);
  const profile = mockApplicantProfile(companyNumber);
  const featureSet = mockDirectorFeatureSet(companyNumber);
  const ratioSet = mockRatioSet(companyNumber);
  const financialExtracts = mockFinancialExtracts(companyNumber);

  const latestExtract = financialExtracts[0] || null;
  const previousExtract = financialExtracts[1] || null;

  const tier = scoreTier(breakdown.total);
  const [expandedFlags, setExpandedFlags] = useState<Record<string, boolean>>({});

  const toggleFlag = (id: string) => {
    setExpandedFlags((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActualRawValue = (featureName: string): string => {
    switch (featureName) {
      case "current_ratio":
        return ratioSet?.current_ratio?.value !== null && ratioSet?.current_ratio?.value !== undefined
          ? `${ratioSet.current_ratio.value.toFixed(2)}x`
          : "N/A (Micro-Entity)";
      case "gearing":
        return ratioSet?.gearing?.value !== null && ratioSet?.gearing?.value !== undefined
          ? `${(ratioSet.gearing.value * 100).toFixed(1)}%`
          : "N/A (Micro-Entity)";
      case "net_assets":
        return ratioSet?.net_assets?.value !== null && ratioSet?.net_assets?.value !== undefined
          ? `£${Math.round(ratioSet.net_assets.value).toLocaleString()}`
          : "N/A";
      case "altman_z":
        return ratioSet?.altman_z?.value !== null && ratioSet?.altman_z?.value !== undefined
          ? `${ratioSet.altman_z.value.toFixed(2)}`
          : "N/A (Micro-Entity)";
      case "disqualification_flag":
        return featureSet?.aggregates?.any_disqualified ? "True (DISQUALIFIED)" : "False (Clean)";
      case "dissolved_company_count":
        return `${featureSet?.aggregates?.max_dissolved_company_count ?? 0} dissolved co.s`;
      case "shared_address_cluster_size":
        return `${featureSet?.aggregates?.max_shared_address_cluster_size ?? 1} co.s at address`;
      default:
        return "N/A";
    }
  };

  const underwriting =
    breakdown.total >= 70
      ? {
          recommendation: "FAST TRACK APPROVAL RECOMMENDED",
          creditLimit: "Up to £250,000 Commercial Line of Credit",
          securityRequirement: "Debenture Floating Charge over Assets + Personal Guarantee",
          dscr: "2.67x (Strong Repayment Coverage)",
          annualCapacity: "£368,000 Net Operating Cash Flow",
          riskRating: "LOW CREDIT RISK (Tier 1)",
          color: "#15803d",
          bg: "#f0fdf4",
          border: "#bbf7d0",
        }
      : breakdown.total >= 40
      ? {
          recommendation: "REFER FOR CREDIT COMMITTEE REVIEW",
          creditLimit: "Up to £50,000 (Requires 100% Tangible Security)",
          securityRequirement: "Fixed Charge on Property + 100% Director Personal Guarantee",
          dscr: "1.15x (Marginal Debt Coverage)",
          annualCapacity: "£45,000 Net Operating Cash Flow",
          riskRating: "MODERATE RISK (Tier 2)",
          color: "#b45309",
          bg: "#fffbeb",
          border: "#fef3c7",
        }
      : {
          recommendation: "DECLINE LOAN APPLICATION",
          creditLimit: "£0 (Facility Rejected)",
          securityRequirement: "N/A — Insolvent / Debt Service Deficit",
          dscr: "0.00x (Negative Debt Coverage)",
          annualCapacity: "-£22,000 Operating Cash Deficit",
          riskRating: "HIGH CREDIT RISK (Tier 3)",
          color: "#b91c1c",
          bg: "#fef2f2",
          border: "#fecaca",
        };

  return (
    <>
      {/* Top Action Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <Link className="back-link" to="/" style={{ margin: 0 }}>
          &larr; Back to Search
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            padding: "0.55rem 1.2rem",
            background: "#0f172a",
            color: "#ffffff",
            border: "none",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 700,
            cursor: "pointer",
            boxShadow: "0 2px 6px rgba(0,0,0,0.15)",
          }}
        >
          🖨️ Export PDF Underwriting Package
        </button>
      </div>

      {/* Main Report Header */}
      <div className="report-header">
        <div>
          <h1>{profile?.company_name || breakdown.company_number}</h1>
          <div className="report-header__sub">
            Company #{breakdown.company_number} | Assessed {new Date(breakdown.generated_at).toLocaleString()} | Data Completeness: {Math.round((profile?.data_completeness ?? 1) * 100)}%
          </div>
        </div>
        <div className={`score-badge score-badge--${tier}`}>
          <span className="score-badge__number">{breakdown.total}</span>
          <span className="score-badge__max">/ 100</span>
        </div>
      </div>

      {/* Credit Underwriting Decision Executive Dashboard */}
      <div
        style={{
          background: underwriting.bg,
          border: `2px solid ${underwriting.border}`,
          borderRadius: "12px",
          padding: "1.2rem 1.5rem",
          marginBottom: "1.5rem",
          boxShadow: "0 4px 14px rgba(0,0,0,0.04)",
        }}
      >
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: "1.2rem", marginBottom: "1rem" }}>
          <div>
            <div style={{ fontSize: "0.75rem", fontWeight: 800, textTransform: "uppercase", letterSpacing: "0.06em", color: underwriting.color }}>
              CREDIT UNDERWRITING RECOMMENDATION & LOAN ELIGIBILITY
            </div>
            <div style={{ fontSize: "1.4rem", fontWeight: 900, color: underwriting.color, marginTop: "3px" }}>
              {underwriting.recommendation}
            </div>
            <div style={{ fontSize: "0.92rem", fontWeight: 700, color: "#0f172a", marginTop: "4px" }}>
              Approved Credit Facility: <strong>{underwriting.creditLimit}</strong> • Rating: <strong style={{ color: underwriting.color }}>{underwriting.riskRating}</strong>
            </div>
          </div>
          <span
            style={{
              background: underwriting.color,
              color: "#ffffff",
              fontWeight: 900,
              fontSize: "1rem",
              padding: "8px 20px",
              borderRadius: "24px",
              letterSpacing: "0.04em",
              boxShadow: "0 3px 10px rgba(0,0,0,0.15)",
            }}
          >
            {breakdown.total} / 100 SCORE
          </span>
        </div>

        {/* Debt Serviceability & Security Grid */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            gap: "1rem",
            paddingTop: "0.85rem",
            borderTop: `1px solid ${underwriting.border}`,
            fontSize: "0.85rem",
          }}
        >
          <div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700 }}>REPAYMENT CAPACITY (DSCR)</span>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{underwriting.dscr}</div>
          </div>
          <div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700 }}>OPERATING CASH FLOW</span>
            <div style={{ fontWeight: 800, fontSize: "0.95rem", color: "#0f172a" }}>{underwriting.annualCapacity}</div>
          </div>
          <div>
            <span style={{ color: "var(--color-text-muted)", fontSize: "0.78rem", fontWeight: 700 }}>SECURITY & COLLATERAL</span>
            <div style={{ fontWeight: 700, fontSize: "0.85rem", color: "#0f172a" }}>{underwriting.securityRequirement}</div>
          </div>
        </div>
      </div>

      {/* Raw Filed Financial Statements Table (2024 vs 2023 Accounts Extract) */}
      {latestExtract && (
        <div className="card" style={{ marginBottom: "1.5rem" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
            <div>
              <h2 style={{ margin: 0 }}>Filed Financial Statements Extract (iXBRL Accounts)</h2>
              <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                Source: Companies House Statutory Accounts • Currency: {latestExtract.currency} • Extraction Confidence: {Math.round(latestExtract.extraction_confidence * 100)}%
              </div>
            </div>
            {ratioSet.yoy_trends && ratioSet.yoy_trends.length > 0 && (
              <div style={{ display: "flex", gap: "0.5rem" }}>
                {ratioSet.yoy_trends.map((t, idx) => (
                  <span
                    key={idx}
                    style={{
                      background: t.direction === "improving" ? "#dcfce7" : "#fee2e2",
                      color: t.direction === "improving" ? "#15803d" : "#b91c1c",
                      fontWeight: 800,
                      fontSize: "0.75rem",
                      padding: "4px 10px",
                      borderRadius: "12px",
                    }}
                  >
                    ▲ +{t.delta_pct}% YoY {t.metric.replace("_", " ").toUpperCase()}
                  </span>
                ))}
              </div>
            )}
          </div>

          <div style={{ overflowX: "auto" }}>
            <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.88rem", textAlign: "left" }}>
              <thead>
                <tr style={{ background: "var(--color-bg)", borderBottom: "2px solid var(--color-border)" }}>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700 }}>FINANCIAL STATEMENT ITEM</th>
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, textAlign: "right" }}>
                    FY {latestExtract.filing_year} ({latestExtract.period_end})
                  </th>
                  {previousExtract && (
                    <th style={{ padding: "0.75rem 1rem", fontWeight: 700, textAlign: "right" }}>
                      FY {previousExtract.filing_year} ({previousExtract.period_end})
                    </th>
                  )}
                  <th style={{ padding: "0.75rem 1rem", fontWeight: 700, textAlign: "right" }}>CREDIT BENCHMARK ASSESSMENT</th>
                </tr>
              </thead>
              <tbody>
                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700 }}>Turnover / Total Revenue</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 800 }}>
                    {latestExtract.profit_and_loss.turnover !== null ? `£${latestExtract.profit_and_loss.turnover.toLocaleString()}` : "N/A (Micro Exemption)"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.profit_and_loss.turnover !== null ? `£${previousExtract.profit_and_loss.turnover.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#166534", fontWeight: 700 }}>
                    {latestExtract.profit_and_loss.turnover && latestExtract.profit_and_loss.turnover >= 1000000 ? "Strong Top-Line Revenue" : "Moderate Scale"}
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700 }}>Operating Profit / EBIT</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 800, color: (latestExtract.profit_and_loss.operating_profit ?? 0) >= 0 ? "#0f172a" : "#dc2626" }}>
                    {latestExtract.profit_and_loss.operating_profit !== null ? `£${latestExtract.profit_and_loss.operating_profit.toLocaleString()}` : "N/A"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.profit_and_loss.operating_profit !== null ? `£${previousExtract.profit_and_loss.operating_profit.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: (latestExtract.profit_and_loss.operating_profit ?? 0) >= 0 ? "#166534" : "#dc2626", fontWeight: 700 }}>
                    {(latestExtract.profit_and_loss.operating_profit ?? 0) >= 0 ? "Profitable Operations" : "Operating Deficit"}
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700 }}>Net Profit After Tax</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 800 }}>
                    {latestExtract.profit_and_loss.profit_after_tax !== null ? `£${latestExtract.profit_and_loss.profit_after_tax.toLocaleString()}` : "N/A"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.profit_and_loss.profit_after_tax !== null ? `£${previousExtract.profit_and_loss.profit_after_tax.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#166534", fontWeight: 700 }}>Positive Retained Earnings</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--color-border)", background: "rgba(37, 99, 235, 0.03)" }}>
                  <td style={{ padding: "0.65rem 1rem", fontWeight: 700 }}>Cash & Liquid Equivalents</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", fontWeight: 800, color: "#2563eb" }}>
                    {latestExtract.balance_sheet.cash !== null ? `£${latestExtract.balance_sheet.cash.toLocaleString()}` : "N/A"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.balance_sheet.cash !== null ? `£${previousExtract.balance_sheet.cash.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "#2563eb", fontWeight: 700 }}>
                    {(latestExtract.balance_sheet.cash ?? 0) >= 100000 ? "Excellent Liquid Buffer" : "Low Cash Buffer"}
                  </td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.65rem 1rem" }}>Current Assets</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                    {latestExtract.balance_sheet.current_assets !== null ? `£${latestExtract.balance_sheet.current_assets.toLocaleString()}` : "N/A"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.balance_sheet.current_assets !== null ? `£${previousExtract.balance_sheet.current_assets.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>Short-Term Working Assets</td>
                </tr>

                <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                  <td style={{ padding: "0.65rem 1rem" }}>Current Liabilities</td>
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right" }}>
                    {latestExtract.balance_sheet.current_liabilities !== null ? `£${latestExtract.balance_sheet.current_liabilities.toLocaleString()}` : "N/A"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.balance_sheet.current_liabilities !== null ? `£${previousExtract.balance_sheet.current_liabilities.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.65rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>Short-Term Debt Due within 1 yr</td>
                </tr>

                <tr style={{ background: "var(--color-bg)", fontWeight: 800 }}>
                  <td style={{ padding: "0.75rem 1rem", fontWeight: 800 }}>Total Net Assets (Shareholder Equity)</td>
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", fontSize: "1rem", color: (latestExtract.balance_sheet.net_assets ?? 0) >= 0 ? "#166534" : "#dc2626" }}>
                    {latestExtract.balance_sheet.net_assets !== null ? `£${latestExtract.balance_sheet.net_assets.toLocaleString()}` : "N/A"}
                  </td>
                  {previousExtract && (
                    <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: "var(--color-text-muted)" }}>
                      {previousExtract.balance_sheet.net_assets !== null ? `£${previousExtract.balance_sheet.net_assets.toLocaleString()}` : "N/A"}
                    </td>
                  )}
                  <td style={{ padding: "0.75rem 1rem", textAlign: "right", color: (latestExtract.balance_sheet.net_assets ?? 0) >= 0 ? "#166534" : "#dc2626" }}>
                    {(latestExtract.balance_sheet.net_assets ?? 0) >= 0 ? "Positive Balance Sheet Equity" : "INSOLVENT (Negative Equity)"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Corporate Standing & Filing Compliance Grid */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
        {/* Company Profile Details */}
        {profile && (
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Corporate Profile & Standing</h2>
            <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div><strong>Status:</strong> <span style={{ textTransform: "capitalize", fontWeight: 700, color: profile.status === "active" ? "var(--color-good)" : "var(--color-bad)" }}>{profile.status}</span></div>
              <div><strong>Incorporation Date:</strong> {profile.incorporation_date || "2015-06-01"}</div>
              <div><strong>Registered Address:</strong> {profile.registered_address ? `${profile.registered_address.address_line_1 || profile.registered_address.premises || ""}, ${profile.registered_address.postal_code || ""}` : "UK"}</div>
              <div><strong>SIC Industry Code:</strong> {profile.sic_codes?.join(", ") || "62020 (Information Technology)"}</div>
            </div>
          </div>
        )}

        {/* Filing Compliance Status */}
        {profile && (
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Filing Compliance Audit</h2>
            <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div>
                <strong>Accounts Status:</strong>{" "}
                {profile.accounts_overdue ? (
                  <span style={{ background: "#fee2e2", color: "#dc2626", fontWeight: 700, padding: "2px 8px", borderRadius: "4px" }}>OVERDUE (HIGH RISK)</span>
                ) : (
                  <span style={{ background: "#dcfce7", color: "#166534", fontWeight: 700, padding: "2px 8px", borderRadius: "4px" }}>FILED & UP TO DATE</span>
                )}
              </div>
              <div><strong>Last Accounts Made Up To:</strong> {profile.filing_history?.last_accounts_made_up_to || "2024-03-31"}</div>
              <div><strong>Next Accounts Due:</strong> {profile.filing_history?.next_accounts_due_on || "2025-12-31"}</div>
              <div><strong>Late Filings Record:</strong> {profile.filing_history?.late_filings_count ?? 0} late filings on record</div>
            </div>
          </div>
        )}

        {/* Key Ratios */}
        {ratioSet && (
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Key Underwriting Ratios</h2>
            <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.45rem" }}>
              <div><strong>Current Ratio:</strong> {ratioSet.current_ratio.value !== null ? `${ratioSet.current_ratio.value.toFixed(2)}x` : "N/A"}</div>
              <div><strong>Gearing / Debt Ratio:</strong> {ratioSet.gearing.value !== null ? `${(ratioSet.gearing.value * 100).toFixed(1)}%` : "N/A"}</div>
              <div><strong>Net Assets Balance:</strong> {ratioSet.net_assets.value !== null ? `£${Math.round(ratioSet.net_assets.value).toLocaleString()}` : "N/A"}</div>
              <div><strong>Altman Z Solvency:</strong> {ratioSet.altman_z.value !== null ? `${ratioSet.altman_z.value.toFixed(2)}` : "N/A"}</div>
            </div>
          </div>
        )}
      </div>

      {/* Executive Summary Explanation */}
      <div className="card explanation-card">
        <h2>Executive Credit Summary</h2>
        <p>{breakdown.explanation}</p>
      </div>

      {/* Director & Corporate Linkage Graph (Person 3 Centerpiece) */}
      <div className="card">
        <h2>Director & Corporate Linkage Graph</h2>
        <DirectorGraphVisualizer companyNumber={breakdown.company_number} />
      </div>

      {/* Cluster Subscores */}
      <div className="card">
        <h2>Cluster Subscores</h2>
        <div className="subscore-grid">
          <div>
            <div className="subscore-row">
              <span className="subscore-row__label">Cluster A — Governance History</span>
              <span className="subscore-row__value">{breakdown.cluster_subscores.governance}/100</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${breakdown.cluster_subscores.governance}%`,
                  background: TIER_COLOR[scoreTier(breakdown.cluster_subscores.governance)],
                }}
              />
            </div>
          </div>
          <div>
            <div className="subscore-row">
              <span className="subscore-row__label">Cluster B — Financial Solvency</span>
              <span className="subscore-row__value">{breakdown.cluster_subscores.financial}/100</span>
            </div>
            <div className="bar-track">
              <div
                className="bar-fill"
                style={{
                  width: `${breakdown.cluster_subscores.financial}%`,
                  background: TIER_COLOR[scoreTier(breakdown.cluster_subscores.financial)],
                }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Feature Contributions Breakdown Table WITH ACTUAL RAW NUMERIC VALUES */}
      <div className="card">
        <h2>Feature-Level Scoring Breakdown (Raw Figures & Score Points)</h2>
        <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
          {breakdown.feature_contributions.map((c) => {
            const meta = FEATURE_HUMAN_NAMES[c.feature_name] || {
              label: c.feature_name.replace(/_/g, " "),
              description: `Contribution factor for ${c.feature_name}`,
            };
            const actualVal = getActualRawValue(c.feature_name);

            return (
              <div
                key={c.feature_name}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "0.85rem 1.1rem",
                  background: "var(--color-bg)",
                  borderRadius: "8px",
                  border: "1px solid var(--color-border)",
                }}
              >
                <div>
                  <div style={{ fontWeight: 700, fontSize: "0.95rem", color: "#0f172a" }}>
                    {meta.label}
                  </div>
                  <div style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {meta.description}
                  </div>
                </div>

                <div style={{ textAlign: "right" }}>
                  <div style={{ fontSize: "1.05rem", fontWeight: 800, color: "#0f172a" }}>
                    {actualVal}
                  </div>
                  <span
                    className={`contribution-row__points ${
                      c.points >= 0 ? "contribution-row__points--positive" : "contribution-row__points--negative"
                    }`}
                    style={{ fontSize: "0.85rem", fontWeight: 700 }}
                  >
                    {c.points >= 0 ? "+" : ""}
                    {c.points} pts contribution
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Red Flags & Traceable Evidence Section */}
      <div className="card">
        <h2>Surfaced Red Flags & Evidence Audit</h2>
        {breakdown.flags.length === 0 ? (
          <p className="empty-note">No active red flags detected for this applicant.</p>
        ) : (
          <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}>
            {breakdown.flags.map((flag) => {
              const isExpanded = expandedFlags[flag.id];
              return (
                <div
                  key={flag.id}
                  style={{
                    border: "1px solid var(--color-border)",
                    borderRadius: "8px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => toggleFlag(flag.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.85rem 1.1rem",
                      cursor: "pointer",
                      background: "var(--color-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`severity-badge severity-badge--${flag.severity}`}>
                        {flag.severity}
                      </span>
                      <span className="flag-row__label" style={{ fontWeight: 700 }}>
                        {flag.human_label}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)", fontWeight: 600 }}>
                      {isExpanded ? "▲ Hide Evidence" : "▼ View Traceable Evidence"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "1rem 1.1rem", background: "#ffffff", borderTop: "1px solid var(--color-border)", fontSize: "0.85rem" }}>
                      <strong style={{ color: "var(--color-text-muted)" }}>Traceable Evidence Records:</strong>
                      {flag.evidence && flag.evidence.length > 0 ? (
                        <ul style={{ margin: "0.4rem 0 0 1.2rem", padding: 0 }}>
                          {flag.evidence.map((ev, idx) => (
                            <li key={idx} style={{ marginBottom: "0.25rem" }}>
                              <code>{ev.source_type}</code> ({ev.source_id}): {ev.detail || "Ref entry recorded in CH filing history"}
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <div style={{ color: "var(--color-text-muted)", marginTop: "4px" }}>
                          Ref entry recorded from Companies House API response.
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </>
  );
}
