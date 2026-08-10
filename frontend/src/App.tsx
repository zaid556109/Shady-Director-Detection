import { BrowserRouter, Route, Routes } from "react-router-dom";

import ReportPage from "./pages/ReportPage";
import SearchPage from "./pages/SearchPage";

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<SearchPage />} />
        <Route path="/report/:companyNumber" element={<ReportPage />} />
      </Routes>
    </BrowserRouter>
  );
}
