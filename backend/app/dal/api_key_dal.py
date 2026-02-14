from datetime import datetime, timezone

from sqlalchemy import func, select
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.models.user_api_key import UserApiKey

MAX_ACTIVE_API_KEYS_PER_USER = 5


class ApiKeyLimitReachedError(Exception):
    pass


class ApiKeyNotFoundError(Exception):
    pass


class ApiKeyNameConflictError(Exception):
    pass


class ApiKeyNameInvalidError(Exception):
    pass


def list_user_api_keys(db: Session, *, user_id: int) -> list[UserApiKey]:
    statement = (
        select(UserApiKey)
        .where(UserApiKey.user_id == user_id)
        .order_by(UserApiKey.created_at.desc())
    )
    return db.execute(statement).scalars().all()


def create_user_api_key(
    db: Session,
    *,
    user_id: int,
    name: str,
    key_hash: str,
    prefix: str,
) -> UserApiKey:
    normalized_name = name.strip()
    if not normalized_name:
        raise ApiKeyNameInvalidError("API key name cannot be blank.")

    existing_name = db.execute(
        select(UserApiKey).where(UserApiKey.user_id == user_id, UserApiKey.name == normalized_name)
    ).scalar_one_or_none()
    if existing_name is not None:
        raise ApiKeyNameConflictError("API key name already exists.")

    active_count = db.scalar(
        select(func.count(UserApiKey.id)).where(
            UserApiKey.user_id == user_id,
            UserApiKey.revoked_at.is_(None),
        )
    )
    if (active_count or 0) >= MAX_ACTIVE_API_KEYS_PER_USER:
        raise ApiKeyLimitReachedError("API key limit reached.")

    now = datetime.now(timezone.utc)
    api_key = UserApiKey(
        user_id=user_id,
        name=normalized_name,
        prefix=prefix,
        key_hash=key_hash,
        created_at=now,
        last_used_at=None,
        revoked_at=None,
    )

    try:
        db.add(api_key)
        db.commit()
    except IntegrityError as exc:
        db.rollback()
        if "uq_user_api_keys_user_name" in str(exc.orig):
            raise ApiKeyNameConflictError("API key name already exists.") from exc
        raise
    except Exception:
        db.rollback()
        raise

    refreshed = db.get(UserApiKey, api_key.id)
    if refreshed is None:
        raise ApiKeyNotFoundError("API key could not be loaded after creation.")
    return refreshed


def revoke_user_api_key(db: Session, *, user_id: int, key_id: int) -> UserApiKey:
    statement = select(UserApiKey).where(UserApiKey.id == key_id, UserApiKey.user_id == user_id)
    api_key = db.execute(statement).scalar_one_or_none()
    if api_key is None:
        raise ApiKeyNotFoundError("API key not found.")

    if api_key.revoked_at is None:
        api_key.revoked_at = datetime.now(timezone.utc)
        try:
            db.commit()
        except Exception:
            db.rollback()
            raise

    return api_key


def get_active_key_by_hash(db: Session, *, key_hash: str) -> UserApiKey | None:
    statement = select(UserApiKey).where(
        UserApiKey.key_hash == key_hash,
        UserApiKey.revoked_at.is_(None),
    )
    return db.execute(statement).scalar_one_or_none()


def touch_last_used(db: Session, *, key_id: int) -> None:
    api_key = db.get(UserApiKey, key_id)
    if api_key is None:
        raise ApiKeyNotFoundError("API key not found.")

    api_key.last_used_at = datetime.now(timezone.utc)
    try:
        db.commit()
    except Exception:
        db.rollback()
        raise
