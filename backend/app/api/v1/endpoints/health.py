from fastapi import APIRouter, Depends
from sqlalchemy import text
from sqlalchemy.orm import Session

from app.db.session import get_db
from app.schemas.health import HealthResponse

router = APIRouter()


@router.get("/health", response_model=HealthResponse)
def get_health(db: Session = Depends(get_db)) -> HealthResponse:
    database_status = "up"
    status = "ok"

    try:
        db.execute(text("SELECT 1"))
    except Exception:
        database_status = "down"
        status = "degraded"

    return HealthResponse(status=status, database=database_status)
