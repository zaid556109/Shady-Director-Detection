"""Red-flag detectors over a built director graph / feature set.

Each detector is independent and returns zero or more RedFlags — keeping
them as separate small functions (rather than one monolithic "find all
flags" function) is what lets Person 3 add a new flag type without touching
existing ones, and lets tests target one flag type at a time.
"""

from __future__ import annotations

import networkx as nx

from app.contracts import ApplicantProfile, RedFlag


def detect_dissolved_company_flags(profile: ApplicantProfile, graph: nx.Graph) -> list[RedFlag]:
    """Flag officers with a high count of dissolved/liquidated prior companies.

    Real implementation (Person 3, TODO): threshold TBD (suggest: warning at
    2+, critical at 4+ within a lookback window, e.g. 5 years) — cite the
    officer_id and the specific dissolved company numbers in `evidence`.
    """
    raise NotImplementedError("detect_dissolved_company_flags. Owner: Person 3.")


def detect_disqualification_flags(profile: ApplicantProfile, graph: nx.Graph) -> list[RedFlag]:
    """Flag officers with an active or historical disqualification.

    Real implementation (Person 3, TODO): CH's officer appointments API
    exposes disqualification data on some records; confirm coverage and
    document the caveat here once verified. Always `severity=critical`.
    """
    raise NotImplementedError("detect_disqualification_flags. Owner: Person 3.")


def detect_shared_address_flags(profile: ApplicantProfile, graph: nx.Graph) -> list[RedFlag]:
    """Flag officers whose correspondence address is shared with an unusually
    large number of other companies (classic "formation mill" / shell
    pattern).

    Real implementation (Person 3, TODO): threshold TBD (suggest: warning at
    5+, critical at 15+ companies at the same address) — cite the shared
    address and the cluster size in `evidence`.
    """
    raise NotImplementedError("detect_shared_address_flags. Owner: Person 3.")


def detect_filing_lateness_flags(profile: ApplicantProfile) -> list[RedFlag]:
    """Flag companies with a pattern of late filings, using
    `profile.filing_history`.

    Real implementation (Person 3, TODO): a single late filing is `info`; a
    pattern (e.g. 2+ late in the last 3 years) or currently-overdue accounts
    (`profile.accounts_overdue`) is `warning`.
    """
    raise NotImplementedError("detect_filing_lateness_flags. Owner: Person 3.")
