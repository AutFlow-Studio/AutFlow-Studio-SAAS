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

## AI features added (all in `artifacts/api-server/src/routes/ai.ts`)

Five endpoints, all under `requireAuth`, workspace-scoped via `req.session.workspaceId`:
- `POST /api/ai/chat` — SSE streaming assistant with full workspace context injected into system prompt
- `GET  /api/ai/briefing` — daily briefing (headline + 5 categories, JSON response)
- `GET  /api/ai/client-health/:clientId` — health score 0-100, status, reasons (JSON)
- `POST /api/ai/analyze-meeting` — notes → summary/decisions/actionItems/followUpTasks/clientIntel
- `POST /api/ai/smart-search` — natural language → answer + typed result list + insight

Uses `openai` npm package directly with user's `OPENAI_API_KEY` (gpt-4o-mini model).
`buildWorkspaceContext()` assembles all workspace data into a text snapshot scoped to `workspaceId`.

## Frontend AI components

- `src/components/ai-assistant.tsx` — floating ✨ button, SSE streaming chat panel
- `src/components/ai-briefing.tsx` — dashboard card, generate-on-demand daily briefing
- `src/components/client-health-badge.tsx` — popover badge on each client card
- `src/components/meeting-analyzer.tsx` — dialog: paste notes → analysis + one-click task creation
- `src/pages/search/index.tsx` — tabbed: Keyword Search + AI Smart Search panel

## Page wiring

- Dashboard: `AIBriefing` inserted above the stats grid
- Clients list: `ClientHealthBadge` added to each card footer (lazy-loaded on popover open)
- Meetings list: "Analyse Notes" button opens `MeetingAnalyzer` dialog
- Layout: `AIAssistant` floating button appended after `</main>`
- Search: tabbed layout with keyword + AI smart search

## Workflow setup

Managed artifact workflows (do NOT use configureWorkflow for these):
- `artifacts/autflow-studio: web`
- `artifacts/api-server: API Server`

After a fresh GitHub import, artifacts exist on disk but are NOT registered in the Replit system. `listArtifacts()` returns empty. Fix: move the artifact dir to /tmp, call `createArtifact`, copy source files back, remove old standalone `.replit` workflows that would hold the ports, kill lingering processes on those ports, then restart managed workflows.

The `jspdf` package must be installed as a dep of `@workspace/autflow-studio` — it is used in `src/pages/payments/index.tsx` but was missing from `package.json` in the repo.

## Import procedure (for future reference)

1. Move the freshly-scaffolded artifact dir to `/tmp/<name>-backup` before calling `createArtifact` if files were already copied.
2. After `createArtifact` succeeds, copy backed-up src files into the new scaffold.
3. For api-server (Express, not React): remove scaffold React files (`src/App.tsx`, `src/main.tsx`, `src/index.css`, `src/components`, `src/hooks`, `src/pages`) after restoring — esbuild will fail on case-sensitive `./app` import if `App.tsx` coexists.
4. The api-server artifact.toml must be fixed after `createArtifact`: port 8080 (not scaffold's assigned port), no BASE_PATH env, production config uses `node --enable-source-maps artifacts/api-server/dist/index.mjs` (not static serve).
5. Run `pnpm install` → `pnpm --filter @workspace/scripts run migrate` → `pnpm --filter @workspace/scripts run seed`.
6. Restart both workflows via `WorkflowsRestart` using exact managed names.

## Key gotchas

- `createArtifact` requires a clean slug — if the directory already exists, move it first then copy back after.
- pnpm-workspace.yaml catalog typo: `"@tailwindcss>@tailwindcss/oxide-win32-x64-msvc"` must be `"@tailwindcss/oxide>@tailwindcss/oxide-win32-x64-msvc"`.
- The vite dev config has NO `/api` proxy — in dev the Replit shared proxy handles `/api` → port 8080 routing.
- SESSION_SECRET env var is required by the API server (already set as a workspace secret).
- AI uses `openai` npm package with user's own `OPENAI_API_KEY` secret (Replit managed integration requires account upgrade).
- Replit AI Integrations require account upgrade — fall back to `requestSecrets({ keys: ["OPENAI_API_KEY"] })` and use openai SDK directly.

**Why:**
The artifact system prevents duplicate id registration; moving the dir first lets createArtifact scaffold the toml + workflow, then source files are overlaid on top. AI integration requires upgrade so we use the user's own key.

## Production deployment notes

The frontend's Vite config requires `PORT` and `BASE_PATH` even during a static production build. Keep those variables in the web artifact's `[services.production.build.env]` block; development-only service env is not reliably inherited by the publish build.

**Why:**
Without build-time values, publishing fails before the frontend bundle is generated, while the same app can still appear healthy in Preview.

**How to apply:**
When changing the web artifact's production build command or environment, validate `artifact.toml` and run the build with `PORT=22583 BASE_PATH=/ NODE_ENV=production` before publishing.
