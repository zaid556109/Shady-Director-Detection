import { BrowserRouter, Route, Routes } from "react-router-dom";

import ReportPage from "./pages/ReportPage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <div className="app-shell">
        <header className="app-header">
          <div className="app-header__mark" />
          <span className="app-header__name">CounterpartyCheck</span>
          <span className="app-header__tag">due-diligence scoring</span>
        </header>
        <main className="app-main">
          <Routes>
            <Route path="/" element={<SearchPage />} />
            <Route path="/report/:companyNumber" element={<ReportPage />} />
          </Routes>
        </main>
      </div>
    </BrowserRouter>
  );
}
