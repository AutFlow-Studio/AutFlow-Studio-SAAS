---
name: Production Readiness Audit
description: Findings and fixes from the full production readiness audit of AutFlow Studio.
---

# Production Readiness Audit Findings & Fixes

## Security fixes applied

### Critical BOLA — deliverables.ts (FIXED)
All four deliverable endpoints had no workspace isolation:
- GET /projects/:projectId/deliverables — now verifies project.workspaceId = session.workspaceId before returning
- POST /projects/:projectId/deliverables — same check before inserting
- PATCH /deliverables/:id — now joins through projectsTable to verify workspace ownership
- DELETE /deliverables/:id — same join-based check

**Pattern used:** `INNER JOIN projectsTable ON deliverables.projectId = projects.id WHERE projects.workspaceId = wid`

### Cross-workspace info leaks (FIXED)
These were low-risk (display-only) but fixed for defense-in-depth:
- tasks.ts: `inArray` lookups for client/project names now include `eq(workspaceId, wid)` filter
- payments.ts: POST and PATCH client name lookups now include workspace filter
- notes.ts: POST and PATCH client name lookups now include workspace filter

## TypeScript errors fixed (all were pre-existing)
- `objectStorage.ts`: `signed_url` property access on `unknown` — added type assertion
- `ai.ts`: `lastMeeting.m?.date` — meeting query uses plain select, removed `.m` wrapper
- `calendar.ts`: `paymentsTable.due_date` — corrected to camelCase `dueDate`
- `storage.ts`: `req.params.id` typed as `string | string[]` in Express 5 — coerced to string
- `meeting-analyzer.tsx`: `createTask.mutateAsync` called with flat body, but expects `{ data: TaskInput }` — wrapped in data key
- `dashboard.tsx`: local `DashboardStats` type alias was conflicting — replaced with direct import from api-client-react

## OpenAPI spec updated
Added missing fields to `DashboardStats` schema: `mrr`, `overdueInvoiceCount`, `overdueAmount`, `completionRate`, `healthScore`, `inactiveClients`, `healthBreakdown`.
Ran `pnpm --filter @workspace/api-spec run codegen` to regenerate types.

## Database
Added missing index: `idx_deliverables_project_id ON deliverables(project_id)` in migrate.ts.
Removed duplicate export lines in `lib/api-client-react/src/index.ts`.

## Architecture decisions confirmed sound
- Auth: session-based with bcryptjs, rate limiting on login/forgot-password, constant-time compare
- Multi-tenancy: every business table has workspace_id; all routes (except deliverables, now fixed) check it
- Email: Resend integration with graceful fallback to console.warn when key missing
- Storage: MIME allowlist + 50MB cap + UUID path isolation for local fallback
- CORS: `origin: true` with `sameSite: lax` — safe for Replit proxy environment
- AI: graceful 503 when OPENAI_API_KEY missing, workspace-scoped context snapshots
