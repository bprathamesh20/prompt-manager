from datetime import datetime, timezone

from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session, joinedload, selectinload

from app.models.prompt import Prompt, PromptTag, PromptVersion


class PromptVersionNotFoundError(Exception):
    pass


def _normalize_tag(tag: str | None) -> str | None:
    return tag.strip() if tag else None


def _get_prompt_version_by_id(
    db: Session,
    prompt_version_id: int,
    *,
    owner_id: int | None = None,
) -> PromptVersion | None:
    statement = (
        select(PromptVersion)
        .join(Prompt)
        .options(joinedload(PromptVersion.prompt), selectinload(PromptVersion.tags))
        .where(PromptVersion.id == prompt_version_id)
    )

    if owner_id is not None:
        statement = statement.where(Prompt.owner_id == owner_id)

    return db.execute(statement).unique().scalar_one_or_none()


def get_prompt_versions(
    db: Session,
    *,
    name: str | None,
    tag: str | None,
    owner_id: int | None = None,
) -> list[PromptVersion]:
    statement = (
        select(PromptVersion)
        .join(Prompt)
        .options(joinedload(PromptVersion.prompt), selectinload(PromptVersion.tags))
        .order_by(Prompt.name.asc(), PromptVersion.version.desc())
    )

    if name:
        statement = statement.where(Prompt.name == name)

    if owner_id is not None:
        statement = statement.where(Prompt.owner_id == owner_id)

    if tag:
        statement = statement.join(PromptTag).where(PromptTag.name == tag)

    return db.execute(statement).unique().scalars().all()


def create_prompt_version(
    db: Session,
    *,
    owner_id: int,
    name: str,
    content: str,
    tag: str | None,
) -> PromptVersion:
    now = datetime.now(timezone.utc)
    normalized_tag = _normalize_tag(tag)

    try:
        prompt = db.execute(
            select(Prompt).where(Prompt.owner_id == owner_id, Prompt.name == name)
        ).scalar_one_or_none()
        if prompt is None:
            prompt = Prompt(owner_id=owner_id, name=name, created_at=now)
            db.add(prompt)
            db.flush()

        latest_version = db.scalar(
            select(func.max(PromptVersion.version)).where(PromptVersion.prompt_id == prompt.id)
        )
        next_version = (latest_version or 0) + 1

        prompt_version = PromptVersion(
            prompt_id=prompt.id,
            version=next_version,
            content=content,
            created_at=now,
            updated_at=now,
        )
        db.add(prompt_version)
        db.flush()

        if normalized_tag:
            db.add(PromptTag(prompt_version_id=prompt_version.id, name=normalized_tag))

        db.commit()
    except Exception:
        db.rollback()
        raise

    refreshed = _get_prompt_version_by_id(db, prompt_version.id, owner_id=owner_id)
    if refreshed is None:
        raise PromptVersionNotFoundError("Prompt version not found after creation.")
    return refreshed


def update_prompt_version(
    db: Session,
    *,
    owner_id: int,
    prompt_version_id: int,
    content: str | None,
    tag: str | None,
    content_is_set: bool,
    tag_is_set: bool,
) -> tuple[PromptVersion, str | None]:
    prompt_version = _get_prompt_version_by_id(db, prompt_version_id, owner_id=owner_id)
    if prompt_version is None:
        raise PromptVersionNotFoundError("Prompt version not found.")

    now = datetime.now(timezone.utc)
    has_changes = False

    if content_is_set and content is not None:
        prompt_version.content = content
        has_changes = True

    explicit_tag: str | None = None
    if tag_is_set:
        explicit_tag = _normalize_tag(tag)
        db.execute(delete(PromptTag).where(PromptTag.prompt_version_id == prompt_version_id))
        if explicit_tag:
            db.add(PromptTag(prompt_version_id=prompt_version_id, name=explicit_tag))
        has_changes = True

    if has_changes:
        prompt_version.updated_at = now

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    refreshed = _get_prompt_version_by_id(db, prompt_version_id, owner_id=owner_id)
    if refreshed is None:
        raise PromptVersionNotFoundError("Prompt version not found after update.")

    return refreshed, explicit_tag


def delete_prompt_version(
    db: Session,
    *,
    owner_id: int,
    prompt_version_id: int,
) -> None:
    prompt_version = _get_prompt_version_by_id(db, prompt_version_id, owner_id=owner_id)
    if prompt_version is None:
        raise PromptVersionNotFoundError("Prompt version not found.")

    prompt_id = prompt_version.prompt_id

    try:
        db.execute(delete(PromptTag).where(PromptTag.prompt_version_id == prompt_version_id))
        db.delete(prompt_version)
        db.flush()

        remaining_versions_count = db.scalar(
            select(func.count(PromptVersion.id)).where(PromptVersion.prompt_id == prompt_id)
        )
        if remaining_versions_count == 0:
            prompt = db.get(Prompt, prompt_id)
            if prompt is not None:
                db.delete(prompt)

        db.commit()
    except Exception:
        db.rollback()
        raise
