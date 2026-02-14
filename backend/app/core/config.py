import os


class Settings:
    PROJECT_NAME: str = os.getenv("PROJECT_NAME", "Prompt Manager API")
    API_V1_PREFIX: str = os.getenv("API_V1_PREFIX", "/api/v1")
    DATABASE_URL: str = os.getenv(
        "DATABASE_URL",
        "postgresql+psycopg://prompt_manager:prompt_manager@postgres:5432/prompt_manager",
    )
    FRONTEND_ORIGINS: list[str] = [
        origin.strip()
        for origin in os.getenv("FRONTEND_ORIGINS", "http://localhost:5173").split(",")
        if origin.strip()
    ]
    JWT_SECRET_KEY: str = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    JWT_ALGORITHM: str = os.getenv("JWT_ALGORITHM", "HS256")
    JWT_ACCESS_TOKEN_EXPIRE_MINUTES: int = int(
        os.getenv("JWT_ACCESS_TOKEN_EXPIRE_MINUTES", "1440")
    )


settings = Settings()
