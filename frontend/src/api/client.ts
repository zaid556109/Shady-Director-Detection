/**
 * Typed client for the backend API (see backend/app/api/). Talks to
 * VITE_API_BASE_URL — when the backend isn't running yet, import from
 * `src/mocks/` directly instead (see src/pages/ReportPage.tsx).
 */

import type { AssessmentJob } from "../contracts/assessment-job";
import type { ScoreBreakdown } from "../contracts/scoring";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

async function request<T>(path: string, init?: RequestInit): Promise<T> {
  const res = await fetch(`${BASE_URL}${path}`, init);
  if (!res.ok) {
    throw new Error(`${init?.method ?? "GET"} ${path} failed: ${res.status} ${res.statusText}`);
  }
  return res.json() as Promise<T>;
}

export const api = {
  assess: (companyNumber: string) =>
    request<AssessmentJob>(`/assess/${companyNumber}`, { method: "POST" }),
  report: (companyNumber: string) => request<ScoreBreakdown>(`/report/${companyNumber}`),
  status: (jobId: string) => request<AssessmentJob>(`/status/${jobId}`),
};
