"""Ingestion — Companies House API client and ApplicantProfile assembly.

Owner: Person 1. Public contract: `build_applicant_profile`.
"""

from app.ingestion.service import build_applicant_profile

__all__ = ["build_applicant_profile"]
