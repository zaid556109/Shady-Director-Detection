"""Public entrypoint for the director_features module.

`build_features` is what `scoring` and the pipeline import.
Wires graph construction, feature aggregation, and red flag detectors.
"""

from __future__ import annotations

from datetime import date
from typing import TYPE_CHECKING, Any

from app.contracts import (
    ApplicantProfile,
    CompanyDirectorAggregates,
    DirectorFeatureSet,
    OfficerFeatures,
    RedFlag,
)
from app.director_features.graph import build_director_graph, normalize_address
from app.director_features.red_flags import (
    detect_disqualification_flags,
    detect_dissolved_company_flags,
    detect_filing_lateness_flags,
    detect_shared_address_flags,
)

if TYPE_CHECKING:
    from app.ingestion.client import CompaniesHouseClient


def _parse_date(val: Any) -> date | None:
    if val is None:
        return None
    if isinstance(val, date):
        return val
    if isinstance(val, str):
        try:
            return date.fromisoformat(val)
        except ValueError:
            return None
    return None


async def build_features(
    profile: ApplicantProfile,
    client: CompaniesHouseClient | None = None,
) -> tuple[DirectorFeatureSet, list[RedFlag]]:
    """Build governance features and red flags for `profile` from the director graph."""
    graph = await build_director_graph(profile, client=client)

    officer_features_list: list[OfficerFeatures] = []
    target_norm_addr = normalize_address(profile.registered_address)

    for officer in profile.officers:
        officer_id = officer.officer_id
        if not officer_id:
            continue

        if officer_id in graph:
            company_neighbors = [
                nbr for nbr in graph.neighbors(officer_id)
                if graph.nodes[nbr].get("type") == "company"
            ]
            appointments_count = len(company_neighbors)

            dissolved_count = sum(
                1 for nbr in company_neighbors
                if str(graph.nodes[nbr].get("status", "")).lower()
                in (
                    "dissolved",
                    "liquidation",
                    "receivership",
                    "administration",
                    "voluntary-arrangement",
                )
            )

            disqualified = bool(graph.nodes[officer_id].get("disqualified", False))

            tenures: list[float] = []
            for nbr in company_neighbors:
                edge_data = graph.get_edge_data(officer_id, nbr) or {}
                app_on = edge_data.get("appointed_on")
                res_on = edge_data.get("resigned_on")

                d_app = _parse_date(app_on)
                d_res = _parse_date(res_on)

                if d_app and d_res:
                    days = (d_res - d_app).days
                    if days >= 0:
                        tenures.append(float(days))
                elif d_app and not d_res:
                    days = (date.today() - d_app).days
                    if days >= 0:
                        tenures.append(float(days))

            avg_tenure = (sum(tenures) / len(tenures)) if tenures else None

            cluster_size = 1
            if target_norm_addr:
                total_in_graph = sum(
                    1 for n, data in graph.nodes(data=True)
                    if data.get("type") == "company"
                    and normalize_address(data.get("registered_address")) == target_norm_addr
                )
                cluster_size = max(1, total_in_graph)

            officer_features_list.append(
                OfficerFeatures(
                    officer_id=officer_id,
                    appointments_count=appointments_count,
                    dissolved_company_count=dissolved_count,
                    disqualification_flag=disqualified,
                    avg_tenure_days=avg_tenure,
                    shared_address_cluster_size=cluster_size,
                )
            )
        else:
            officer_features_list.append(
                OfficerFeatures(
                    officer_id=officer_id,
                    appointments_count=1,
                    dissolved_company_count=0,
                    disqualification_flag=False,
                    avg_tenure_days=None,
                    shared_address_cluster_size=1,
                )
            )

    officer_count = len(officer_features_list)
    max_dissolved = max((o.dissolved_company_count for o in officer_features_list), default=0)
    any_disqualified = any(o.disqualification_flag for o in officer_features_list)
    max_shared_cluster = max(
        (o.shared_address_cluster_size for o in officer_features_list), default=1
    )

    valid_tenures = [
        o.avg_tenure_days for o in officer_features_list if o.avg_tenure_days is not None
    ]
    min_avg_tenure = min(valid_tenures) if valid_tenures else None

    aggregates = CompanyDirectorAggregates(
        officer_count=officer_count,
        max_dissolved_company_count=max_dissolved,
        any_disqualified=any_disqualified,
        max_shared_address_cluster_size=max_shared_cluster,
        min_avg_tenure_days=min_avg_tenure,
    )

    feature_set = DirectorFeatureSet(
        company_number=profile.company_number,
        officers=officer_features_list,
        aggregates=aggregates,
    )

    flags: list[RedFlag] = []
    flags.extend(detect_dissolved_company_flags(profile, graph))
    flags.extend(detect_disqualification_flags(profile, graph))
    flags.extend(detect_shared_address_flags(profile, graph))
    flags.extend(detect_filing_lateness_flags(profile))

    return feature_set, flags


