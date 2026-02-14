from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.api.deps.auth import get_current_user
from app.core.config import settings
from app.core.security import (
    create_access_token,
    generate_api_key,
    get_api_key_prefix,
    hash_api_key,
    hash_password,
    verify_password,
)
from app.dal.api_key_dal import (
    ApiKeyLimitReachedError,
    ApiKeyNameConflictError,
    ApiKeyNameInvalidError,
    ApiKeyNotFoundError,
    create_user_api_key,
    list_user_api_keys,
    revoke_user_api_key,
)
from app.dal.auth_dal import InvalidCredentialsError, UserAlreadyExistsError, authenticate_user, create_user
from app.db.session import get_db
from app.models.user_api_key import UserApiKey
from app.models.user import User
from app.schemas.auth import (
    ApiKeyCreateRequest,
    ApiKeyCreateResponse,
    ApiKeyMetadataResponse,
    LoginRequest,
    RegisterRequest,
    TokenResponse,
    UserResponse,
)

router = APIRouter()


def _to_user_response(user: User) -> UserResponse:
    return UserResponse(id=user.id, email=user.email, created_at=user.created_at)


def _to_api_key_metadata_response(api_key: UserApiKey) -> ApiKeyMetadataResponse:
    return ApiKeyMetadataResponse(
        id=api_key.id,
        name=api_key.name,
        prefix=api_key.prefix,
        created_at=api_key.created_at,
        last_used_at=api_key.last_used_at,
        revoked_at=api_key.revoked_at,
    )


@router.post("/register", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def register_user(payload: RegisterRequest, db: Session = Depends(get_db)) -> UserResponse:
    password_hash = hash_password(payload.password)
    try:
        user = create_user(db, email=payload.email, password_hash=password_hash)
    except UserAlreadyExistsError:
        raise HTTPException(status_code=409, detail="A user with this email already exists.")

    return _to_user_response(user)


@router.post("/login", response_model=TokenResponse)
def login_user(payload: LoginRequest, db: Session = Depends(get_db)) -> TokenResponse:
    try:
        user = authenticate_user(
            db,
            email=payload.email,
            password=payload.password,
            verify_password=verify_password,
        )
    except InvalidCredentialsError:
        raise HTTPException(status_code=401, detail="Invalid email or password.")

    access_token = create_access_token(subject=str(user.id))
    return TokenResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.JWT_ACCESS_TOKEN_EXPIRE_MINUTES * 60,
    )


@router.get("/me", response_model=UserResponse)
def get_me(current_user: User = Depends(get_current_user)) -> UserResponse:
    return _to_user_response(current_user)


@router.get("/api-keys", response_model=list[ApiKeyMetadataResponse])
def get_api_keys(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> list[ApiKeyMetadataResponse]:
    api_keys = list_user_api_keys(db, user_id=current_user.id)
    return [_to_api_key_metadata_response(api_key) for api_key in api_keys]


@router.post("/api-keys", response_model=ApiKeyCreateResponse, status_code=status.HTTP_201_CREATED)
def create_api_key(
    payload: ApiKeyCreateRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> ApiKeyCreateResponse:
    raw_api_key = generate_api_key()
    key_hash = hash_api_key(raw_api_key)
    prefix = get_api_key_prefix(raw_api_key)

    try:
        created_key = create_user_api_key(
            db,
            user_id=current_user.id,
            name=payload.name,
            key_hash=key_hash,
            prefix=prefix,
        )
    except ApiKeyNameConflictError:
        raise HTTPException(status_code=409, detail="An API key with this name already exists.")
    except ApiKeyNameInvalidError:
        raise HTTPException(status_code=422, detail="API key name cannot be blank.")
    except ApiKeyLimitReachedError:
        raise HTTPException(status_code=400, detail="API key limit reached (maximum 5 active keys).")

    return ApiKeyCreateResponse(
        id=created_key.id,
        name=created_key.name,
        prefix=created_key.prefix,
        created_at=created_key.created_at,
        last_used_at=created_key.last_used_at,
        revoked_at=created_key.revoked_at,
        api_key=raw_api_key,
    )


@router.delete("/api-keys/{key_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_api_key(
    key_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
) -> None:
    try:
        revoke_user_api_key(db, user_id=current_user.id, key_id=key_id)
    except ApiKeyNotFoundError:
        raise HTTPException(status_code=404, detail="API key not found.")
