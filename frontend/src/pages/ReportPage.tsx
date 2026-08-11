import { Link, useParams } from "react-router-dom";

import { mockScoreBreakdown } from "../mocks";

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

/**
 * Renders from local mocks so the UI works with zero backend (see
 * README "Frontend"). Swapping to `api.report(companyNumber)` from
 * ../api/client is the natural next step once the backend is running.
 */
export default function ReportPage() {
  const { companyNumber = "" } = useParams();
  const breakdown = mockScoreBreakdown(companyNumber);
  const tier = scoreTier(breakdown.total);

  return (
    <>
      <Link className="back-link" to="/">
        &larr; New search
      </Link>

      <div className="report-header">
        <div>
          <h1>{breakdown.company_number}</h1>
          <div className="report-header__sub">
            Assessed {new Date(breakdown.generated_at).toLocaleString()}
          </div>
        </div>
        <div className={`score-badge score-badge--${tier}`}>
          <span className="score-badge__number">{breakdown.total}</span>
          <span className="score-badge__max">/ 100</span>
        </div>
      </div>

      <div className="card explanation-card">
        <h2>Summary</h2>
        <p>{breakdown.explanation}</p>
      </div>

      <div className="card">
        <h2>Cluster subscores</h2>
        <div className="subscore-grid">
          <div>
            <div className="subscore-row">
              <span className="subscore-row__label">Governance</span>
              <span className="subscore-row__value">
                {breakdown.cluster_subscores.governance}/100
              </span>
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
              <span className="subscore-row__label">Financial</span>
              <span className="subscore-row__value">
                {breakdown.cluster_subscores.financial}/100
              </span>
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

      <div className="card">
        <h2>Feature contributions</h2>
        {breakdown.feature_contributions.map((c) => (
          <div className="contribution-row" key={c.feature_name}>
            <span className="contribution-row__name">{c.feature_name}</span>
            <span
              className={`contribution-row__points ${
                c.points >= 0
                  ? "contribution-row__points--positive"
                  : "contribution-row__points--negative"
              }`}
            >
              {c.points >= 0 ? "+" : ""}
              {c.points}
            </span>
          </div>
        ))}
      </div>

      <div className="card">
        <h2>Red flags</h2>
        {breakdown.flags.length === 0 ? (
          <p className="empty-note">No red flags detected.</p>
        ) : (
          breakdown.flags.map((flag) => (
            <div className="flag-row" key={flag.id}>
              <span className={`severity-badge severity-badge--${flag.severity}`}>
                {flag.severity}
              </span>
              <span className="flag-row__label">{flag.human_label}</span>
            </div>
          ))
        )}
      </div>

      <div className="card">
        <h2>Director graph</h2>
        <div className="graph-placeholder">
          Director&ndash;company graph visualization goes here (Person 3)
        </div>
      </div>
    </>
  );
}
