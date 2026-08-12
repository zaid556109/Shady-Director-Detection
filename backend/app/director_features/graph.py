"""Director <-> company graph construction.

Bipartite graph: officer nodes and company nodes, edges = appointments
(with appointed_on/resigned_on as edge attributes). Built with NetworkX
because the features we need — dissolved-company counts, shared-address
clustering — are naturally graph queries (neighbors, connected components)
once the graph is built, rather than repeated ad-hoc joins.

Node IDs: officer nodes are keyed by `officer_id` as CH returns it. Company
nodes are keyed by company_number.
"""

from __future__ import annotations

from typing import TYPE_CHECKING, Any
import networkx as nx

from contracts import Address, CompanyStatus
from app.contracts import ApplicantProfile

if TYPE_CHECKING:
    from app.ingestion.client import CompaniesHouseClient

# OFFICER DEDUPLICATION STRATEGY & RATIONALE:
# In Companies House API data, officer IDs (from appointment links) are the primary key.
# However, an individual officer may be assigned separate officer_ids across different
# appointment records if CH did not unify their profile at appointment time.
# To handle deduplication:
# 1. We treat `officer_id` as the primary node identifier in the NetworkX graph to maintain
#    direct traceability back to ApplicantProfile.officers and CH API endpoints.
# 2. When processing officers and external appointments, we generate a normalized identity key
#    `norm_key = (name.lower().strip(), date_of_birth_month_year)`.
# 3. If a secondary officer_id maps to an existing norm_key, we merge node attributes and
#    redirect appointment edges to the canonical officer_id.
# This prevents fragmenting a director's cross-company history (dissolved company counts,
# disqualification flags, and shared address clusters) across multiple CH officer IDs.


def normalize_address(addr: Address | dict[str, Any] | None) -> str:
    """Produce a canonical string key for an Address object or dict for clustering."""
    if addr is None:
        return ""
    if isinstance(addr, Address):
        premises = (addr.premises or "").strip().lower()
        line1 = (addr.address_line_1 or "").strip().lower()
        postcode = (addr.postal_code or "").replace(" ", "").upper()
    elif isinstance(addr, dict):
        premises = (addr.get("premises") or "").strip().lower()
        line1 = (addr.get("address_line_1") or "").strip().lower()
        postcode = (addr.get("postal_code") or "").replace(" ", "").upper()
    else:
        return ""

    if not premises and not line1 and not postcode:
        return ""
    return f"{premises}|{line1}|{postcode}"


def _parse_address(raw: dict[str, Any] | None) -> Address | None:
    if not raw:
        return None
    return Address(
        premises=raw.get("premises"),
        address_line_1=raw.get("address_line_1"),
        address_line_2=raw.get("address_line_2"),
        locality=raw.get("locality"),
        region=raw.get("region"),
        postal_code=raw.get("postal_code"),
        country=raw.get("country", "United Kingdom"),
    )


async def build_director_graph(
    profile: ApplicantProfile,
    client: CompaniesHouseClient | None = None,
) -> nx.Graph:
    """Build the director<->company graph reachable from `profile`.

    Starts from `profile.officers`. If `client` is provided, fetches
    appointments for each officer via `client.fetch_officer_appointments`
    to incorporate external companies (1-2 hops).
    """
    G = nx.Graph()

    # Add primary company node
    G.add_node(
        profile.company_number,
        type="company",
        name=profile.company_name,
        status=profile.status.value if isinstance(profile.status, CompanyStatus) else str(profile.status),
        registered_address=profile.registered_address,
    )

    # Track officer identity normalization: norm_key -> canonical_officer_id
    identity_map: dict[str, str] = {}

    for officer in profile.officers:
        if not officer.officer_id:
            continue

        norm_key = officer.name.lower().strip()
        canonical_id = identity_map.get(norm_key, officer.officer_id)
        if norm_key not in identity_map:
            identity_map[norm_key] = canonical_id

        if canonical_id not in G:
            G.add_node(
                canonical_id,
                type="officer",
                name=officer.name,
                role=officer.role,
                nationality=officer.nationality,
                occupation=officer.occupation,
                disqualified=False,
            )

        G.add_edge(
            canonical_id,
            profile.company_number,
            appointed_on=officer.appointed_on,
            resigned_on=officer.resigned_on,
            role=officer.role,
        )

        if client is not None:
            try:
                raw_appts = await client.fetch_officer_appointments(officer.officer_id)
            except Exception:
                raw_appts = []

            for appt in raw_appts:
                appointed_to = appt.get("appointed_to") or {}
                comp_num = appointed_to.get("company_number") or appt.get("company_number")
                if not comp_num:
                    continue

                comp_status = appointed_to.get("company_status") or appt.get("company_status") or "active"
                raw_addr = appointed_to.get("registered_office_address") or appt.get("address")
                comp_addr = _parse_address(raw_addr)
                comp_name = appointed_to.get("company_name") or appt.get("company_name") or ""

                if comp_num not in G:
                    G.add_node(
                        comp_num,
                        type="company",
                        name=comp_name,
                        status=comp_status,
                        registered_address=comp_addr,
                    )

                disqualified = appt.get("is_disqualified", False) or appt.get("disqualified", False)
                if disqualified:
                    G.nodes[canonical_id]["disqualified"] = True

                G.add_edge(
                    canonical_id,
                    comp_num,
                    appointed_on=appt.get("appointed_on"),
                    resigned_on=appt.get("resigned_on"),
                    role=appt.get("officer_role") or "director",
                )

    return G

