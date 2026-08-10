"""API routers, aggregated into `api_router` for app.main to include."""

from fastapi import APIRouter

from app.api import assess, report, status

api_router = APIRouter()
api_router.include_router(assess.router)
api_router.include_router(report.router)
api_router.include_router(status.router)

__all__ = ["api_router"]
