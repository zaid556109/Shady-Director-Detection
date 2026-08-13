"""SQLAlchemy models for persisted pipeline data.

These mirror the contracts in `contracts/` but are deliberately not the same
classes — the DB schema is allowed to evolve independently of the API/pipeline
contracts (e.g. adding an index, denormalizing a column) without that being a
"contract change" requiring the CONTRIBUTING.md approval process. Structured
payloads (JSON columns) store the full contract model dump for fields that
don't need to be individually queryable yet.

Table list matches the initial migration
(backend/alembic/versions/0001_initial.py): companies, officers,
appointments, filings, financial_extracts, feature_sets, scores,
assessment_jobs.
"""

from __future__ import annotations

import uuid
from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, Boolean, Date, DateTime, Float, ForeignKey, Integer, String
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func

from app.db.base import Base


class TimestampMixin:
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )


class Company(TimestampMixin, Base):
    __tablename__ = "companies"

    company_number: Mapped[str] = mapped_column(String(16), primary_key=True)
    company_name: Mapped[str] = mapped_column(String(256))
    status: Mapped[str] = mapped_column(String(32))
    incorporation_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    sic_codes: Mapped[list[str]] = mapped_column(JSON, default=list)
    registered_address: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    accounts_overdue: Mapped[bool] = mapped_column(Boolean, default=False)
    data_completeness: Mapped[float] = mapped_column(Float, default=0.0)

    appointments: Mapped[list[Appointment]] = relationship(back_populates="company")
    filings: Mapped[list[Filing]] = relationship(back_populates="company")
    financial_extracts: Mapped[list[FinancialExtractRow]] = relationship(back_populates="company")
    feature_sets: Mapped[list[FeatureSet]] = relationship(back_populates="company")
    scores: Mapped[list[Score]] = relationship(back_populates="company")


class Officer(TimestampMixin, Base):
    __tablename__ = "officers"

    # Companies House officer IDs are scoped per appointment-list, not
    # globally stable — see the caveat in app/ingestion/client.py. Treated
    # as our primary key for the scaffold; revisit if Person 3's graph work
    # needs a separate deduped "person" concept.
    officer_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    name: Mapped[str] = mapped_column(String(256))
    nationality: Mapped[str | None] = mapped_column(String(64), nullable=True)
    occupation: Mapped[str | None] = mapped_column(String(128), nullable=True)

    appointments: Mapped[list[Appointment]] = relationship(back_populates="officer")


class Appointment(TimestampMixin, Base):
    __tablename__ = "appointments"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    officer_id: Mapped[str] = mapped_column(ForeignKey("officers.officer_id"), index=True)
    company_number: Mapped[str] = mapped_column(ForeignKey("companies.company_number"), index=True)
    role: Mapped[str] = mapped_column(String(64))
    appointed_on: Mapped[date | None] = mapped_column(Date, nullable=True)
    resigned_on: Mapped[date | None] = mapped_column(Date, nullable=True)

    officer: Mapped[Officer] = relationship(back_populates="appointments")
    company: Mapped[Company] = relationship(back_populates="appointments")


class Filing(TimestampMixin, Base):
    __tablename__ = "filings"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_number: Mapped[str] = mapped_column(ForeignKey("companies.company_number"), index=True)
    transaction_id: Mapped[str] = mapped_column(String(64), unique=True)
    filing_type: Mapped[str] = mapped_column(String(64))
    filing_date: Mapped[date | None] = mapped_column(Date, nullable=True)
    category: Mapped[str | None] = mapped_column(String(64), nullable=True)
    document_metadata_url: Mapped[str | None] = mapped_column(String(512), nullable=True)

    company: Mapped[Company] = relationship(back_populates="filings")


class FinancialExtractRow(TimestampMixin, Base):
    """Table name suffixed `Row` to avoid clashing with the
    `contracts.FinancialExtract` Pydantic model; the DB table itself is
    still named `financial_extracts`."""

    __tablename__ = "financial_extracts"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_number: Mapped[str] = mapped_column(ForeignKey("companies.company_number"), index=True)
    filing_year: Mapped[int] = mapped_column(Integer)
    period_start: Mapped[date | None] = mapped_column(Date, nullable=True)
    period_end: Mapped[date | None] = mapped_column(Date, nullable=True)
    currency: Mapped[str] = mapped_column(String(8), default="GBP")
    source_format: Mapped[str] = mapped_column(String(16))
    extraction_confidence: Mapped[float] = mapped_column(Float)
    balance_sheet: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    profit_and_loss: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)

    company: Mapped[Company] = relationship(back_populates="financial_extracts")


class FeatureSet(TimestampMixin, Base):
    """Persisted DirectorFeatureSet + RedFlags for one assessment run."""

    __tablename__ = "feature_sets"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_number: Mapped[str] = mapped_column(ForeignKey("companies.company_number"), index=True)
    features: Mapped[dict[str, Any]] = mapped_column(
        JSON, comment="DirectorFeatureSet.model_dump()"
    )
    red_flags: Mapped[list[dict[str, Any]]] = mapped_column(
        JSON, default=list, comment="list[RedFlag].model_dump()"
    )

    company: Mapped[Company] = relationship(back_populates="feature_sets")


class Score(TimestampMixin, Base):
    """Persisted ScoreBreakdown for one assessment run."""

    __tablename__ = "scores"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    company_number: Mapped[str] = mapped_column(ForeignKey("companies.company_number"), index=True)
    job_id: Mapped[str | None] = mapped_column(
        ForeignKey("assessment_jobs.job_id"), nullable=True, index=True
    )
    total: Mapped[int] = mapped_column(Integer)
    breakdown: Mapped[dict[str, Any]] = mapped_column(JSON, comment="ScoreBreakdown.model_dump()")

    company: Mapped[Company] = relationship(back_populates="scores")


class AssessmentJob(TimestampMixin, Base):
    __tablename__ = "assessment_jobs"

    # Not FK-constrained to companies.company_number: a job can be created
    # (and start running ingestion) before we have a companies row for it.
    job_id: Mapped[str] = mapped_column(
        String(36), primary_key=True, default=lambda: str(uuid.uuid4())
    )
    company_number: Mapped[str] = mapped_column(String(16), index=True)
    status: Mapped[str] = mapped_column(String(16), default="pending")
    stage: Mapped[str | None] = mapped_column(String(32), nullable=True)
    error_message: Mapped[str | None] = mapped_column(String(1024), nullable=True)
    error_retryable: Mapped[bool | None] = mapped_column(Boolean, nullable=True)
