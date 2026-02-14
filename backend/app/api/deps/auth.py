from dataclasses import dataclass

from fastapi import Depends, Header, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.orm import Session

from app.core.security import JWTError, decode_access_token, hash_api_key
from app.dal.api_key_dal import ApiKeyNotFoundError, get_active_key_by_hash, touch_last_used
from app.dal.auth_dal import get_user_by_id
from app.db.session import get_db
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)


@dataclass
class PromptReadAccess:
    user: User | None
    owner_id: int
    source: str


def _resolve_user_from_token(db: Session, token: str) -> User:
    try:
        payload = decode_access_token(token)
        subject = payload.get("sub")
        if subject is None:
            raise HTTPException(status_code=401, detail="Invalid token payload.")

        user_id = int(subject)
    except (JWTError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user_by_id(db, user_id=user_id)
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User for token was not found.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: Session = Depends(get_db),
) -> User:
    if credentials is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated.",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return _resolve_user_from_token(db, credentials.credentials)


def get_prompt_read_access(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    x_api_key: str | None = Header(default=None, alias="X-API-Key"),
    db: Session = Depends(get_db),
) -> PromptReadAccess:
    if credentials is not None:
        user = _resolve_user_from_token(db, credentials.credentials)
        return PromptReadAccess(user=user, owner_id=user.id, source="jwt")

    if x_api_key:
        key_hash = hash_api_key(x_api_key)
        api_key = get_active_key_by_hash(db, key_hash=key_hash)
        if api_key is not None:
            try:
                touch_last_used(db, key_id=api_key.id)
            except ApiKeyNotFoundError:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Not authenticated.",
                )
            return PromptReadAccess(user=None, owner_id=api_key.user_id, source="api_key")

    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Not authenticated.",
    )
