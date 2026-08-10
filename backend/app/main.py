"""FastAPI app factory.

`create_app()` is the single place routers get wired up — tests import it
directly (see backend/tests) rather than importing a module-level `app` so
future settings-dependent construction (e.g. CORS origins) has somewhere to
live.
"""

from __future__ import annotations

from fastapi import FastAPI

from app.api import api_router
from app.config import settings


def create_app() -> FastAPI:
    app = FastAPI(
        title="CounterpartyCheck API",
        version="0.1.0",
        description="Company due-diligence / loan-eligibility scoring, built on UK Companies House data.",
    )

    app.include_router(api_router)

    @app.get("/health", tags=["health"])
    def health() -> dict[str, str]:
        return {"status": "ok", "env": settings.app_env}

    return app


app = create_app()
