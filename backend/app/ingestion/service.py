"""Public entrypoint for the ingestion module.

`build_applicant_profile` is the one function every other module depends
on. Today it returns mock data so the pipeline works end-to-end; swapping
in real Companies House calls (via app.ingestion.client) should not require
changing this signature.
"""

from __future__ import annotations

from app.contracts import ApplicantProfile
from app.utils.mock_loader import load_mock_model, resolve_scenario


def build_applicant_profile(company_number: str) -> ApplicantProfile:
    """Assemble a normalized ApplicantProfile for `company_number`.

    Real implementation (Person 1, TODO): call
    `CompaniesHouseClient.fetch_company_profile` +
    `.fetch_officers` + `.fetch_filing_history`, normalize into
    ApplicantProfile, and set `data_completeness` based on how many
    expected fields CH actually returned.

    Mock implementation (current): loads
    `mocks/<scenario>/applicant_profile.json` where the scenario is
    resolved from `company_number` (see app.utils.mock_loader).
    """
    scenario = resolve_scenario(company_number)
    profile = load_mock_model(scenario, "applicant_profile.json", ApplicantProfile)
    return profile
