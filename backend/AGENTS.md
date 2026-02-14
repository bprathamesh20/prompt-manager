# Backend Coding Patterns

This document defines coding patterns for the backend in this repository.

## 1. Layering Rules

Use a strict 3-layer structure:

- API layer: `app/api/...`
- DAL layer: `app/dal/...`
- Model layer: `app/models/...`

### API Layer Responsibilities

- Define routes, request parsing, and response models.
- Use Pydantic schemas for input/output contracts.
- Map domain/DAL errors to HTTP errors (`HTTPException`).
- Keep API handlers thin.

Do **not** write SQLAlchemy queries in API files.

### DAL Layer Responsibilities

- Own all SQLAlchemy queries and database mutations.
- Handle transaction boundaries (`commit`, `rollback`, `flush`).
- Return model objects (or minimal DAL return tuples) to API layer.
- Raise explicit DAL/domain exceptions (for example, `PromptVersionNotFoundError`).

Do **not** import FastAPI objects in DAL files.

### Model Layer Responsibilities

- Define SQLAlchemy ORM entities and relationships only.
- Keep business and transport logic out of models.
- Store table constraints/index behavior here.

## 2. Current File Mapping

- API: `app/api/v1/endpoints/prompts.py`
- API (auth): `app/api/v1/endpoints/auth.py`
- DAL: `app/dal/prompt_dal.py`
- DAL (auth): `app/dal/auth_dal.py`
- DAL (api keys): `app/dal/api_key_dal.py`
- Models: `app/models/prompt.py`
- Models (auth): `app/models/user.py`
- Models (api keys): `app/models/user_api_key.py`
- Schemas: `app/schemas/prompt.py`
- Schemas (auth): `app/schemas/auth.py`
- DB session/base: `app/db/session.py`, `app/db/base.py`

When adding a feature, add code in the matching layer, not across layers.

## 3. API Patterns

- Version routes under `/api/v1`.
- Validate query/body data via schema models before DAL calls.
- Convert ORM objects to response schemas in API helper functions (for example `_to_prompt_response`).
- Return proper status codes:
  - `200` for reads/updates
  - `201` for creates
  - `204` for deletes
  - `404` when DAL not-found exceptions are raised

## 4. DAL Patterns

- Prefer `select(...)` with explicit joins/options.
- Use eager loading where response mapping needs related entities:
  - `joinedload(...)`
  - `selectinload(...)`
- Normalize input values that affect persistence (for example tags via `strip()`).
- Wrap write operations with `try/except`, rollback on failure, then re-raise.
- If a write operation expects a persisted row, re-fetch and fail explicitly if missing.

## 5. Schema Patterns

- Keep request/response contracts in `app/schemas`.
- Use field constraints (`min_length`, `max_length`) consistently.
- Use model-level validators for cross-field rules.
- Keep response schemas stable and explicit.

## 6. Time and Timestamps

- Use timezone-aware UTC timestamps in backend writes:
  - `datetime.now(timezone.utc)`

## 7. Migrations and Schema Evolution

- Database shape is controlled by Alembic (`alembic/`).
- Model changes that affect schema require matching migration updates.
- Keep migration names descriptive and single-purpose.

## 8. Error Handling Conventions

- DAL raises domain errors (not HTTP errors).
- API translates domain errors to HTTP responses.
- Avoid exposing low-level DB exceptions directly to clients.

## 9. Naming and Style

- DAL functions should be verb-oriented and explicit:
  - `get_*`, `create_*`, `update_*`, `delete_*`
- Keep helper functions private with `_` prefix when used in one module.
- Keep imports grouped and minimal by layer.

## 10. What to Avoid

- SQL in API handlers.
- FastAPI dependencies in DAL.
- Response schema construction inside DAL.
- Mixing migration logic into runtime API/DAL code.

## 11. Auth Conventions

- Auth dependencies belong in API dependency modules (for example `app/api/deps/auth.py`).
- JWT parsing and password hashing belong in `app/core/security.py`.
- DAL raises auth domain errors (for example `UserAlreadyExistsError`, `InvalidCredentialsError`).
- API maps auth errors to HTTP status codes (`401`, `409`, `404` where appropriate).
- Prompt route access policy:
  - JWT required for writes (`POST`, `PUT`, `DELETE`).
  - Read route can accept JWT or user-specific `X-API-Key`.
- For user-owned data, ownership filtering must be enforced in DAL queries, not in API layer.
