# AutFlow Studio

An agency owner operating system — manage clients, projects, payments, documents, meetings, tasks, calendar, notifications, and reports in one place.

## Stack

- **Frontend:** React + Vite + Tailwind CSS + shadcn/ui (`artifacts/autflow-studio`)
- **Backend:** Express 5 API server (`artifacts/api-server`)
- **Database:** PostgreSQL via Drizzle ORM (`lib/db`)
- **Auth:** Session-based (express-session + connect-pg-simple)
- **Package manager:** pnpm workspaces

## Running the project

Both services start automatically via the configured workflows. To restart manually:

```bash
# API server (port 8080, serves /api/*)
pnpm --filter @workspace/api-server run dev

# Frontend (port 22583, serves /)
pnpm --filter @workspace/autflow-studio run dev
```

## Database

```bash
# Push schema changes
pnpm --filter @workspace/db run push

# Run migrations (idempotent — safe to run repeatedly)
cd scripts && pnpm run migrate

# Seed demo data (Velocity Creative Agency)
cd scripts && pnpm run seed
```

## Demo credentials

- **Admin:** `admin@autflow.io` / `admin123`
- **Team members:** `@velocitycreative.co` addresses / `member123`

## Required secrets

| Secret | Required | Notes |
|---|---|---|
| `SESSION_SECRET` | ✅ Yes | Already set |
| `OPENAI_API_KEY` | Optional | AI assistant features |
| `RESEND_API_KEY` | Optional | Email (password reset, verification) |

`DATABASE_URL` is provisioned automatically by Replit — do not set manually.

## Optional env vars (all have defaults)

- `LOG_LEVEL` — defaults to `info`
- `FROM_EMAIL` — defaults to `AutFlow Studio <onboarding@resend.dev>`
- `LOCAL_UPLOAD_DIR` — defaults to `<workspace>/data/uploads/`

## User preferences
