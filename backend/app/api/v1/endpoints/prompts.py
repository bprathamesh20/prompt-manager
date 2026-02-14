from fastapi import APIRouter, Depends, HTTPException, Query, Response, status
from sqlalchemy.orm import Session

from app.api.deps.auth import PromptReadAccess, get_current_user, get_prompt_read_access
from app.dal import prompt_dal
from app.db.session import get_db
from app.models.prompt import PromptVersion
from app.models.user import User
from app.schemas.prompt import (
    PromptCreateRequest,
    PromptLookupQuery,
    PromptUpdateRequest,
    PromptVersionResponse,
)

router = APIRouter()


def _to_prompt_response(
    prompt_version: PromptVersion, explicit_tag: str | None = None
) -> PromptVersionResponse:
    resolved_tag = explicit_tag
    if resolved_tag is None and prompt_version.tags:
        resolved_tag = prompt_version.tags[0].name

    return PromptVersionResponse(
        id=prompt_version.id,
        prompt_id=prompt_version.prompt_id,
        name=prompt_version.prompt.name,
        content=prompt_version.content,
        version=prompt_version.version,
        tag=resolved_tag,
        created_at=prompt_version.created_at,
        updated_at=prompt_version.updated_at,
    )


@router.get("", response_model=list[PromptVersionResponse])
def get_prompts(
    name: str | None = Query(None, description="Optional prompt name filter"),
    tag: str | None = Query(None, description="Optional prompt tag"),
    latest: bool = Query(False, description="Return only the latest matching version."),
    limit: int | None = Query(
        None, ge=1, le=100, description="Optional max number of matching versions."
    ),
    access: PromptReadAccess = Depends(get_prompt_read_access),
    db: Session = Depends(get_db),
) -> list[PromptVersionResponse]:
    lookup = PromptLookupQuery(name=name, tag=tag)
    resolved_limit = 1 if latest else limit
    prompt_versions = prompt_dal.get_prompt_versions(
        db,
        name=lookup.name,
        tag=lookup.tag,
        owner_id=access.owner_id,
        limit=resolved_limit,
    )
    return [_to_prompt_response(version, lookup.tag) for version in prompt_versions]


@router.post("", response_model=PromptVersionResponse, status_code=201)
def create_prompt(
    payload: PromptCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PromptVersionResponse:
    prompt_version = prompt_dal.create_prompt_version(
        db,
        owner_id=current_user.id,
        name=payload.name,
        content=payload.content,
        tag=payload.tag,
    )
    return _to_prompt_response(prompt_version)


@router.put("/{prompt_version_id}", response_model=PromptVersionResponse)
def update_prompt_version(
    prompt_version_id: int,
    payload: PromptUpdateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> PromptVersionResponse:
    try:
        prompt_version, explicit_tag = prompt_dal.update_prompt_version(
            db,
            owner_id=current_user.id,
            prompt_version_id=prompt_version_id,
            content=payload.content,
            tag=payload.tag,
            content_is_set="content" in payload.model_fields_set,
            tag_is_set="tag" in payload.model_fields_set,
        )
    except prompt_dal.PromptVersionNotFoundError:
        raise HTTPException(status_code=404, detail="Prompt version not found.")
    return _to_prompt_response(prompt_version, explicit_tag)


@router.delete("/{prompt_version_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_prompt_version(
    prompt_version_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> Response:
    try:
        prompt_dal.delete_prompt_version(
            db,
            owner_id=current_user.id,
            prompt_version_id=prompt_version_id,
        )
    except prompt_dal.PromptVersionNotFoundError:
        raise HTTPException(status_code=404, detail="Prompt version not found.")
    return Response(status_code=status.HTTP_204_NO_CONTENT)
