import { Link, useParams } from "react-router-dom";

import { mockScoreBreakdown } from "../mocks";

/**
 * Renders from local mocks so the UI works with zero backend (see
 * README "Frontend"). Swapping to `api.report(companyNumber)` from
 * ../api/client is the natural next step once the backend is running.
 */
export default function ReportPage() {
  const { companyNumber = "" } = useParams();
  const breakdown = mockScoreBreakdown(companyNumber);

  return (
    <main>
      <p>
        <Link to="/">&larr; New search</Link>
      </p>
      <h1>{breakdown.company_number}</h1>
      <h2>Score: {breakdown.total} / 100</h2>

      <section>
        <h3>Governance</h3>
        <p>{breakdown.cluster_subscores.governance} / 100</p>
      </section>

      <section>
        <h3>Financial</h3>
        <p>{breakdown.cluster_subscores.financial} / 100</p>
      </section>

      <section>
        <h3>Director graph</h3>
        <p>[placeholder — director/company graph visualization goes here]</p>
      </section>

      <section>
        <h3>Explanation</h3>
        <p>{breakdown.explanation}</p>
      </section>

      {breakdown.flags.length > 0 && (
        <section>
          <h3>Red flags</h3>
          <ul>
            {breakdown.flags.map((flag) => (
              <li key={flag.id}>
                [{flag.severity}] {flag.human_label}
              </li>
            ))}
          </ul>
        </section>
      )}
    </main>
  );
}
