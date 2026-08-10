import { useState } from "react";
import { useNavigate } from "react-router-dom";

export default function SearchPage() {
  const [companyNumber, setCompanyNumber] = useState("01234567");
  const navigate = useNavigate();

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    navigate(`/report/${companyNumber}`);
  }

  return (
    <main>
      <h1>CounterpartyCheck</h1>
      <p>Enter a UK company number to run a due-diligence assessment.</p>
      <form onSubmit={handleSubmit}>
        <input
          value={companyNumber}
          onChange={(e) => setCompanyNumber(e.target.value)}
          placeholder="Company number, e.g. 01234567"
        />
        <button type="submit">Assess</button>
      </form>
      <p>
        Try the mock scenarios: <code>01234567</code> (healthy),{" "}
        <code>07654321</code> (risky), <code>09999999</code> (sparse micro-entity).
      </p>
    </main>
  );
}
