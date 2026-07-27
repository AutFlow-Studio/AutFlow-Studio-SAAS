---
name: AutFlow Studio import setup
description: How the AutFlow Studio project was imported from a zip and what's running where.
---

## What was imported

Full-stack agency OS uploaded as `law3a_1785144750846.zip`. Extracted to `/tmp/law3a_extracted/law3a/`. Source files were copied to proper workspace locations.

## Final workspace layout

- Frontend: `artifacts/autflow-studio/` — React + Vite, port 22583, previewPath "/"
- API: `artifacts/api-server/` — Express 5, port 8080, previewPath "/api"
- DB schema: `lib/db/src/schema/` (14 tables + sessions)
- API hooks: `lib/api-client-react/src/generated/`
- OpenAPI spec: `lib/api-spec/openapi.yaml`
- Scripts: `scripts/src/migrate.ts`, `scripts/src/seed.ts`

## Dev login

- Email: admin@autflow.io
- Password: admin123

## Workflow setup

Managed workflows (do NOT use configureWorkflow for these):
- `artifacts/autflow-studio: web` (PORT + BASE_PATH injected by artifact system)
- `artifacts/api-server: API Server` (PORT injected by artifact system)

## Import procedure (for future reference)

1. Move the freshly-scaffolded artifact dir to `/tmp/<name>-backup` before calling `createArtifact` if files were already copied (createArtifact requires a clean slug).
2. After `createArtifact` succeeds, copy backed-up src files into the new scaffold.
3. Run `pnpm install` → `pnpm --filter @workspace/scripts run migrate` → `pnpm --filter @workspace/scripts run seed`.
4. Restart both workflows.

## Key gotchas

- `createArtifact` requires a clean slug — if the directory already exists, move it first then copy back after.
- pnpm-workspace.yaml catalog typo: `"@tailwindcss>@tailwindcss/oxide-win32-x64-msvc"` must be `"@tailwindcss/oxide>@tailwindcss/oxide-win32-x64-msvc"`.
- The vite dev config has NO `/api` proxy — in dev the Replit shared proxy handles `/api` → port 8080 routing. Do not add a vite proxy for `/api`.
- SESSION_SECRET env var is required by the API server (already set as a workspace secret).
- Migration creates sessions table; connect-pg-simple must NOT use `createTableIfMissing` (esbuild strips bundled SQL).
- Seed data is loaded; admin user already exists after migrate so seed skips it.

**Why:**
The artifact system prevents duplicate id registration; moving the dir first lets createArtifact scaffold the toml + workflow, then source files are overlaid on top.
