---
name: Client Portal feature
description: Full client portal system added to AutFlow Studio — separate auth, routes, pages, and agency management UI.
---

# Client Portal

## What was built
A complete client-facing portal allowing external clients to log in and view their own data.

## Architecture
- **Separate auth session**: Portal users use `clientPortalUserId`/`clientPortalClientId`/`clientPortalWorkspaceId` session keys — completely separate from team user sessions (`userId`).
- **Separate table**: `client_portal_users` (not `users`) — one row per client account.
- **Messages table**: `client_portal_messages` — the only communication channel with clients; internal `notes` are never exposed.

## Security rules
- All portal data queries filter by BOTH `workspaceId` AND `clientId` from the session (never from user input).
- `ownerNotes` on `projectsTable` is NEVER selected in portal queries.
- Documents are filtered by `shared_with_client = TRUE` — agency must explicitly share each doc.
- Internal `notesTable` records are never exposed to clients.

## New files
- `lib/db/src/schema/client-portal-users.ts` — schema
- `lib/db/src/schema/client-portal-messages.ts` — schema
- `artifacts/api-server/src/routes/portal.ts` — all portal API routes (both `/portal/*` and `/portal-admin/*`)
- `artifacts/api-server/src/middleware/auth.ts` — added `requireClientPortalAuth`
- `artifacts/autflow-studio/src/components/portal-auth-provider.tsx`
- `artifacts/autflow-studio/src/components/portal-layout.tsx`
- `artifacts/autflow-studio/src/components/portal-access-panel.tsx` — agency UI to grant/revoke access
- `artifacts/autflow-studio/src/components/portal-messages-panel.tsx` — agency message thread
- `artifacts/autflow-studio/src/pages/portal/` — login, dashboard, projects, project-detail, documents, payments, messages

## Schema changes
- `documents.shared_with_client BOOLEAN DEFAULT FALSE` — added
- Migration added to `scripts/src/migrate.ts` (idempotent, safe to re-run)

## Routing
- `/portal` routes are handled by `PortalGate` in App.tsx — completely separate from agency `AgencyAuthGate`
- Portal routes mount BEFORE the team `requireAuth` gate in `routes/index.ts`

## Agency management
- Client detail page → "Portal Access" tab: grant credentials, suspend, revoke
- Portal API base: `/api/portal/*` (client-facing), `/api/portal-admin/*` (agency-facing)

## **Why:**
Clients are agency customers who need read-only visibility into their own data only. Using a separate session key prevents any possibility of privilege escalation between portal and team sessions.
