# SUPFile Project Memory

## Architecture
- **Backend**: NestJS + Prisma + PostgreSQL (root directory)
- **Frontend**: React + Vite + TailwindCSS (`frontend/` subdirectory)
- **Storage**: Local disk, structured as `{STORAGE_ROOT}/{userId}/{itemId}`
- **Auth**: JWT (access 15m + refresh 7d) + Argon2 hashing + Google OAuth2

## Key paths
- Backend source: `src/modules/{auth,files,shares,users,prisma}/`
- Frontend source: `frontend/src/{api,components,pages,store,types,utils}/`
- Database schema: `prisma/schema.prisma`
- Docker setup: `docker-compose.yml` (db + backend + frontend), `Dockerfile` (backend), `frontend/Dockerfile`

## Important conventions
- DTOs require `!` definite assignment (strict TypeScript): `name!: string`
- Frontend directory must be excluded from backend tsconfig (`frontend` in exclude array)
- BigInt from Prisma is serialised via `(BigInt.prototype as any).toJSON` in main.ts
- File preview URL uses JWT token via Authorization header (fetch); image/video served directly
- `STORAGE_ROOT` env var controls where files are stored on disk

## API endpoints summary
- Auth: POST /auth/register|login|refresh|logout, GET /auth/me, GET /auth/oauth/google{,/callback}
- Files: GET|POST /files, GET /files/trash|search, CRUD /files/:id, GET /files/:id/download|preview|zip
- Shares: POST|GET|DELETE /shares, GET /shares/public/:token{,/download}
- Users: GET /users/me/quota, PATCH /users/me/password|profile
