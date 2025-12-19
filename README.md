# SUPFile Backend Starter (NestJS + Prisma + PostgreSQL)

This is a **starter backend** for the SUPFile "cloud storage" project:
- REST API (JSON)
- PostgreSQL for metadata (users, file tree, shares, trash)
- Files stored on disk (Docker volume) — **NOT** in the database
- Auth: Local (email/password) + JWT access/refresh
- OAuth2: Passport-ready stubs (Google/GitHub/Microsoft) to complete

## Prerequisites
- Node.js 20+
- Docker + Docker Compose (recommended)
- (Optional) pnpm

## Quick start (Docker)
1. Copy environment file:
   ```bash
   cp .env.example .env
   ```
2. Start Postgres:
   ```bash
   docker compose up -d db
   ```
3. Install dependencies:
   ```bash
   npm install
   ```
4. Run migrations:
   ```bash
   npm run prisma:migrate
   ```
5. Start API (dev):
   ```bash
   npm run start:dev
   ```

API should be available at: `http://localhost:3001`

## Endpoints (starter)
- `GET /health`
- `POST /auth/register`
- `POST /auth/login`
- `POST /auth/refresh`
- `POST /auth/logout`
- `GET /auth/me` (JWT protected)

Files/Tree/Share endpoints are scaffolded as modules for you to implement.

## Prisma
- Edit `prisma/schema.prisma`
- Generate client:
  ```bash
  npm run prisma:generate
  ```

## Notes
- **No secrets** should be committed: keep real values in `.env` only.
- Store uploaded files under `STORAGE_ROOT` (default: `./storage`).

