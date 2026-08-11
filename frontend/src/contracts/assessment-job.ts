/**
 * TypeScript mirror of contracts/src/contracts/assessment_job.py, plus the
 * JobStatus/PipelineStage value types from contracts/src/contracts/common.py
 * that it uses.
 *
 * Keep field names/shapes identical to the Pydantic models. Update this
 * file in the same PR as any contracts/ change (see CONTRIBUTING.md).
 */

export type JobStatus = "pending" | "running" | "completed" | "failed";
export type PipelineStage = "ingestion" | "financials" | "director_features" | "scoring" | "done";

export interface JobError {
  stage: PipelineStage;
  message: string;
  retryable: boolean;
}

export interface AssessmentJob {
  job_id: string;
  company_number: string;
  status: JobStatus;
  stage: PipelineStage | null;
  error: JobError | null;
  created_at: string;
  updated_at: string;
}
