"""Public entrypoint for the ingestion module.

`build_applicant_profile` is the one function every other module depends
on. Real implementation: calls CompaniesHouseClient methods and normalizes
into ApplicantProfile.
"""

from __future__ import annotations

from datetime import date

from contracts import Address, ApplicantProfile, CompanyStatus, FilingHistorySummary, OfficerSummary

from app.ingestion.client import CompaniesHouseClient


def _map_status(raw_status: str) -> CompanyStatus:
    try:
        return CompanyStatus(raw_status)
    except ValueError:
        return CompanyStatus.OTHER


def _map_address(raw: dict) -> Address:
    return Address(
        premises=raw.get("premises"),
        address_line_1=raw.get("address_line_1"),
        address_line_2=raw.get("address_line_2"),
        locality=raw.get("locality"),
        region=raw.get("region"),
        postal_code=raw.get("postal_code"),
        country=raw.get("country", "United Kingdom"),
    )


def _map_officers(raw_officers: list[dict]) -> list[OfficerSummary]:
    officers = []
    for o in raw_officers:
        appt_link = o.get("links", {}).get("officer", {}).get("appointments", "")
        officer_id = appt_link.rstrip("/").split("/")[-2] if appt_link else ""
        officers.append(
            OfficerSummary(
                officer_id=officer_id,
                name=o.get("name", ""),
                role=o.get("officer_role", ""),
                appointed_on=o.get("appointed_on"),
                resigned_on=o.get("resigned_on"),
                nationality=o.get("nationality"),
                occupation=o.get("occupation"),
            )
        )
    return officers


def _extract_made_up_date(filing: dict) -> str | None:
    """Prefer the real period/statement end date from description_values
    (e.g. 'made_up_date') over the filing submission date, since CH's top
    level `date` field is when it was FILED, not the period it covers.
    Falls back to the filing date if description_values doesn't have it —
    older or sparse filings sometimes omit description_values entirely.
    """
    description_values = filing.get("description_values") or {}
    made_up_date = description_values.get("made_up_date")
    if made_up_date:
        return made_up_date
    return filing.get("date")


def _build_filing_summary(raw_profile: dict, raw_filings: list[dict]) -> FilingHistorySummary:
    # Sort newest-first defensively rather than trusting API order, so
    # "most recent" is always correct even if CH ever changes ordering.
    sorted_filings = sorted(raw_filings, key=lambda f: f.get("date") or "", reverse=True)

    accounts_filings = [f for f in sorted_filings if f.get("category") == "accounts"]
    confirmation_filings = [f for f in sorted_filings if f.get("category") == "confirmation-statement"]

    last_accounts = accounts_filings[0] if accounts_filings else None
    last_confirmation = confirmation_filings[0] if confirmation_filings else None

    late_count = sum(1 for f in raw_filings if "late" in (f.get("description") or "").lower())

    next_due = raw_profile.get("accounts", {}).get("next_due")

    return FilingHistorySummary(
        last_accounts_made_up_to=_extract_made_up_date(last_accounts) if last_accounts else None,
        next_accounts_due_on=next_due,
        last_confirmation_statement_date=_extract_made_up_date(last_confirmation) if last_confirmation else None,
        total_filings=len(raw_filings),
        late_filings_count=late_count,
    )


def _compute_completeness(profile: dict, officers: list, filings: list) -> float:
    expected_fields = ["company_name", "company_status", "date_of_creation", "sic_codes", "registered_office_address"]
    present = sum(1 for f in expected_fields if profile.get(f))
    score = present / len(expected_fields)
    if not officers:
        score *= 0.9
    if not filings:
        score *= 0.9
    return round(score, 2)


async def build_applicant_profile(company_number: str, client: CompaniesHouseClient) -> ApplicantProfile:
    """Assemble a normalized ApplicantProfile for `company_number` using live CH data."""

    raw_profile = await client.fetch_company_profile(company_number)
    raw_officers = await client.fetch_officers(company_number)
    raw_filings = await client.fetch_filing_history(company_number)

    filing_summary = _build_filing_summary(raw_profile, raw_filings)

    accounts_overdue = False
    if filing_summary.next_accounts_due_on:
        accounts_overdue = filing_summary.next_accounts_due_on < date.today()

    return ApplicantProfile(
        company_number=company_number,
        company_name=raw_profile.get("company_name", ""),
        status=_map_status(raw_profile.get("company_status", "")),
        incorporation_date=raw_profile.get("date_of_creation"),
        sic_codes=raw_profile.get("sic_codes", []),
        registered_address=_map_address(raw_profile.get("registered_office_address", {})),
        officers=_map_officers(raw_officers),
        filing_history=filing_summary,
        accounts_overdue=accounts_overdue,
        data_completeness=_compute_completeness(raw_profile, raw_officers, raw_filings),
    )