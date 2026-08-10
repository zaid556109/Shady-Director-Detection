"""Director <-> company graph construction.

Bipartite graph: officer nodes and company nodes, edges = appointments
(with appointed_on/resigned_on as edge attributes). Built with NetworkX
because the features we need — dissolved-company counts, shared-address
clustering — are naturally graph queries (neighbors, connected components)
once the graph is built, rather than repeated ad-hoc joins.

Node IDs: officer nodes are keyed by `officer_id` as CH returns it (see the
caveat in app.ingestion.client about officer_id not being a stable global
person ID — Person 3 owns deciding whether/how to dedupe officers across
appointment lists, e.g. by name + date-of-birth month/year, which CH does
expose). Company nodes are keyed by company_number.
"""

from __future__ import annotations

import networkx as nx

from app.contracts import ApplicantProfile


def build_director_graph(profile: ApplicantProfile) -> nx.Graph:
    """Build the director<->company graph reachable from `profile`.

    Real implementation (Person 3, TODO): start from `profile.officers`,
    call `CompaniesHouseClient.fetch_officer_appointments` for each officer
    to pull in every other company they're linked to (1-2 hops is enough
    for shared-address clustering; going further risks pulling in huge
    unrelated subgraphs for prolific directors). Add company status and
    registered address as node attributes — dissolved-company counts and
    shared-address clustering are both just attribute lookups over
    `graph.neighbors(officer_id)` once built.
    """
    raise NotImplementedError("build_director_graph: implement graph construction from CH appointment data. Owner: Person 3.")
