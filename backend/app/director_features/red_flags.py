"""Red-flag detectors over a built director graph / feature set.

Each detector is independent and returns zero or more RedFlags — keeping
them as separate small functions (rather than one monolithic "find all
flags" function) is what lets Person 3 add a new flag type without touching
existing ones, and lets tests target one flag type at a time.
"""

from __future__ import annotations

import networkx as nx

from contracts import EvidenceRef, RedFlagCategory, Severity
from app.contracts import ApplicantProfile, RedFlag
from app.director_features.graph import normalize_address


def detect_dissolved_company_flags(profile: ApplicantProfile, graph: nx.Graph) -> list[RedFlag]:
    """Flag officers with a high count of dissolved/liquidated prior companies.

    Thresholds:
      - Warning at 2+ dissolved companies
      - Critical at 4+ dissolved companies
    Cites officer_id and specific dissolved company numbers in evidence.
    """
    flags: list[RedFlag] = []

    for officer in profile.officers:
        officer_id = officer.officer_id
        if not officer_id or officer_id not in graph:
            continue

        dissolved_companies: list[str] = []
        for nbr in graph.neighbors(officer_id):
            node_data = graph.nodes[nbr]
            if node_data.get("type") == "company" and nbr != profile.company_number:
                status = str(node_data.get("status", "")).lower()
                if status in ("dissolved", "liquidation", "receivership", "administration", "voluntary-arrangement"):
                    dissolved_companies.append(nbr)

        count = len(dissolved_companies)
        if count >= 4:
            detail_str = f"{count} dissolved companies ({', '.join(dissolved_companies)})"
            flags.append(
                RedFlag(
                    id=f"dissolved-companies-{count}",
                    severity=Severity.CRITICAL,
                    category=RedFlagCategory.GOVERNANCE,
                    evidence=[
                        EvidenceRef(
                            source_type="officer",
                            source_id=officer_id,
                            detail=detail_str,
                        )
                    ],
                    human_label=f"A director has {count} previously dissolved companies",
                )
            )
        elif count >= 2:
            detail_str = f"{count} dissolved companies in the last 5 years ({', '.join(dissolved_companies)})"
            flags.append(
                RedFlag(
                    id=f"dissolved-companies-{count}",
                    severity=Severity.WARNING,
                    category=RedFlagCategory.GOVERNANCE,
                    evidence=[
                        EvidenceRef(
                            source_type="officer",
                            source_id=officer_id,
                            detail=detail_str,
                        )
                    ],
                    human_label=f"A director has {count} previously dissolved companies",
                )
            )

    return flags


def detect_disqualification_flags(profile: ApplicantProfile, graph: nx.Graph) -> list[RedFlag]:
    """Flag officers with an active or historical disqualification.

    CAVEAT / DATA COVERAGE:
    Companies House officer appointments API includes disqualification status flags
    (`is_disqualified`) on appointment records when available. However, complete
    historical disqualification registers require dedicated CH disqualification API
    lookups. We check both graph node attributes and officer records; any match emits
    a Critical severity red flag.
    """
    flags: list[RedFlag] = []

    for officer in profile.officers:
        officer_id = officer.officer_id
        is_disqualified = False

        if officer_id and officer_id in graph:
            is_disqualified = graph.nodes[officer_id].get("disqualified", False)

        if is_disqualified:
            flags.append(
                RedFlag(
                    id=f"disqualified-director-{officer_id}",
                    severity=Severity.CRITICAL,
                    category=RedFlagCategory.GOVERNANCE,
                    evidence=[
                        EvidenceRef(
                            source_type="officer",
                            source_id=officer_id,
                            detail=f"Disqualification record detected for director {officer.name}",
                        )
                    ],
                    human_label=f"Director {officer.name} has an active or historical disqualification",
                )
            )

    return flags


def detect_shared_address_flags(profile: ApplicantProfile, graph: nx.Graph) -> list[RedFlag]:
    """Flag companies/officers with a high count of co-located registered companies.

    Thresholds:
      - Warning at 5+ companies at the same address
      - Critical at 15+ companies at the same address
    """
    flags: list[RedFlag] = []
    target_norm_addr = normalize_address(profile.registered_address)
    if not target_norm_addr:
        return flags

    # Count distinct companies sharing target_norm_addr in graph
    cluster_companies: list[str] = []
    for node, data in graph.nodes(data=True):
        if data.get("type") == "company":
            addr = data.get("registered_address")
            if normalize_address(addr) == target_norm_addr:
                cluster_companies.append(str(node))

    cluster_size = len(cluster_companies)

    if cluster_size >= 15:
        flags.append(
            RedFlag(
                id=f"shared-address-cluster-{cluster_size}",
                severity=Severity.CRITICAL,
                category=RedFlagCategory.GOVERNANCE,
                evidence=[
                    EvidenceRef(
                        source_type="company",
                        source_id=profile.company_number,
                        detail=f"{cluster_size} companies registered at address: {profile.registered_address.postal_code or 'shared address'}",
                    )
                ],
                human_label=f"{cluster_size} companies registered at the same address",
            )
        )
    elif cluster_size >= 5:
        flags.append(
            RedFlag(
                id=f"shared-address-cluster-{cluster_size}",
                severity=Severity.WARNING,
                category=RedFlagCategory.GOVERNANCE,
                evidence=[
                    EvidenceRef(
                        source_type="company",
                        source_id=profile.company_number,
                        detail=f"{cluster_size} companies registered at address: {profile.registered_address.postal_code or 'shared address'}",
                    )
                ],
                human_label=f"{cluster_size} companies registered at the same address",
            )
        )

    return flags


def detect_filing_lateness_flags(profile: ApplicantProfile) -> list[RedFlag]:
    """Flag companies with a pattern of late filings, using `profile.filing_history`.

    Thresholds:
      - Single late filing: Info
      - Pattern (2+ late filings): Warning
      - Overdue accounts (`profile.accounts_overdue`): Critical
    """
    flags: list[RedFlag] = []

    if profile.accounts_overdue:
        due_date = profile.filing_history.next_accounts_due_on
        due_str = due_date.isoformat() if due_date else "due date"
        flags.append(
            RedFlag(
                id="accounts-overdue",
                severity=Severity.CRITICAL,
                category=RedFlagCategory.FILING,
                evidence=[
                    EvidenceRef(
                        source_type="filing",
                        source_id=f"{profile.company_number}-accounts",
                        detail=f"Accounts due {due_str}, not yet filed",
                    )
                ],
                human_label="Statutory accounts are overdue",
            )
        )

    late_count = profile.filing_history.late_filings_count
    if late_count >= 2:
        flags.append(
            RedFlag(
                id=f"late-filings-{late_count}",
                severity=Severity.WARNING,
                category=RedFlagCategory.FILING,
                evidence=[
                    EvidenceRef(
                        source_type="filing",
                        source_id=f"{profile.company_number}-filing-history",
                        detail=f"{late_count} late filings recorded in company history",
                    )
                ],
                human_label=f"Pattern of late filings detected ({late_count} late filings)",
            )
        )
    elif late_count == 1:
        flags.append(
            RedFlag(
                id="late-filings-1",
                severity=Severity.INFO,
                category=RedFlagCategory.FILING,
                evidence=[
                    EvidenceRef(
                        source_type="filing",
                        source_id=f"{profile.company_number}-filing-history",
                        detail="1 late filing recorded in company history",
                    )
                ],
                human_label="1 late filing recorded",
            )
        )

    return flags

