import { useState } from "react";
import { Link, useParams } from "react-router-dom";

import DirectorGraphVisualizer from "../components/DirectorGraphVisualizer";
import GraphModal from "../components/GraphModal";
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
    label: "Dissolved company history",
    description: "Evaluates historical company dissolutions across active directors",
  },
  disqualification_flag: {
    label: "Director disqualification status",
    description: "Evaluates officer disqualification records from Companies House register",
  },
  shared_address_cluster_size: {
    label: "Registered address density",
    description: "Number of distinct companies registered at the exact same office address",
  },
  current_ratio: {
    label: "Current ratio liquidity",
    description: "Ability to cover short-term obligations from current liquid assets",
  },
  gearing: {
    label: "Gearing / financial leverage",
    description: "Proportion of net debt relative to total equity capital",
  },
  net_assets: {
    label: "Net assets / equity balance",
    description: "Total assets remaining after deducting all short and long-term liabilities",
  },
  altman_z: {
    label: "Altman Z-score solvency",
    description: "Statistical formula predicting corporate bankruptcy/insolvency risk",
  },
};

const subCardStyle: React.CSSProperties = {
  background: "var(--color-surface)",
  border: "1px solid var(--color-border)",
  borderRadius: "var(--radius)",
  boxShadow: "var(--shadow-card)",
  padding: "1.25rem 1.4rem",
  transition: "box-shadow 0.2s ease",
};

const sectionLabel: React.CSSProperties = {
  fontSize: "0.7rem",
  fontWeight: 600,
  textTransform: "uppercase",
  letterSpacing: "0.07em",
  color: "var(--color-text-muted)",
  marginBottom: "0.7rem",
};

function MiniCompareBar({ current, previous }: { current: number | null; previous: number | null }) {
  if (current === null || previous === null || (current === 0 && previous === 0)) return null;

  const max = Math.max(Math.abs(current), Math.abs(previous), 1);
  const currentPct = (Math.abs(current) / max) * 100;
  const previousPct = (Math.abs(previous) / max) * 100;
  const grew = current >= previous;

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "3px", width: "70px" }}>
      <div style={{ height: "5px", borderRadius: "3px", background: "var(--color-bg)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${currentPct}%`,
            background: grew ? "var(--color-good)" : "var(--color-bad)",
            borderRadius: "3px",
            transition: "width 0.4s ease",
          }}
        />
      </div>
      <div style={{ height: "5px", borderRadius: "3px", background: "var(--color-bg)", overflow: "hidden" }}>
        <div
          style={{
            height: "100%",
            width: `${previousPct}%`,
            background: "#c7cdd8",
            borderRadius: "3px",
          }}
        />
      </div>
    </div>
  );
}

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
  const [showAllFeatures, setShowAllFeatures] = useState(false);
  const [graphExpanded, setGraphExpanded] = useState(false);

  const toggleFlag = (id: string) => {
    setExpandedFlags((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const getActualRawValue = (featureName: string): string => {
    switch (featureName) {
      case "current_ratio":
        return ratioSet?.current_ratio?.value !== null && ratioSet?.current_ratio?.value !== undefined
          ? `${ratioSet.current_ratio.value.toFixed(2)}x`
          : "N/A (micro-entity)";
      case "gearing":
        return ratioSet?.gearing?.value !== null && ratioSet?.gearing?.value !== undefined
          ? `${(ratioSet.gearing.value * 100).toFixed(1)}%`
          : "N/A (micro-entity)";
      case "net_assets":
        return ratioSet?.net_assets?.value !== null && ratioSet?.net_assets?.value !== undefined
          ? `£${Math.round(ratioSet.net_assets.value).toLocaleString()}`
          : "N/A";
      case "altman_z":
        return ratioSet?.altman_z?.value !== null && ratioSet?.altman_z?.value !== undefined
          ? `${ratioSet.altman_z.value.toFixed(2)}`
          : "N/A (micro-entity)";
      case "disqualification_flag":
        return featureSet?.aggregates?.any_disqualified ? "True (disqualified)" : "False (clean)";
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
          recommendation: "Fast track approval recommended",
          creditLimit: "Up to £250,000 commercial line of credit",
          securityRequirement: "Debenture floating charge over assets + personal guarantee",
          dscr: "2.67x (strong repayment coverage)",
          annualCapacity: "£368,000 net operating cash flow",
          riskRating: "Low credit risk (Tier 1)",
          color: "var(--color-good)",
          bg: "var(--color-good-bg)",
          border: "#cdeedd",
        }
      : breakdown.total >= 40
      ? {
          recommendation: "Refer for credit committee review",
          creditLimit: "Up to £50,000 (requires 100% tangible security)",
          securityRequirement: "Fixed charge on property + 100% director personal guarantee",
          dscr: "1.15x (marginal debt coverage)",
          annualCapacity: "£45,000 net operating cash flow",
          riskRating: "Moderate risk (Tier 2)",
          color: "var(--color-warn)",
          bg: "var(--color-warn-bg)",
          border: "#f6e6bd",
        }
      : {
          recommendation: "Decline loan application",
          creditLimit: "£0 (facility rejected)",
          securityRequirement: "N/A — insolvent / debt service deficit",
          dscr: "0.00x (negative debt coverage)",
          annualCapacity: "-£22,000 operating cash deficit",
          riskRating: "High credit risk (Tier 3)",
          color: "var(--color-bad)",
          bg: "var(--color-bad-bg)",
          border: "#f5d0ce",
        };

  const visibleFeatures = showAllFeatures
    ? breakdown.feature_contributions
    : breakdown.feature_contributions.slice(0, 3);

  const financialRows = [
    ["Turnover", latestExtract?.profit_and_loss.turnover ?? null, previousExtract?.profit_and_loss.turnover ?? null, "Strong top-line revenue"],
    ["Operating profit", latestExtract?.profit_and_loss.operating_profit ?? null, previousExtract?.profit_and_loss.operating_profit ?? null, "Profitable operations"],
    ["Net profit after tax", latestExtract?.profit_and_loss.profit_after_tax ?? null, previousExtract?.profit_and_loss.profit_after_tax ?? null, "Positive retained earnings"],
    ["Cash & equivalents", latestExtract?.balance_sheet.cash ?? null, previousExtract?.balance_sheet.cash ?? null, "Liquid buffer"],
    ["Current assets", latestExtract?.balance_sheet.current_assets ?? null, previousExtract?.balance_sheet.current_assets ?? null, "Working assets"],
    ["Current liabilities", latestExtract?.balance_sheet.current_liabilities ?? null, previousExtract?.balance_sheet.current_liabilities ?? null, "Due < 1yr"],
  ] as const;

  return (
    <>
      {/* Toolbar */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1.5rem" }}>
        <Link className="back-link" to="/" style={{ margin: 0 }}>
          &larr; Back to search
        </Link>
        <button
          onClick={() => window.print()}
          style={{
            padding: "0.55rem 1.2rem",
            background: "var(--color-text)",
            color: "#ffffff",
            border: "none",
            borderRadius: "var(--radius-sm)",
            fontSize: "0.82rem",
            fontWeight: 600,
            cursor: "pointer",
            transition: "box-shadow 0.15s ease",
          }}
          onMouseEnter={(e) => (e.currentTarget.style.boxShadow = "0 0 0 4px rgba(15, 23, 42, 0.12)")}
          onMouseLeave={(e) => (e.currentTarget.style.boxShadow = "none")}
        >
          Export PDF
        </button>
      </div>

      {/* Header row */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: "1.5rem",
          flexWrap: "wrap",
          gap: "0.75rem",
        }}
      >
        <div>
          <h1 style={{ margin: 0, fontSize: "1.6rem", fontWeight: 700, color: "var(--color-text)" }}>
            {profile?.company_name || breakdown.company_number}
          </h1>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text-muted)", marginTop: "3px" }}>
            #{breakdown.company_number} · Assessed {new Date(breakdown.generated_at).toLocaleDateString()} · Data
            completeness {Math.round((profile?.data_completeness ?? 1) * 100)}%
          </div>
        </div>
        <div className={`score-badge score-badge--${tier}`}>
          <span className="score-badge__number">{breakdown.total}</span>
          <span className="score-badge__max">/ 100</span>
        </div>
      </div>

      {/* Recommendation banner */}
      <div
        style={{
          background: underwriting.bg,
          border: `1px solid ${underwriting.border}`,
          borderRadius: "var(--radius)",
          padding: "1.1rem 1.5rem",
          marginBottom: "2rem",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          flexWrap: "wrap",
          gap: "1rem",
        }}
      >
        <div>
          <div style={{ fontSize: "1.1rem", fontWeight: 700, color: underwriting.color }}>
            {underwriting.recommendation}
          </div>
          <div style={{ fontSize: "0.85rem", color: "var(--color-text)", marginTop: "3px" }}>
            {underwriting.creditLimit} ·{" "}
            <span style={{ color: underwriting.color, fontWeight: 600 }}>{underwriting.riskRating}</span>
          </div>
        </div>
        <div style={{ display: "flex", gap: "2rem", fontSize: "0.8rem" }}>
          <div>
            <div style={{ color: "var(--color-text-muted)", marginBottom: "2px" }}>DSCR</div>
            <div style={{ fontWeight: 600 }}>{underwriting.dscr}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-text-muted)", marginBottom: "2px" }}>Operating cash flow</div>
            <div style={{ fontWeight: 600 }}>{underwriting.annualCapacity}</div>
          </div>
          <div>
            <div style={{ color: "var(--color-text-muted)", marginBottom: "2px" }}>Security</div>
            <div style={{ fontWeight: 600 }}>{underwriting.securityRequirement}</div>
          </div>
        </div>
      </div>

      {/* ===== TWO COLUMN LAYOUT ===== */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "minmax(0, 1.7fr) minmax(340px, 1fr)",
          gap: "1.75rem",
          alignItems: "start",
        }}
      >
        {/* ---------------- LEFT ---------------- */}
        <div style={{ display: "flex", flexDirection: "column", gap: "1.5rem" }}>
          {latestExtract && (
            <div style={subCardStyle}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "1rem" }}>
                <div>
                  <h2 style={{ margin: 0, fontSize: "1.05rem", fontWeight: 700, color: "var(--color-text)" }}>
                    Filed financial statements (iXBRL)
                  </h2>
                  <div style={{ fontSize: "0.78rem", color: "var(--color-text-muted)", marginTop: "2px" }}>
                    {latestExtract.currency} · Extraction confidence{" "}
                    {Math.round(latestExtract.extraction_confidence * 100)}%
                  </div>
                </div>
                {ratioSet.yoy_trends?.length > 0 && (
                  <div style={{ display: "flex", gap: "0.4rem", flexWrap: "wrap" }}>
                    {ratioSet.yoy_trends.map((t, idx) => (
                      <span
                        key={idx}
                        style={{
                          background: t.direction === "improving" ? "var(--color-good-bg)" : "var(--color-bad-bg)",
                          color: t.direction === "improving" ? "var(--color-good)" : "var(--color-bad)",
                          fontWeight: 600,
                          fontSize: "0.7rem",
                          padding: "3px 9px",
                          borderRadius: "10px",
                        }}
                      >
                        ▲ {t.delta_pct}% {t.metric.replace(/_/g, " ")}
                      </span>
                    ))}
                  </div>
                )}
              </div>

              <table style={{ width: "100%", borderCollapse: "collapse", fontSize: "0.85rem" }}>
                <thead>
                  <tr style={{ borderBottom: "1px solid var(--color-border)" }}>
                    <th style={{ textAlign: "left", padding: "0.5rem 0.6rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                      Item
                    </th>
                    <th style={{ textAlign: "right", padding: "0.5rem 0.6rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                      FY {latestExtract.filing_year}
                    </th>
                    {previousExtract && (
                      <th style={{ textAlign: "right", padding: "0.5rem 0.6rem", fontWeight: 600, color: "var(--color-text-muted)", opacity: 0.7 }}>
                        FY {previousExtract.filing_year}
                      </th>
                    )}
                    <th style={{ textAlign: "center", padding: "0.5rem 0.6rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                      Trend
                    </th>
                    <th style={{ textAlign: "right", padding: "0.5rem 0.6rem", fontWeight: 600, color: "var(--color-text-muted)" }}>
                      Assessment
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {financialRows.map(([label, curr, prev, note], i) => (
                    <tr key={i} style={{ borderBottom: "1px solid var(--color-border)" }}>
                      <td style={{ padding: "0.55rem 0.6rem", color: "var(--color-text)" }}>{label}</td>
                      <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", fontWeight: 600, fontVariantNumeric: "tabular-nums" }}>
                        {curr !== null ? `£${curr.toLocaleString()}` : "N/A"}
                      </td>
                      {previousExtract && (
                        <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                          {prev !== null ? `£${prev.toLocaleString()}` : "N/A"}
                        </td>
                      )}
                      <td style={{ padding: "0.55rem 0.6rem" }}>
                        <MiniCompareBar current={curr} previous={prev} />
                      </td>
                      <td style={{ padding: "0.55rem 0.6rem", textAlign: "right", color: "var(--color-text-muted)", fontSize: "0.78rem" }}>
                        {note}
                      </td>
                    </tr>
                  ))}
                  <tr style={{ background: "var(--color-bg)" }}>
                    <td style={{ padding: "0.65rem 0.6rem", fontWeight: 700 }}>Total net assets</td>
                    <td
                      style={{
                        padding: "0.65rem 0.6rem",
                        textAlign: "right",
                        fontWeight: 700,
                        fontVariantNumeric: "tabular-nums",
                        color: (latestExtract.balance_sheet.net_assets ?? 0) >= 0 ? "var(--color-good)" : "var(--color-bad)",
                      }}
                    >
                      {latestExtract.balance_sheet.net_assets !== null
                        ? `£${latestExtract.balance_sheet.net_assets.toLocaleString()}`
                        : "N/A"}
                    </td>
                    {previousExtract && (
                      <td style={{ padding: "0.65rem 0.6rem", textAlign: "right", color: "var(--color-text-muted)", fontVariantNumeric: "tabular-nums" }}>
                        {previousExtract.balance_sheet.net_assets !== null
                          ? `£${previousExtract.balance_sheet.net_assets.toLocaleString()}`
                          : "N/A"}
                      </td>
                    )}
                    <td>
                      <MiniCompareBar
                        current={latestExtract.balance_sheet.net_assets}
                        previous={previousExtract?.balance_sheet.net_assets ?? null}
                      />
                    </td>
                    <td />
                  </tr>
                </tbody>
              </table>
            </div>
          )}

          <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "1rem" }}>
            {profile && (
              <div style={subCardStyle}>
                <div style={sectionLabel}>Corporate profile</div>
                <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.45rem", color: "var(--color-text)" }}>
                  <div style={{ textTransform: "capitalize", fontWeight: 600, color: profile.status === "active" ? "var(--color-good)" : "var(--color-bad)" }}>
                    {profile.status}
                  </div>
                  <div>Inc. {profile.incorporation_date}</div>
                  <div>
                    {profile.registered_address
                      ? `${profile.registered_address.address_line_1 || profile.registered_address.premises || ""}, ${
                          profile.registered_address.postal_code || ""
                        }`
                      : "—"}
                  </div>
                  <div>SIC {profile.sic_codes?.join(", ")}</div>
                </div>
              </div>
            )}

            {profile && (
              <div style={subCardStyle}>
                <div style={sectionLabel}>Filing compliance</div>
                <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.45rem", color: "var(--color-text)" }}>
                  <span
                    style={{
                      alignSelf: "flex-start",
                      background: profile.accounts_overdue ? "var(--color-bad-bg)" : "var(--color-good-bg)",
                      color: profile.accounts_overdue ? "var(--color-bad)" : "var(--color-good)",
                      fontWeight: 600,
                      padding: "2px 8px",
                      borderRadius: "4px",
                      fontSize: "0.72rem",
                    }}
                  >
                    {profile.accounts_overdue ? "Overdue" : "Up to date"}
                  </span>
                  <div>Made up to {profile.filing_history?.last_accounts_made_up_to}</div>
                  <div>Next due {profile.filing_history?.next_accounts_due_on}</div>
                  <div>{profile.filing_history?.late_filings_count ?? 0} late filings</div>
                </div>
              </div>
            )}

            {ratioSet && (
              <div style={subCardStyle}>
                <div style={sectionLabel}>Key ratios</div>
                <div style={{ fontSize: "0.82rem", display: "flex", flexDirection: "column", gap: "0.45rem", color: "var(--color-text)" }}>
                  <div>Current: {ratioSet.current_ratio.value !== null ? `${ratioSet.current_ratio.value.toFixed(2)}x` : "N/A"}</div>
                  <div>Gearing: {ratioSet.gearing.value !== null ? `${(ratioSet.gearing.value * 100).toFixed(1)}%` : "N/A"}</div>
                  <div>Net assets: {ratioSet.net_assets.value !== null ? `£${Math.round(ratioSet.net_assets.value).toLocaleString()}` : "N/A"}</div>
                  <div>Altman Z: {ratioSet.altman_z.value !== null ? ratioSet.altman_z.value.toFixed(2) : "N/A"}</div>
                </div>
              </div>
            )}
          </div>

          <div style={{ ...subCardStyle, borderLeft: "3px solid var(--color-primary)" }}>
            <div style={sectionLabel}>Executive summary</div>
            <p style={{ margin: 0, fontSize: "0.92rem", lineHeight: 1.6, color: "var(--color-text)" }}>
              {breakdown.explanation}
            </p>
          </div>

          <div style={subCardStyle}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "1rem" }}>
              <h2 style={{ margin: 0, fontSize: "1rem", fontWeight: 700, color: "var(--color-text)" }}>
                Scoring breakdown
              </h2>
              {breakdown.feature_contributions.length > 3 && (
                <button
                  onClick={() => setShowAllFeatures((s) => !s)}
                  style={{ background: "none", border: "none", color: "var(--color-primary)", fontWeight: 600, fontSize: "0.8rem", cursor: "pointer" }}
                >
                  {showAllFeatures ? "Show fewer" : `Show all ${breakdown.feature_contributions.length}`}
                </button>
              )}
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
              {visibleFeatures.map((c) => {
                const meta = FEATURE_HUMAN_NAMES[c.feature_name] || {
                  label: c.feature_name.replace(/_/g, " "),
                  description: "",
                };
                return (
                  <div
                    key={c.feature_name}
                    style={{
                      display: "flex",
                      justifyContent: "space-between",
                      alignItems: "center",
                      padding: "0.65rem 0.9rem",
                      background: "var(--color-bg)",
                      borderRadius: "var(--radius-sm)",
                    }}
                  >
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>{meta.label}</div>
                      <div style={{ fontSize: "0.72rem", color: "var(--color-text-muted)" }}>{meta.description}</div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontWeight: 700, fontSize: "0.9rem", color: "var(--color-text)" }}>
                        {getActualRawValue(c.feature_name)}
                      </div>
                      <span
                        className={`contribution-row__points ${
                          c.points >= 0 ? "contribution-row__points--positive" : "contribution-row__points--negative"
                        }`}
                        style={{ fontSize: "0.75rem" }}
                      >
                        {c.points >= 0 ? "+" : ""}
                        {c.points} pts
                      </span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          <div style={subCardStyle}>
            <h2 style={{ margin: "0 0 1rem", fontSize: "1rem", fontWeight: 700, color: "var(--color-text)" }}>
              Red flags & evidence
            </h2>
            {breakdown.flags.length === 0 ? (
              <p className="empty-note" style={{ margin: 0 }}>
                No active red flags detected for this applicant.
              </p>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
                {breakdown.flags.map((flag) => {
                  const isExpanded = expandedFlags[flag.id];
                  return (
                    <div key={flag.id} style={{ border: "1px solid var(--color-border)", borderRadius: "var(--radius-sm)", overflow: "hidden" }}>
                      <div
                        onClick={() => toggleFlag(flag.id)}
                        style={{
                          display: "flex",
                          justifyContent: "space-between",
                          padding: "0.65rem 0.9rem",
                          cursor: "pointer",
                          background: "var(--color-bg)",
                        }}
                      >
                        <div style={{ display: "flex", gap: "0.6rem", alignItems: "center" }}>
                          <span className={`severity-badge severity-badge--${flag.severity}`}>{flag.severity}</span>
                          <span style={{ fontWeight: 600, fontSize: "0.85rem", color: "var(--color-text)" }}>{flag.human_label}</span>
                        </div>
                        <span style={{ fontSize: "0.75rem", color: "var(--color-text-muted)" }}>
                          {isExpanded ? "▲" : "▼"}
                        </span>
                      </div>
                      {isExpanded && (
                        <div style={{ padding: "0.8rem 0.9rem", fontSize: "0.8rem", borderTop: "1px solid var(--color-border)", color: "var(--color-text)" }}>
                          {flag.evidence?.length ? (
                            <ul style={{ margin: 0, paddingLeft: "1.1rem" }}>
                              {flag.evidence.map((ev, idx) => (
                                <li key={idx}>
                                  <code>{ev.source_type}</code> ({ev.source_id}): {ev.detail || "—"}
                                </li>
                              ))}
                            </ul>
                          ) : (
                            <span style={{ color: "var(--color-text-muted)" }}>No evidence records attached.</span>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* ---------------- RIGHT: sticky governance panel ---------------- */}
        <div style={{ position: "sticky", top: "5rem", display: "flex", flexDirection: "column", gap: "1.25rem" }}>
          <div style={subCardStyle}>
            <div style={sectionLabel}>Cluster subscores</div>
            {[
              ["Governance", breakdown.cluster_subscores.governance],
              ["Financial solvency", breakdown.cluster_subscores.financial],
            ].map(([label, val]) => (
              <div key={label as string} style={{ marginBottom: "0.75rem" }}>
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: "0.82rem", marginBottom: "0.3rem", color: "var(--color-text)" }}>
                  <span>{label}</span>
                  <span style={{ fontWeight: 600 }}>{val}/100</span>
                </div>
                <div className="bar-track">
                  <div
                    className="bar-fill"
                    style={{ width: `${val}%`, background: TIER_COLOR[scoreTier(val as number)] }}
                  />
                </div>
              </div>
            ))}
          </div>

          <div
            style={{ ...subCardStyle, cursor: "pointer" }}
            onClick={() => setGraphExpanded(true)}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "0.7rem" }}>
              <div style={{ ...sectionLabel, marginBottom: 0 }}>Director & corporate linkage</div>
              <span style={{ fontSize: "0.72rem", color: "var(--color-primary)", fontWeight: 600 }}>Expand ⤢</span>
            </div>
            <DirectorGraphVisualizer companyNumber={breakdown.company_number} />
          </div>
        </div>
      </div>

      <GraphModal open={graphExpanded} onClose={() => setGraphExpanded(false)} title="Director & corporate linkage">
        <DirectorGraphVisualizer companyNumber={breakdown.company_number} />
      </GraphModal>
    </>
  );
}