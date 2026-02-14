from datetime import datetime, timezone
from typing import Callable

from sqlalchemy import select
from sqlalchemy.orm import Session

from app.models.user import User


class UserAlreadyExistsError(Exception):
    pass


class InvalidCredentialsError(Exception):
    pass


class UserNotFoundError(Exception):
    pass


def get_user_by_email(db: Session, *, email: str) -> User | None:
    statement = select(User).where(User.email == email.lower())
    return db.execute(statement).scalar_one_or_none()


def get_user_by_id(db: Session, *, user_id: int) -> User | None:
    statement = select(User).where(User.id == user_id)
    return db.execute(statement).scalar_one_or_none()


def create_user(db: Session, *, email: str, password_hash: str) -> User:
    existing_user = get_user_by_email(db, email=email)
    if existing_user is not None:
        raise UserAlreadyExistsError("User with this email already exists.")

    now = datetime.now(timezone.utc)
    user = User(email=email.lower(), password_hash=password_hash, is_active=True, created_at=now)

    try:
        db.add(user)
        db.commit()
    except Exception:
        db.rollback()
        raise

    refreshed = get_user_by_id(db, user_id=user.id)
    if refreshed is None:
        raise UserNotFoundError("Created user could not be reloaded.")
    return refreshed


def authenticate_user(
    db: Session,
    *,
    email: str,
    password: str,
    verify_password: Callable[[str, str], bool],
) -> User:
    user = get_user_by_email(db, email=email)
    if user is None:
        raise InvalidCredentialsError("Invalid email or password.")

    if not verify_password(password, user.password_hash):
        raise InvalidCredentialsError("Invalid email or password.")

    return user
