# Prompt Manager Scaffolding Plan (PRD + Milestones)

## 1. Project Overview

Prompt Manager is a scaffolding-first monorepo for versioned prompts with tagged releases.
The first delivery focuses on runnable project foundations and explicit contracts, not full feature completion.

## 2. Goals and Non-Goals

### Goals

- Establish a consistent monorepo structure for backend, frontend, and infra.
- Scaffold FastAPI + SQLAlchemy + Alembic + Postgres backend.
- Scaffold Vite + React + shadcn baseline frontend.
- Provide Docker Compose orchestration for local development.
- Define initial API and schema contracts for prompt versioning flows.

### Non-Goals (Scaffold Milestone)

- Full prompt CRUD/versioning business implementation.
- Production authn/authz.
- Python SDK packaging.
- Production SLO/monitoring hardening.

## 3. Locked Tech Stack

- Backend: FastAPI, SQLAlchemy, Alembic, Postgres
- Frontend: Vite, React, shadcn baseline
- Infra: Docker Compose (single file)
- API versioning: `/api/v1/...`

## 4. System Architecture

### Components

- Frontend web app (`frontend/`) calls backend via `VITE_API_BASE_URL`.
- Backend API (`backend/`) exposes versioned REST endpoints under `/api/v1`.
- Postgres stores prompt entities and version/tag relationships.
- Alembic owns schema evolution as the source of truth.

### High-Level Data Flow

1. User loads frontend.
2. Frontend calls backend health endpoint.
3. Backend checks DB connectivity.
4. Backend returns service + database status.

## 5. Milestone Plan (Scaffolding-Focused)

### Milestone 1: Monorepo Scaffold

- Create root layout (`backend/`, `frontend/`, root docs/configs).
- Add `README.md`, `.gitignore`, and env conventions.
- Standardize API prefix to `/api/v1`.

### Milestone 2: Backend Foundation

- Initialize FastAPI app and versioned routers.
- Add `GET /api/v1/health` endpoint.
- Configure SQLAlchemy engine/session from environment.
- Set up Alembic and baseline migration.
- Add placeholder domain models/modules for prompts, versions, and tags.

### Milestone 3: Frontend Foundation

- Initialize Vite + React TypeScript app.
- Add shadcn baseline config and base UI components.
- Build a minimal route shell.
- Add typed `PromptApiClient` wrapper.
- Wire frontend to backend health check.

### Milestone 4: Local Orchestration

- Add one `docker-compose.yml` for `postgres`, `backend`, `frontend`.
- Configure persistent Postgres volume.
- Wire service dependencies and env files.
- Document local startup and migration flow.

### Milestone 5: Deferred v1 Notes (Brief)

- Full prompt CRUD/version/tag behavior.
- Authentication and authorization.
- Python SDK package.
- Production hardening and observability.

## 6. Initial Public Interfaces

### Backend Endpoints (Scaffold Contracts)

- `GET /api/v1/health` -> service and DB readiness.
- `GET /api/v1/prompts` -> retrieval contract by `name` with optional `tag`.
- `POST /api/v1/prompts` -> creation contract for a prompt version payload.

### Request/Response Contracts

- `PromptCreateRequest`: `name`, `content`, optional `tag`, optional `metadata`.
- `PromptLookupQuery`: `name` (required), `tag` (optional).
- `PromptVersionResponse`: `id`, `prompt_id`, `name`, `content`, `version`, `tag`, timestamps.

### Frontend Interface

- `PromptApiClient` with typed methods:
  - `getHealth()`
  - `getPrompts(query)`
  - `createPrompt(payload)`
- Environment contract: `VITE_API_BASE_URL`

### Database Contracts

- `prompts`
- `prompt_versions`
- `prompt_tags`

These are scaffolded with initial migration and may evolve in v1 implementation.

## 7. Environment and Deployment (Docker Compose)

Services:

- `postgres` (persistent volume + healthcheck)
- `backend` (FastAPI, mounted source for development)
- `frontend` (Vite dev server, mounted source for development)

Expected local workflow:

1. Copy env examples to `.env` files in `backend/` and `frontend/`.
2. Run `docker compose up --build`.
3. Run `docker compose exec backend alembic upgrade head`.
4. Open frontend and backend docs URLs.

## 8. Risks and Mitigations

- Risk: Scaffold drifts from future domain needs.
  - Mitigation: keep explicit contracts and versioned APIs from day one.
- Risk: Local environment inconsistency across developers.
  - Mitigation: single compose file and env templates.
- Risk: Overbuilding before validating usage.
  - Mitigation: keep scaffold minimal and defer feature complexity to v1.

## 9. Deferred v1 Notes

- Implement persistence-backed prompt CRUD/version/tag endpoints.
- Add authn/authz layer.
- Design and ship Python client SDK.
- Add production-grade telemetry, retries, and deployment checks.

## Acceptance Criteria

- New developer can clone, configure env, run compose, and view healthy frontend/backend.
- Backend and frontend scaffolds are modular enough for feature expansion.
- API and data contracts are explicit enough to begin v1 implementation without redesign.
