import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import DirectorGraphVisualizer from "../components/DirectorGraphVisualizer";
import { mockApplicantProfile, mockDirectorFeatureSet, mockRatioSet, mockScoreBreakdown } from "../mocks";

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

  const recommendation =
    breakdown.total >= 70
      ? {
          title: "FAST TRACK APPROVAL",
          subtitle: "Low Governance & Financial Risk Profile — Standard Underwriting Approved",
          color: "#15803d",
          bg: "#f0fdf4",
          border: "#bbf7d0",
        }
      : breakdown.total >= 40
      ? {
          title: "REFER FOR MANUAL REVIEW",
          subtitle: "Moderate Governance or Financial Risk — Senior Underwriter Verification Required",
          color: "#b45309",
          bg: "#fffbeb",
          border: "#fef3c7",
        }
      : {
          title: "DECLINE / HIGH RISK",
          subtitle: "Critical Red Flags or Governance Disqualifications Detected — Rejection Recommended",
          color: "#b91c1c",
          bg: "#fef2f2",
          border: "#fecaca",
        };

  return (
    <>
      {/* Top Header Actions */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
        <Link className="back-link" to="/" style={{ margin: 0 }}>
          &larr; Back to Search
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            padding: "0.5rem 1rem",
            background: "var(--color-bg)",
            border: "1px solid var(--color-border)",
            borderRadius: "6px",
            fontSize: "0.85rem",
            fontWeight: 600,
            cursor: "pointer",
          }}
        >
          🖨️ Export PDF / Print Assessment
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

      {/* Decision Recommendation Banner */}
      <div
        style={{
          background: recommendation.bg,
          border: `1.5px solid ${recommendation.border}`,
          borderRadius: "10px",
          padding: "1rem 1.4rem",
          marginBottom: "1.5rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "0.75rem", fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.05em", color: recommendation.color }}>
            HEADLINE UNDERWRITING DECISION RECOMMENDATION
          </div>
          <div style={{ fontSize: "1.25rem", fontWeight: 800, color: recommendation.color, marginTop: "2px" }}>
            {recommendation.title}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
            {recommendation.subtitle}
          </div>
        </div>
        <span
          style={{
            background: recommendation.color,
            color: "#ffffff",
            fontWeight: 800,
            fontSize: "0.85rem",
            padding: "6px 14px",
            borderRadius: "20px",
            letterSpacing: "0.03em",
          }}
        >
          {breakdown.total} SCORE
        </span>
      </div>

      {/* Company Profile Basics & Compliance Grid */}
      {profile && (
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))", gap: "1rem", marginBottom: "1.5rem" }}>
          {/* Company Details */}
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Company Profile Details</h2>
            <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div><strong>Status:</strong> <span style={{ textTransform: "capitalize", fontWeight: 700, color: profile.status === "active" ? "var(--color-good)" : "var(--color-bad)" }}>{profile.status}</span></div>
              <div><strong>Incorporation Date:</strong> {profile.incorporation_date || "N/A"}</div>
              <div><strong>Registered Address:</strong> {profile.registered_address ? `${profile.registered_address.address_line_1 || profile.registered_address.premises || ""}, ${profile.registered_address.postal_code || ""}, ${profile.registered_address.country}` : "UK"}</div>
              <div><strong>SIC Industry Codes:</strong> {profile.sic_codes?.join(", ") || "62020 (IT Consulting)"}</div>
            </div>
          </div>

          {/* Compliance Status */}
          <div className="card" style={{ margin: 0 }}>
            <h2 style={{ fontSize: "1rem", marginBottom: "0.75rem" }}>Filing Compliance Status</h2>
            <div style={{ fontSize: "0.85rem", display: "flex", flexDirection: "column", gap: "0.4rem" }}>
              <div>
                <strong>Accounts Status:</strong>{" "}
                {profile.accounts_overdue ? (
                  <span style={{ background: "#fee2e2", color: "#dc2626", fontWeight: 700, padding: "2px 8px", borderRadius: "4px" }}>OVERDUE</span>
                ) : (
                  <span style={{ background: "#dcfce7", color: "#166534", fontWeight: 700, padding: "2px 8px", borderRadius: "4px" }}>UP TO DATE</span>
                )}
              </div>
              <div><strong>Last Accounts Filed:</strong> {profile.filing_history?.last_accounts_made_up_to || "N/A"}</div>
              <div><strong>Next Accounts Due:</strong> {profile.filing_history?.next_accounts_due_on || "N/A"}</div>
              <div><strong>Late Filings Pattern:</strong> {profile.filing_history?.late_filings_count ?? 0} late filings recorded</div>
            </div>
          </div>
        </div>
      )}

      {/* Summary Explanation Card */}
      <div className="card explanation-card">
        <h2>Executive Summary</h2>
        <p>{breakdown.explanation}</p>
      </div>

      {/* Director Graph (Person 3 Centerpiece) */}
      <div className="card">
        <h2>Director & Corporate Linkage Graph</h2>
        <DirectorGraphVisualizer companyNumber={breakdown.company_number} />
      </div>

      {/* Governance & Financial Subscores */}
      <div className="card">
        <h2>Cluster Subscores</h2>
        <div className="subscore-grid">
          <div>
            <div className="subscore-row">
              <span className="subscore-row__label">Cluster A — Governance</span>
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
              <span className="subscore-row__label">Cluster B — Financials</span>
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

      {/* Feature Contributions Table WITH ACTUAL RAW NUMERIC VALUES */}
      <div className="card">
        <h2>Feature-Level Scoring Breakdown (Actual Numeric Values & Points)</h2>
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
                  borderRadius: "6px",
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
                  <div style={{ fontSize: "1rem", fontWeight: 800, color: "#0f172a" }}>
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
        <h2>Surfaced Red Flags & Evidence</h2>
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
                    borderRadius: "6px",
                    overflow: "hidden",
                  }}
                >
                  <div
                    onClick={() => toggleFlag(flag.id)}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "space-between",
                      padding: "0.75rem 1rem",
                      cursor: "pointer",
                      background: "var(--color-bg)",
                    }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
                      <span className={`severity-badge severity-badge--${flag.severity}`}>
                        {flag.severity}
                      </span>
                      <span className="flag-row__label" style={{ fontWeight: 600 }}>
                        {flag.human_label}
                      </span>
                    </div>
                    <span style={{ fontSize: "0.8rem", color: "var(--color-text-muted)" }}>
                      {isExpanded ? "▲ Hide Evidence" : "▼ View Traceable Evidence"}
                    </span>
                  </div>

                  {isExpanded && (
                    <div style={{ padding: "0.85rem 1rem", background: "#ffffff", borderTop: "1px solid var(--color-border)", fontSize: "0.82rem" }}>
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
