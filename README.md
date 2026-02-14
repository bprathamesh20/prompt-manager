# Prompt Manager

Prompt Manager is a scaffolding-first monorepo for managing versioned prompts with tags.

## Stack

- Backend: FastAPI + SQLAlchemy + Alembic + Postgres + JWT auth
- Frontend: Vite + React + shadcn baseline
- Infra: Docker Compose

## Repository Layout

- `backend/` FastAPI service and migrations
- `frontend/` Vite web app and API client wrapper
- `docker-compose.yml` local orchestration
- `plan.md` project PRD + milestone plan

## Local Development

1. Create environment files:
- `cp .env.example .env`
- `cp backend/.env.example backend/.env`
- `cp frontend/.env.example frontend/.env`

2. Start services:
- `docker compose up --build`

3. Run migrations after containers are up:
- `docker compose exec backend alembic upgrade head`

4. Open apps:
- Frontend: `http://localhost:5173`
- Backend docs: `http://localhost:8000/docs`

## Port Configuration

Host ports are configurable in root `.env`:

- `POSTGRES_PORT`
- `BACKEND_PORT`
- `FRONTEND_PORT`

If you change `BACKEND_PORT`, also set `VITE_API_BASE_URL` so the frontend continues to call the correct backend URL.
If you change `FRONTEND_PORT`, also update `FRONTEND_ORIGINS` in `backend/.env`.

## API Convention

All backend endpoints are versioned under `/api/v1`.

## Auth Environment

Set these in `backend/.env`:

- `JWT_SECRET_KEY`
- `JWT_ALGORITHM` (default `HS256`)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default `1440`)

## Quick Auth API Usage

Register:

```bash
curl -X POST http://localhost:8000/api/v1/auth/register \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Login:

```bash
curl -X POST http://localhost:8000/api/v1/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"user@example.com","password":"password123"}'
```

Read current user:

```bash
curl http://localhost:8000/api/v1/auth/me \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Create user API key (returns raw key once):

```bash
curl -X POST http://localhost:8000/api/v1/auth/api-keys \
  -H "Authorization: Bearer <JWT_TOKEN>" \
  -H "Content-Type: application/json" \
  -d '{"name":"ci-read-key"}'
```

Notes:
- The raw `api_key` is returned only at creation time.
- Each user can hold up to 5 active API keys.

List user API keys (metadata only):

```bash
curl http://localhost:8000/api/v1/auth/api-keys \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Revoke user API key:

```bash
curl -X DELETE http://localhost:8000/api/v1/auth/api-keys/<KEY_ID> \
  -H "Authorization: Bearer <JWT_TOKEN>"
```

Read prompts with a user API key:

```bash
curl "http://localhost:8000/api/v1/prompts?name=movie-critic" \
  -H "X-API-Key: <USER_API_KEY>"
```

Read only latest matching version:

```bash
curl "http://localhost:8000/api/v1/prompts?name=movie-critic&tag=prod&latest=true" \
  -H "X-API-Key: <USER_API_KEY>"
```

## Implemented Scope

- Prompt CRUD/version/tag flow (MVP)
- JWT auth (register/login/me) and protected frontend route
- User-owned prompts
- User-specific API key management (create/list/revoke)
- Read-only integration access via `X-API-Key` (scoped to key owner)

## Deferred v1

- Refresh-token/session management
- Python SDK packaging
- Production hardening and observability

## License

MIT. See `LICENSE`.
