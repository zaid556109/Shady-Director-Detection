"""FastAPI dependencies shared across routers."""

from __future__ import annotations

from app.db.base import get_db

__all__ = ["get_db"]
