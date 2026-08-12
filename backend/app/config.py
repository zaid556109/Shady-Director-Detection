"""App-wide settings, loaded from the environment (see .env.example).

Import `settings` (the singleton at the bottom) rather than instantiating
`Settings()` yourself, so tests and app code share one source of truth.
"""

from __future__ import annotations

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file="../.env", env_file_encoding="utf-8", extra="ignore")

    app_env: str = "development"
    log_level: str = "INFO"

    api_host: str = "0.0.0.0"
    api_port: int = 8000

    database_url: str = (
        "postgresql+psycopg://counterparty:counterparty@localhost:5432/counterparty_check"
    )

    redis_url: str = "redis://localhost:6379/0"
    celery_broker_url: str = "redis://localhost:6379/0"
    celery_result_backend: str = "redis://localhost:6379/1"

    ch_api_key: str = "changeme"
    ch_api_base_url: str = "https://api.company-information.service.gov.uk"
    ch_document_api_base_url: str = "https://document-api.company-information.service.gov.uk"
    ch_rate_limit_requests: int = 600
    ch_rate_limit_window_seconds: int = 300

    use_mock_pipeline: bool = True


settings = Settings()
