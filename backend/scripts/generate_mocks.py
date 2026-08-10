#!/usr/bin/env python
"""Generate the 3 mock company scenarios under /mocks.

Building instances through the Pydantic models (rather than hand-writing
JSON) means these files are guaranteed to validate against
backend/tests/test_contracts.py the moment they're written — if a contract
field is renamed, this script fails loudly instead of silently producing
stale fixtures.

Run via `make generate-mocks` after any change to contracts/ or to the
scenarios defined here. Every module stub in backend/app/*/service.py loads
from the output of this script (see app/utils/mock_loader.py).
"""

from __future__ import annotations

import json
from datetime import datetime
from pathlib import Path
from typing import Any

from app.contracts import (
    ApplicantProfile,
    AssessmentJob,
    DirectorFeatureSet,
    FinancialExtract,
    RatioSet,
    RedFlag,
    ScoreBreakdown,
)

MOCKS_DIR = Path(__file__).resolve().parents[2] / "mocks"
GENERATED_AT = datetime(2026, 8, 10, 12, 0, 0)


def healthy_plc() -> dict[str, Any]:
    company_number = "01234567"
    profile = ApplicantProfile.model_validate(
        {
            "company_number": company_number,
            "company_name": "HEALTHY EXAMPLE PLC",
            "status": "active",
            "incorporation_date": "2005-03-11",
            "sic_codes": ["62012", "62020"],
            "registered_address": {
                "premises": "1",
                "address_line_1": "High Street",
                "address_line_2": None,
                "locality": "London",
                "region": None,
                "postal_code": "EC1A 1AA",
                "country": "England",
            },
            "officers": [
                {
                    "officer_id": "off-healthy-001",
                    "name": "SMITH, John Michael",
                    "role": "director",
                    "appointed_on": "2015-06-01",
                    "resigned_on": None,
                    "nationality": "British",
                    "occupation": "Company Director",
                },
                {
                    "officer_id": "off-healthy-002",
                    "name": "JONES, Sarah Elizabeth",
                    "role": "director",
                    "appointed_on": "2018-01-15",
                    "resigned_on": None,
                    "nationality": "British",
                    "occupation": "Company Director",
                },
            ],
            "filing_history": {
                "last_accounts_made_up_to": "2024-03-31",
                "next_accounts_due_on": "2025-12-31",
                "last_confirmation_statement_date": "2024-06-01",
                "total_filings": 24,
                "late_filings_count": 0,
            },
            "accounts_overdue": False,
            "data_completeness": 0.98,
        }
    )

    extracts = [
        FinancialExtract.model_validate(
            {
                "company_number": company_number,
                "filing_year": 2024,
                "period_start": "2023-04-01",
                "period_end": "2024-03-31",
                "currency": "GBP",
                "source_format": "ixbrl",
                "extraction_confidence": 0.98,
                "balance_sheet": {
                    "fixed_assets": 250000.0,
                    "current_assets": 540000.0,
                    "cash": 300000.0,
                    "current_liabilities": 180000.0,
                    "long_term_liabilities": 60000.0,
                    "net_assets": 550000.0,
                    "shareholder_funds": 550000.0,
                },
                "profit_and_loss": {
                    "turnover": 2100000.0,
                    "gross_profit": 900000.0,
                    "operating_profit": 480000.0,
                    "profit_before_tax": 460000.0,
                    "profit_after_tax": 368000.0,
                },
            }
        ),
        FinancialExtract.model_validate(
            {
                "company_number": company_number,
                "filing_year": 2023,
                "period_start": "2022-04-01",
                "period_end": "2023-03-31",
                "currency": "GBP",
                "source_format": "ixbrl",
                "extraction_confidence": 0.97,
                "balance_sheet": {
                    "fixed_assets": 230000.0,
                    "current_assets": 460000.0,
                    "cash": 250000.0,
                    "current_liabilities": 170000.0,
                    "long_term_liabilities": 70000.0,
                    "net_assets": 450000.0,
                    "shareholder_funds": 450000.0,
                },
                "profit_and_loss": {
                    "turnover": 1800000.0,
                    "gross_profit": 760000.0,
                    "operating_profit": 390000.0,
                    "profit_before_tax": 370000.0,
                    "profit_after_tax": 296000.0,
                },
            }
        ),
    ]

    ratios = RatioSet.model_validate(
        {
            "company_number": company_number,
            "filing_year": 2024,
            "current_ratio": {"value": 3.0, "computable": True, "reason": None},
            "gearing": {"value": 0.44, "computable": True, "reason": None},
            "net_assets": {"value": 550000.0, "computable": True, "reason": None},
            "altman_z": {"value": 4.8, "computable": True, "reason": None},
            "yoy_trends": [
                {"metric": "net_assets", "direction": "improving", "delta_pct": 22.2},
                {"metric": "turnover", "direction": "improving", "delta_pct": 16.7},
            ],
        }
    )

    features = DirectorFeatureSet.model_validate(
        {
            "company_number": company_number,
            "officers": [
                {
                    "officer_id": "off-healthy-001",
                    "appointments_count": 2,
                    "dissolved_company_count": 0,
                    "disqualification_flag": False,
                    "avg_tenure_days": 3285.0,
                    "shared_address_cluster_size": 1,
                },
                {
                    "officer_id": "off-healthy-002",
                    "appointments_count": 1,
                    "dissolved_company_count": 0,
                    "disqualification_flag": False,
                    "avg_tenure_days": 2500.0,
                    "shared_address_cluster_size": 1,
                },
            ],
            "aggregates": {
                "officer_count": 2,
                "max_dissolved_company_count": 0,
                "any_disqualified": False,
                "max_shared_address_cluster_size": 1,
                "min_avg_tenure_days": 2500.0,
            },
        }
    )

    flags: list[RedFlag] = []

    breakdown = ScoreBreakdown.model_validate(
        {
            "company_number": company_number,
            "total": 91,
            "cluster_subscores": {"governance": 95.0, "financial": 88.0},
            "feature_contributions": [
                {"feature_name": "current_ratio", "weight": 0.15, "points": 14.0},
                {"feature_name": "gearing", "weight": 0.15, "points": 10.0},
                {"feature_name": "net_assets", "weight": 0.10, "points": 9.0},
                {"feature_name": "altman_z", "weight": 0.10, "points": 9.0},
                {"feature_name": "disqualification_flag", "weight": 0.25, "points": 25.0},
                {"feature_name": "dissolved_company_count", "weight": 0.15, "points": 15.0},
                {"feature_name": "shared_address_cluster_size", "weight": 0.10, "points": 9.0},
            ],
            "flags": [],
            "explanation": (
                "Strong current ratio (3.0x) and a clean history across both directors support a "
                "high reliability score; gearing is moderate but well within a comfortable range."
            ),
            "generated_at": GENERATED_AT,
        }
    )

    job = AssessmentJob.model_validate(
        {
            "job_id": "11111111-1111-4111-8111-111111111111",
            "company_number": company_number,
            "status": "completed",
            "stage": "done",
            "error": None,
            "created_at": GENERATED_AT,
            "updated_at": GENERATED_AT,
        }
    )

    return {
        "applicant_profile.json": profile,
        "financial_extracts.json": extracts,
        "ratio_set.json": ratios,
        "director_feature_set.json": features,
        "red_flags.json": flags,
        "score_breakdown.json": breakdown,
        "assessment_job.json": job,
    }


def risky_sme() -> dict[str, Any]:
    company_number = "07654321"
    profile = ApplicantProfile.model_validate(
        {
            "company_number": company_number,
            "company_name": "RISKY EXAMPLE LIMITED",
            "status": "active",
            "incorporation_date": "2016-09-01",
            "sic_codes": ["46900"],
            "registered_address": {
                "premises": "Unit 4",
                "address_line_1": "Industrial Estate",
                "address_line_2": None,
                "locality": "Birmingham",
                "region": None,
                "postal_code": "B1 1AA",
                "country": "England",
            },
            "officers": [
                {
                    "officer_id": "off-risky-001",
                    "name": "BROWN, David Alan",
                    "role": "director",
                    "appointed_on": "2016-09-01",
                    "resigned_on": None,
                    "nationality": "British",
                    "occupation": "Company Director",
                }
            ],
            "filing_history": {
                "last_accounts_made_up_to": "2023-01-31",
                "next_accounts_due_on": "2024-10-31",
                "last_confirmation_statement_date": "2023-09-01",
                "total_filings": 8,
                "late_filings_count": 3,
            },
            "accounts_overdue": True,
            "data_completeness": 0.80,
        }
    )

    extracts = [
        FinancialExtract.model_validate(
            {
                "company_number": company_number,
                "filing_year": 2023,
                "period_start": "2022-02-01",
                "period_end": "2023-01-31",
                "currency": "GBP",
                "source_format": "ixbrl",
                "extraction_confidence": 0.75,
                "balance_sheet": {
                    "fixed_assets": 40000.0,
                    "current_assets": 60000.0,
                    "cash": 5000.0,
                    "current_liabilities": 95000.0,
                    "long_term_liabilities": 30000.0,
                    "net_assets": -25000.0,
                    "shareholder_funds": -25000.0,
                },
                "profit_and_loss": {
                    "turnover": 320000.0,
                    "gross_profit": 60000.0,
                    "operating_profit": -18000.0,
                    "profit_before_tax": -22000.0,
                    "profit_after_tax": -22000.0,
                },
            }
        )
    ]

    ratios = RatioSet.model_validate(
        {
            "company_number": company_number,
            "filing_year": 2023,
            "current_ratio": {"value": 0.63, "computable": True, "reason": None},
            "gearing": {"value": -5.0, "computable": True, "reason": None},
            "net_assets": {"value": -25000.0, "computable": True, "reason": None},
            "altman_z": {"value": 1.1, "computable": True, "reason": None},
            "yoy_trends": [],
        }
    )

    features = DirectorFeatureSet.model_validate(
        {
            "company_number": company_number,
            "officers": [
                {
                    "officer_id": "off-risky-001",
                    "appointments_count": 5,
                    "dissolved_company_count": 2,
                    "disqualification_flag": False,
                    "avg_tenure_days": 620.0,
                    "shared_address_cluster_size": 3,
                }
            ],
            "aggregates": {
                "officer_count": 1,
                "max_dissolved_company_count": 2,
                "any_disqualified": False,
                "max_shared_address_cluster_size": 3,
                "min_avg_tenure_days": 620.0,
            },
        }
    )

    flags = [
        RedFlag.model_validate(
            {
                "id": "dissolved-companies-2",
                "severity": "warning",
                "category": "governance",
                "evidence": [
                    {
                        "source_type": "officer",
                        "source_id": "off-risky-001",
                        "detail": "2 dissolved companies in the last 5 years",
                    }
                ],
                "human_label": "A director has 2 previously dissolved companies",
            }
        ),
        RedFlag.model_validate(
            {
                "id": "accounts-overdue",
                "severity": "critical",
                "category": "filing",
                "evidence": [
                    {
                        "source_type": "filing",
                        "source_id": f"{company_number}-accounts-2024",
                        "detail": "Accounts due 2024-10-31, not yet filed",
                    }
                ],
                "human_label": "Statutory accounts are overdue",
            }
        ),
        RedFlag.model_validate(
            {
                "id": "negative-equity",
                "severity": "critical",
                "category": "financial",
                "evidence": [
                    {
                        "source_type": "filing",
                        "source_id": f"{company_number}-accounts-2023",
                        "detail": "Net assets -25,000 GBP as at 2023-01-31",
                    }
                ],
                "human_label": "Company has negative net assets (negative equity)",
            }
        ),
    ]

    breakdown = ScoreBreakdown.model_validate(
        {
            "company_number": company_number,
            "total": 28,
            "cluster_subscores": {"governance": 35.0, "financial": 22.0},
            "feature_contributions": [
                {"feature_name": "current_ratio", "weight": 0.15, "points": 3.0},
                {"feature_name": "gearing", "weight": 0.15, "points": 1.0},
                {"feature_name": "net_assets", "weight": 0.10, "points": 0.0},
                {"feature_name": "altman_z", "weight": 0.10, "points": 2.0},
                {"feature_name": "disqualification_flag", "weight": 0.25, "points": 25.0},
                {"feature_name": "dissolved_company_count", "weight": 0.15, "points": -6.0},
                {"feature_name": "shared_address_cluster_size", "weight": 0.10, "points": 3.0},
            ],
            "flags": [f.model_dump(mode="json") for f in flags],
            "explanation": (
                "Negative equity, overdue accounts, and a director with two previously dissolved "
                "companies drive a low reliability score despite no active disqualifications."
            ),
            "generated_at": GENERATED_AT,
        }
    )

    job = AssessmentJob.model_validate(
        {
            "job_id": "22222222-2222-4222-8222-222222222222",
            "company_number": company_number,
            "status": "completed",
            "stage": "done",
            "error": None,
            "created_at": GENERATED_AT,
            "updated_at": GENERATED_AT,
        }
    )

    return {
        "applicant_profile.json": profile,
        "financial_extracts.json": extracts,
        "ratio_set.json": ratios,
        "director_feature_set.json": features,
        "red_flags.json": flags,
        "score_breakdown.json": breakdown,
        "assessment_job.json": job,
    }


def sparse_micro() -> dict[str, Any]:
    company_number = "09999999"
    profile = ApplicantProfile.model_validate(
        {
            "company_number": company_number,
            "company_name": "SPARSE MICRO ENTITY LTD",
            "status": "active",
            "incorporation_date": "2021-11-20",
            "sic_codes": ["96090"],
            "registered_address": {
                "premises": "12",
                "address_line_1": "Formation Row",
                "address_line_2": None,
                "locality": "Cardiff",
                "region": None,
                "postal_code": "CF1 1AA",
                "country": "Wales",
            },
            "officers": [
                {
                    "officer_id": "off-sparse-001",
                    "name": "PATEL, Amir",
                    "role": "director",
                    "appointed_on": "2021-11-20",
                    "resigned_on": None,
                    "nationality": "British",
                    "occupation": "Director",
                }
            ],
            "filing_history": {
                "last_accounts_made_up_to": "2024-11-30",
                "next_accounts_due_on": "2025-08-31",
                "last_confirmation_statement_date": "2024-12-01",
                "total_filings": 3,
                "late_filings_count": 0,
            },
            "accounts_overdue": False,
            "data_completeness": 0.55,
        }
    )

    extracts = [
        FinancialExtract.model_validate(
            {
                "company_number": company_number,
                "filing_year": 2024,
                "period_start": "2023-12-01",
                "period_end": "2024-11-30",
                "currency": "GBP",
                "source_format": "ixbrl",
                "extraction_confidence": 0.6,
                "balance_sheet": {
                    "fixed_assets": None,
                    "current_assets": None,
                    "cash": None,
                    "current_liabilities": None,
                    "long_term_liabilities": None,
                    "net_assets": 8500.0,
                    "shareholder_funds": 8500.0,
                },
                "profit_and_loss": {
                    "turnover": None,
                    "gross_profit": None,
                    "operating_profit": None,
                    "profit_before_tax": None,
                    "profit_after_tax": None,
                },
            }
        )
    ]

    ratios = RatioSet.model_validate(
        {
            "company_number": company_number,
            "filing_year": 2024,
            "current_ratio": {
                "value": None,
                "computable": False,
                "reason": "current_assets and current_liabilities not filed (micro-entity exemption)",
            },
            "gearing": {
                "value": None,
                "computable": False,
                "reason": "liabilities breakdown not filed (micro-entity exemption)",
            },
            "net_assets": {"value": 8500.0, "computable": True, "reason": None},
            "altman_z": {
                "value": None,
                "computable": False,
                "reason": "insufficient line items filed to compute Altman Z (no P&L filed)",
            },
            "yoy_trends": [],
        }
    )

    features = DirectorFeatureSet.model_validate(
        {
            "company_number": company_number,
            "officers": [
                {
                    "officer_id": "off-sparse-001",
                    "appointments_count": 1,
                    "dissolved_company_count": 0,
                    "disqualification_flag": False,
                    "avg_tenure_days": 1000.0,
                    "shared_address_cluster_size": 1,
                }
            ],
            "aggregates": {
                "officer_count": 1,
                "max_dissolved_company_count": 0,
                "any_disqualified": False,
                "max_shared_address_cluster_size": 1,
                "min_avg_tenure_days": 1000.0,
            },
        }
    )

    flags: list[RedFlag] = []

    breakdown = ScoreBreakdown.model_validate(
        {
            "company_number": company_number,
            "total": 58,
            "cluster_subscores": {"governance": 70.0, "financial": 45.0},
            "feature_contributions": [
                {"feature_name": "current_ratio", "weight": 0.15, "points": 0.0},
                {"feature_name": "gearing", "weight": 0.15, "points": 0.0},
                {"feature_name": "net_assets", "weight": 0.10, "points": 8.0},
                {"feature_name": "altman_z", "weight": 0.10, "points": 0.0},
                {"feature_name": "disqualification_flag", "weight": 0.25, "points": 25.0},
                {"feature_name": "dissolved_company_count", "weight": 0.15, "points": 15.0},
                {"feature_name": "shared_address_cluster_size", "weight": 0.10, "points": 10.0},
            ],
            "flags": [],
            "explanation": (
                "Clean director history supports the score, but minimal micro-entity accounts leave "
                "most financial ratios uncomputable, capping confidence at a mid-range result."
            ),
            "generated_at": GENERATED_AT,
        }
    )

    job = AssessmentJob.model_validate(
        {
            "job_id": "33333333-3333-4333-8333-333333333333",
            "company_number": company_number,
            "status": "completed",
            "stage": "done",
            "error": None,
            "created_at": GENERATED_AT,
            "updated_at": GENERATED_AT,
        }
    )

    return {
        "applicant_profile.json": profile,
        "financial_extracts.json": extracts,
        "ratio_set.json": ratios,
        "director_feature_set.json": features,
        "red_flags.json": flags,
        "score_breakdown.json": breakdown,
        "assessment_job.json": job,
    }


SCENARIOS = {
    "healthy_plc": healthy_plc,
    "risky_sme": risky_sme,
    "sparse_micro": sparse_micro,
}


def _dump(obj: Any) -> Any:
    if isinstance(obj, list):
        return [item.model_dump(mode="json") for item in obj]
    return obj.model_dump(mode="json")


def main() -> None:
    for scenario_name, build in SCENARIOS.items():
        out_dir = MOCKS_DIR / scenario_name
        out_dir.mkdir(parents=True, exist_ok=True)
        for filename, obj in build().items():
            path = out_dir / filename
            path.write_text(json.dumps(_dump(obj), indent=2, sort_keys=True) + "\n")
            print(f"wrote {path.relative_to(MOCKS_DIR.parent)}")


if __name__ == "__main__":
    main()
