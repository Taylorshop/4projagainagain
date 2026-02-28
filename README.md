# SUPFile

Cloud storage web app built with NestJS, React/Vite, PostgreSQL, and Azure Blob Storage.


## Quick start (Docker)

This is the recommended way — spins up the database, storage emulator, backend, and frontend in one command.

### 1. Clone and configure

```bash
git clone <repo-url>
cd 4projagainagain
cp .env.example .env
```

Edit `.env` and fill in at minimum:

```env
JWT_ACCESS_SECRET="a-long-random-string"
JWT_REFRESH_SECRET="another-long-random-string"
```

Google OAuth is optional for local development. If you skip it, the "Continue with Google" button will not work.

### 2. Start

```bash
docker compose up --build
```

- Frontend: http://localhost:3000
- Backend API: http://localhost:3001
- Azurite (blob emulator): http://localhost:10000

Prisma migrations run automatically on backend startup.

---


### Prerequisites

- Node.js 20+
- PostgreSQL 16 running locally (or use `docker compose up db azurite` for just the services)



## Environment variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | Backend listen port | `3001` |
| `DATABASE_URL` | PostgreSQL connection string | see `.env.example` |
| `JWT_ACCESS_SECRET` | Secret for access tokens | **required** |
| `JWT_REFRESH_SECRET` | Secret for refresh tokens | **required** |
| `JWT_ACCESS_EXPIRES_IN` | Access token TTL | `15m` |
| `JWT_REFRESH_EXPIRES_IN` | Refresh token TTL | `7d` |
| `STORAGE_ROOT` | Temp directory for multer uploads | `./storage` |
| `AZURE_STORAGE_CONNECTION_STRING` | Azure Blob connection string (leave empty to use Azurite) | `` |
| `AZURE_STORAGE_CONTAINER` | Blob container name | `supfile` |
| `CORS_ORIGIN` | Allowed frontend origin | `http://localhost:3000` |
| `FRONTEND_URL` | Used for OAuth redirects | `http://localhost:3000` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID | `` |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret | `` |
| `GOOGLE_CALLBACK_URL` | Google OAuth redirect URI | `http://localhost:3001/auth/oauth/google/callback` |

---

## Google OAuth setup (optional)

1. Go to [Google Cloud Console](https://console.cloud.google.com/) → APIs & Services → Credentials
2. Create an **OAuth 2.0 Client ID** (Web application)
3. Add the authorised redirect URI: `http://localhost:3001/auth/oauth/google/callback`
4. Copy the client ID and secret into `.env`

---

## Useful commands

```bash
# Backend
npm run start:dev       # Start with hot reload
npm run build           # Compile TypeScript
npm run lint            # ESLint (0 warnings policy)

# Prisma
npx prisma migrate dev  # Create and apply a new migration
npx prisma migrate deploy # Apply pending migrations (used in production/Docker)
npx prisma studio       # Open Prisma Studio (DB browser)
npx prisma generate     # Regenerate the Prisma client

# Frontend
npm run dev             # Start Vite dev server
npm run build           # Production build
```
