"""initial schema: companies, officers, appointments, filings,
financial_extracts, feature_sets, scores, assessment_jobs

Revision ID: 0001_initial
Revises:
Create Date: 2026-08-10
"""

from __future__ import annotations

from collections.abc import Sequence

import sqlalchemy as sa
from alembic import op

revision: str = "0001_initial"
down_revision: str | None = None
branch_labels: Sequence[str] | None = None
depends_on: Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "companies",
        sa.Column("company_number", sa.String(16), primary_key=True),
        sa.Column("company_name", sa.String(256), nullable=False),
        sa.Column("status", sa.String(32), nullable=False),
        sa.Column("incorporation_date", sa.Date(), nullable=True),
        sa.Column("sic_codes", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column("registered_address", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("accounts_overdue", sa.Boolean(), nullable=False, server_default=sa.false()),
        sa.Column("data_completeness", sa.Float(), nullable=False, server_default="0"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "officers",
        sa.Column("officer_id", sa.String(64), primary_key=True),
        sa.Column("name", sa.String(256), nullable=False),
        sa.Column("nationality", sa.String(64), nullable=True),
        sa.Column("occupation", sa.String(128), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )

    op.create_table(
        "appointments",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "officer_id", sa.String(64), sa.ForeignKey("officers.officer_id"), nullable=False
        ),
        sa.Column(
            "company_number",
            sa.String(16),
            sa.ForeignKey("companies.company_number"),
            nullable=False,
        ),
        sa.Column("role", sa.String(64), nullable=False),
        sa.Column("appointed_on", sa.Date(), nullable=True),
        sa.Column("resigned_on", sa.Date(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_appointments_officer_id", "appointments", ["officer_id"])
    op.create_index("ix_appointments_company_number", "appointments", ["company_number"])

    op.create_table(
        "filings",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "company_number",
            sa.String(16),
            sa.ForeignKey("companies.company_number"),
            nullable=False,
        ),
        sa.Column("transaction_id", sa.String(64), nullable=False, unique=True),
        sa.Column("filing_type", sa.String(64), nullable=False),
        sa.Column("filing_date", sa.Date(), nullable=True),
        sa.Column("category", sa.String(64), nullable=True),
        sa.Column("document_metadata_url", sa.String(512), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_filings_company_number", "filings", ["company_number"])

    op.create_table(
        "financial_extracts",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "company_number",
            sa.String(16),
            sa.ForeignKey("companies.company_number"),
            nullable=False,
        ),
        sa.Column("filing_year", sa.Integer(), nullable=False),
        sa.Column("period_start", sa.Date(), nullable=True),
        sa.Column("period_end", sa.Date(), nullable=True),
        sa.Column("currency", sa.String(8), nullable=False, server_default="GBP"),
        sa.Column("source_format", sa.String(16), nullable=False),
        sa.Column("extraction_confidence", sa.Float(), nullable=False),
        sa.Column("balance_sheet", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column("profit_and_loss", sa.JSON(), nullable=False, server_default="{}"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index(
        "ix_financial_extracts_company_number", "financial_extracts", ["company_number"]
    )

    op.create_table(
        "feature_sets",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "company_number",
            sa.String(16),
            sa.ForeignKey("companies.company_number"),
            nullable=False,
        ),
        sa.Column("features", sa.JSON(), nullable=False),
        sa.Column("red_flags", sa.JSON(), nullable=False, server_default="[]"),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_feature_sets_company_number", "feature_sets", ["company_number"])

    op.create_table(
        "assessment_jobs",
        sa.Column("job_id", sa.String(36), primary_key=True),
        sa.Column("company_number", sa.String(16), nullable=False),
        sa.Column("status", sa.String(16), nullable=False, server_default="pending"),
        sa.Column("stage", sa.String(32), nullable=True),
        sa.Column("error_message", sa.String(1024), nullable=True),
        sa.Column("error_retryable", sa.Boolean(), nullable=True),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_assessment_jobs_company_number", "assessment_jobs", ["company_number"])

    op.create_table(
        "scores",
        sa.Column("id", sa.Integer(), primary_key=True, autoincrement=True),
        sa.Column(
            "company_number",
            sa.String(16),
            sa.ForeignKey("companies.company_number"),
            nullable=False,
        ),
        sa.Column("job_id", sa.String(36), sa.ForeignKey("assessment_jobs.job_id"), nullable=True),
        sa.Column("total", sa.Integer(), nullable=False),
        sa.Column("breakdown", sa.JSON(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    )
    op.create_index("ix_scores_company_number", "scores", ["company_number"])
    op.create_index("ix_scores_job_id", "scores", ["job_id"])


def downgrade() -> None:
    op.drop_table("scores")
    op.drop_table("assessment_jobs")
    op.drop_table("feature_sets")
    op.drop_table("financial_extracts")
    op.drop_table("filings")
    op.drop_table("appointments")
    op.drop_table("officers")
    op.drop_table("companies")
