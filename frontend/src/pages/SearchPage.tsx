import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

export default function SearchPage() {
  const [companyNumber, setCompanyNumber] = useState("01234567");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/report/${companyNumber}`);
  }

  return (
    <>
      <div className="hero">
        <h1>Run a due-diligence assessment</h1>
        <p>Enter a UK company number to get an explainable reliability score.</p>
      </div>
      <div className="search-card">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            value={companyNumber}
            onChange={(e) => setCompanyNumber(e.target.value)}
            placeholder="Company number, e.g. 01234567"
            aria-label="Company number"
          />
          <button type="submit" className="btn-primary">
            Assess
          </button>
        </form>
        <div className="sample-list">
          <div className="sample-list__label">Try a mock scenario</div>
          <Link className="sample-chip" to="/report/01234567">
            <code>01234567</code>
            <span>healthy</span>
          </Link>
          <Link className="sample-chip" to="/report/07654321">
            <code>07654321</code>
            <span>risky</span>
          </Link>
          <Link className="sample-chip" to="/report/09999999">
            <code>09999999</code>
            <span>sparse micro-entity</span>
          </Link>
        </div>
      </div>
    </>
  );
}
