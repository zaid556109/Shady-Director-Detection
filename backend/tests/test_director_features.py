"""Tests for director_features module (graph, red flags, service)."""

from __future__ import annotations

from datetime import date
from typing import Any
import networkx as nx
import pytest

from contracts import (
    Address,
    ApplicantProfile,
    CompanyStatus,
    DirectorFeatureSet,
    FilingHistorySummary,
    OfficerSummary,
    RedFlag,
    Severity,
)
from app.director_features.graph import build_director_graph, normalize_address
from app.director_features.red_flags import (
    detect_disqualification_flags,
    detect_dissolved_company_flags,
    detect_filing_lateness_flags,
    detect_shared_address_flags,
)
from app.director_features.service import build_features


class DummyCHClient:
    """Mock CompaniesHouseClient for unit testing graph building without network calls."""

    def __init__(self, appointments_map: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.appointments_map = appointments_map or {}

    async def fetch_officer_appointments(self, officer_id: str) -> list[dict[str, Any]]:
        return self.appointments_map.get(officer_id, [])


@pytest.fixture
def base_address() -> Address:
    return Address(
        premises="10",
        address_line_1="Downing Street",
        locality="London",
        postal_code="SW1A 2AA",
        country="United Kingdom",
    )


@pytest.fixture
def simple_profile(base_address: Address) -> ApplicantProfile:
    return ApplicantProfile(
        company_number="01234567",
        company_name="TEST COMPANY LTD",
        status=CompanyStatus.ACTIVE,
        registered_address=base_address,
        officers=[
            OfficerSummary(
                officer_id="off-001",
                name="SMITH, John",
                role="director",
                appointed_on=date(2020, 1, 1),
            )
        ],
        filing_history=FilingHistorySummary(late_filings_count=0),
        accounts_overdue=False,
        data_completeness=1.0,
    )


@pytest.mark.anyio
async def test_build_director_graph_profile_only(simple_profile: ApplicantProfile) -> None:
    graph = await build_director_graph(simple_profile)
    assert isinstance(graph, nx.Graph)

    # Check company node
    assert "01234567" in graph
    assert graph.nodes["01234567"]["type"] == "company"
    assert graph.nodes["01234567"]["status"] == "active"

    # Check officer node & edge
    assert "off-001" in graph
    assert graph.nodes["off-001"]["type"] == "officer"
    assert graph.has_edge("off-001", "01234567")


@pytest.mark.anyio
async def test_build_director_graph_with_client(simple_profile: ApplicantProfile) -> None:
    appointments = {
        "off-001": [
            {
                "appointed_to": {
                    "company_number": "09999999",
                    "company_name": "DISSOLVED CO LTD",
                    "company_status": "dissolved",
                },
                "appointed_on": "2015-01-01",
                "resigned_on": "2018-01-01",
                "officer_role": "director",
            }
        ]
    }
    client = DummyCHClient(appointments)
    graph = await build_director_graph(simple_profile, client=client)  # type: ignore[arg-type]

    assert "09999999" in graph
    assert graph.nodes["09999999"]["status"] == "dissolved"
    assert graph.has_edge("off-001", "09999999")


@pytest.mark.anyio
async def test_officer_deduplication(base_address: Address) -> None:
    profile = ApplicantProfile(
        company_number="01234567",
        company_name="MERGE TEST LTD",
        status=CompanyStatus.ACTIVE,
        registered_address=base_address,
        officers=[
            OfficerSummary(officer_id="off-A", name="JOHN SMITH", role="director"),
            OfficerSummary(officer_id="off-B", name="John Smith", role="director"),
        ],
        filing_history=FilingHistorySummary(),
        accounts_overdue=False,
        data_completeness=1.0,
    )
    graph = await build_director_graph(profile)
    # Both officer_ids map to normalized key 'john smith' -> canonical id 'off-A'
    assert "off-A" in graph
    assert graph.nodes["off-A"]["name"] == "JOHN SMITH"


def test_detect_dissolved_company_flags(simple_profile: ApplicantProfile) -> None:
    G = nx.Graph()
    G.add_node("01234567", type="company", status="active")
    G.add_node("off-001", type="officer")

    # 1 dissolved company -> 0 flags
    G.add_node("dis-1", type="company", status="dissolved")
    G.add_edge("off-001", "01234567")
    G.add_edge("off-001", "dis-1")
    assert len(detect_dissolved_company_flags(simple_profile, G)) == 0

    # 2 dissolved companies -> Warning flag
    G.add_node("dis-2", type="company", status="dissolved")
    G.add_edge("off-001", "dis-2")
    flags_2 = detect_dissolved_company_flags(simple_profile, G)
    assert len(flags_2) == 1
    assert flags_2[0].severity == Severity.WARNING
    assert flags_2[0].id == "dissolved-companies-2"

    # 4 dissolved companies -> Critical flag
    G.add_node("dis-3", type="company", status="dissolved")
    G.add_node("dis-4", type="company", status="dissolved")
    G.add_edge("off-001", "dis-3")
    G.add_edge("off-001", "dis-4")
    flags_4 = detect_dissolved_company_flags(simple_profile, G)
    assert len(flags_4) == 1
    assert flags_4[0].severity == Severity.CRITICAL
    assert flags_4[0].id == "dissolved-companies-4"


def test_detect_disqualification_flags(simple_profile: ApplicantProfile) -> None:
    G = nx.Graph()
    G.add_node("01234567", type="company")
    G.add_node("off-001", type="officer", disqualified=False)
    G.add_edge("off-001", "01234567")

    assert len(detect_disqualification_flags(simple_profile, G)) == 0

    G.nodes["off-001"]["disqualified"] = True
    flags = detect_disqualification_flags(simple_profile, G)
    assert len(flags) == 1
    assert flags[0].severity == Severity.CRITICAL
    assert "disqualified-director-off-001" in flags[0].id


def test_detect_shared_address_flags(simple_profile: ApplicantProfile, base_address: Address) -> None:
    G = nx.Graph()

    # 4 companies at address -> 0 flags
    for i in range(4):
        G.add_node(f"comp-{i}", type="company", registered_address=base_address)

    assert len(detect_shared_address_flags(simple_profile, G)) == 0

    # 5 companies -> Warning flag
    G.add_node("comp-4", type="company", registered_address=base_address)
    flags_5 = detect_shared_address_flags(simple_profile, G)
    assert len(flags_5) == 1
    assert flags_5[0].severity == Severity.WARNING

    # 15 companies -> Critical flag
    for i in range(5, 15):
        G.add_node(f"comp-{i}", type="company", registered_address=base_address)
    flags_15 = detect_shared_address_flags(simple_profile, G)
    assert len(flags_15) == 1
    assert flags_15[0].severity == Severity.CRITICAL


def test_detect_filing_lateness_flags(simple_profile: ApplicantProfile) -> None:
    # 0 late filings, not overdue
    assert len(detect_filing_lateness_flags(simple_profile)) == 0

    # 1 late filing -> Info
    simple_profile.filing_history.late_filings_count = 1
    flags_1 = detect_filing_lateness_flags(simple_profile)
    assert len(flags_1) == 1
    assert flags_1[0].severity == Severity.INFO
    assert flags_1[0].id == "late-filings-1"

    # 2 late filings -> Warning
    simple_profile.filing_history.late_filings_count = 2
    flags_2 = detect_filing_lateness_flags(simple_profile)
    assert len(flags_2) == 1
    assert flags_2[0].severity == Severity.WARNING

    # Accounts overdue -> Critical
    simple_profile.accounts_overdue = True
    flags_overdue = detect_filing_lateness_flags(simple_profile)
    overdue_flag = next((f for f in flags_overdue if f.id == "accounts-overdue"), None)
    assert overdue_flag is not None
    assert overdue_flag.severity == Severity.CRITICAL


@pytest.mark.anyio
async def test_build_features_end_to_end(base_address: Address) -> None:
    profile = ApplicantProfile(
        company_number="07654321",
        company_name="RISKY SME LTD",
        status=CompanyStatus.ACTIVE,
        registered_address=base_address,
        officers=[
            OfficerSummary(
                officer_id="off-risky-001",
                name="DOE, Jane",
                role="director",
                appointed_on=date(2021, 5, 1),
            )
        ],
        filing_history=FilingHistorySummary(late_filings_count=2),
        accounts_overdue=True,
        data_completeness=0.9,
    )

    appointments = {
        "off-risky-001": [
            {
                "appointed_to": {
                    "company_number": "00000001",
                    "company_name": "FAILED 1 LTD",
                    "company_status": "dissolved",
                },
                "appointed_on": "2018-01-01",
                "resigned_on": "2020-01-01",
            },
            {
                "appointed_to": {
                    "company_number": "00000002",
                    "company_name": "FAILED 2 LTD",
                    "company_status": "dissolved",
                },
                "appointed_on": "2019-01-01",
                "resigned_on": "2021-01-01",
            },
        ]
    }

    client = DummyCHClient(appointments)
    features, flags = await build_features(profile, client=client)  # type: ignore[arg-type]

    # Validate output models against Pydantic contracts
    assert isinstance(features, DirectorFeatureSet)
    assert features.company_number == "07654321"
    assert features.aggregates.officer_count == 1
    assert features.aggregates.max_dissolved_company_count == 2
    assert len(features.officers) == 1
    assert features.officers[0].appointments_count == 3  # target + 2 external

    # Check flags returned
    flag_ids = [f.id for f in flags]
    assert "dissolved-companies-2" in flag_ids
    assert "accounts-overdue" in flag_ids
    assert "late-filings-2" in flag_ids
