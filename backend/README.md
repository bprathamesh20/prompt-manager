# Backend Auth Notes

## Required Environment Variables

Create `backend/.env` from `backend/.env.example` and set:

- `DATABASE_URL`
- `JWT_SECRET_KEY`
- `JWT_ALGORITHM` (default `HS256`)
- `JWT_ACCESS_TOKEN_EXPIRE_MINUTES` (default `1440`)

## Auth Endpoints

- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/api-keys`
- `GET /api/v1/auth/api-keys`
- `DELETE /api/v1/auth/api-keys/{key_id}`

API key behavior:
- Raw key value is returned only when created.
- Maximum 5 active keys per user.

## Prompt Access Rules

- `GET /api/v1/prompts`: JWT user scope or read-only user API key (`X-API-Key`)
- `POST /api/v1/prompts`: JWT required
- `PUT /api/v1/prompts/{id}`: JWT required and ownership enforced
- `DELETE /api/v1/prompts/{id}`: JWT required and ownership enforced

## Migration

The auth/ownership migration is destructive for prompt data:

- Adds `users` table
- Recreates prompt tables with `owner_id`
- Existing prompts are dropped as part of schema transition
