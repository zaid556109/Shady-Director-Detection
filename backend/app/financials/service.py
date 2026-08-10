"""Public entrypoints for the financials module.

`extract_financials` and `compute_ratios` are what `director_features`,
`scoring`, and the pipeline import. Both currently return mock data; wiring
in app.financials.parser / app.financials.ratios is Person 2's task and
should not change either signature.
"""

from __future__ import annotations

from app.contracts import ApplicantProfile, FinancialExtract, RatioSet
from app.utils.mock_loader import load_mock_model, load_mock_model_list, resolve_scenario


def extract_financials(profile: ApplicantProfile) -> list[FinancialExtract]:
    """Parse every filed accounts document for `profile` into FinancialExtracts.

    Real implementation (Person 2, TODO): for each accounts filing in
    `profile.filing_history`, fetch the document (app.ingestion.client) and
    call `app.financials.parser.parse_ixbrl_document`, falling back to
    `source_format=SourceFormat.PDF_SCANNED` (empty line items,
    extraction_confidence=0.0) when the filing isn't iXBRL.

    Mock implementation (current): loads
    `mocks/<scenario>/financial_extracts.json` (a JSON array, one entry per
    filing year) for the scenario resolved from `profile.company_number`.
    """
    scenario = resolve_scenario(profile.company_number)
    return load_mock_model_list(scenario, "financial_extracts.json", FinancialExtract)


def compute_ratios(extracts: list[FinancialExtract]) -> RatioSet:
    """Compute a RatioSet from one or more years of FinancialExtracts.

    Real implementation (Person 2, TODO): use the most recent extract for
    point-in-time ratios (app.financials.ratios.*) and compare against the
    prior year (if present) for `yoy_trends`.

    Mock implementation (current): loads
    `mocks/<scenario>/ratio_set.json` for the scenario resolved from the
    most recent extract's `company_number`.
    """
    if not extracts:
        raise ValueError("compute_ratios requires at least one FinancialExtract")
    scenario = resolve_scenario(extracts[0].company_number)
    return load_mock_model(scenario, "ratio_set.json", RatioSet)
