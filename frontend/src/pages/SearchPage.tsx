import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";

const COMPANY_NAME_MAP: Record<string, string> = {
  barclays: "01026167",
  healthy: "01234567",
  "healthy plc": "01234567",
  risky: "07654321",
  "risky sme": "07654321",
  sparse: "09999999",
  "sparse micro": "09999999",
};

export default function SearchPage() {
  const [searchTerm, setSearchTerm] = useState("");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const cleaned = searchTerm.trim().toLowerCase();
    if (!cleaned) return;

    // Check if user entered a company name matching a scenario
    const matchedNumber = COMPANY_NAME_MAP[cleaned] || searchTerm.trim();
    navigate(`/report/${matchedNumber}`);
  }

  return (
    <>
      <div className="hero">
        <h1>Run a due-diligence assessment</h1>
        <p>Enter a UK company number or company name to evaluate director history and financial reliability.</p>
      </div>
      <div className="search-card">
        <form className="search-form" onSubmit={handleSubmit}>
          <input
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            placeholder="Search by company name (e.g. Barclays, Healthy PLC) or number (e.g. 01234567)"
            aria-label="Company name or number"
          />
          <button type="submit" className="btn-primary">
            Assess Company
          </button>
        </form>
        <div className="sample-list">
          <div className="sample-list__label">Quick-select mock scenarios:</div>
          <Link className="sample-chip" to="/report/01234567">
            <code>01234567</code>
            <span>Healthy PLC (Score 91 - Approve)</span>
          </Link>
          <Link className="sample-chip" to="/report/07654321">
            <code>07654321</code>
            <span>Risky SME (Score 34 - Decline)</span>
          </Link>
          <Link className="sample-chip" to="/report/09999999">
            <code>09999999</code>
            <span>Sparse Micro (Score 55 - Review)</span>
          </Link>
        </div>
      </div>
    </>
  );
}
