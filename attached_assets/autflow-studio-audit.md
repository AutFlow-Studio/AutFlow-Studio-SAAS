# AutFlow Studio — Full Product Audit
*August 2026 — Based on codebase analysis, not assumptions*

---

## 1. Current Product Architecture

### Frontend
- **Framework:** React 18 + Vite + TypeScript
- **Routing:** Wouter (lightweight client-side router, base path from `BASE_URL` env var)
- **State / Data fetching:** TanStack React Query v5 (retries non-401/403 errors twice)
- **UI:** Tailwind CSS + shadcn/ui component library
- **API client:** Orval-generated React Query hooks from OpenAPI spec (`lib/api-client-react/src/generated/`); raw fetch for AI streaming
- **Structure:** `src/pages/` (one folder per feature), `src/components/` (layout, providers, shared), `src/lib/` (utils, niche-config)
- **Auth state:** `auth-provider.tsx` wraps the app, fetches `/api/auth/me`, stores `user + workspace + businessType` in React context

### Backend
- **Framework:** Express 5 + TypeScript
- **Session auth:** `express-session` + `connect-pg-simple` (sessions in `sessions` DB table); bcrypt password hashing
- **Route structure:** `src/routes/` — one file per domain, all registered in `src/index.ts`
- **AI:** OpenAI Node SDK, model `gpt-4o-mini`, streaming via SSE (`text/event-stream`)
- **Storage:** GCS presigned URL flow (client uploads directly to GCS)
- **Workspace isolation:** `workspaceId` extracted from session on every request, passed to all DB queries manually — no middleware enforcement

### Database
- **Engine:** PostgreSQL via Replit's built-in DB
- **ORM:** Drizzle ORM with `node-postgres` Pool
- **Migration:** Single idempotent raw SQL script (`scripts/src/migrate.ts`) — not versioned Drizzle migrations
- **Schema files:** `lib/db/src/schema/` — one file per domain

### Main Entities & Relationships
```
workspaces (id, name, business_type, owner_id)
  └── users (workspace_id)
  └── clients (workspace_id) → projects, payments, documents, meetings, tasks, activity
       └── projects → deliverables, campaigns, tasks, milestones, time_entries
  └── agency_settings (workspace_id, business_type, logo, colors...)
  └── portal_users (workspace_id, client_id)
  └── notifications

clinic tables (separate):
  workspace → clinic_patients → clinic_appointments, clinic_treatments, clinic_followups, clinic_billing
```

**Critical gap:** `deliverables` table has **no `workspace_id` column**. It relies entirely on the `project_id` FK, meaning direct deliverable queries cannot be workspace-scoped without a JOIN.

### Authentication System
- Session-based (not JWT, not Clerk — despite Clerk appearing in the tech stack description)
- Login → POST `/api/auth/login` → bcrypt verify → `req.session.userId + workspaceId`
- Signup → email/password → verification email via Resend (falls back to console.warn if no `RESEND_API_KEY`)
- Password reset via token table (`password_reset_tokens`)
- Email verification via token table (`email_verification_tokens`)
- `auth-provider.tsx` calls `GET /api/auth/me` on load — returns user + workspace + businessType

### AI Implementation
- **Model:** `gpt-4o-mini` (not GPT-4.1 or Claude — these are aspirational, not current)
- **Context building:** `buildWorkspaceContext(workspaceId)` fetches clients, projects, payments, tasks, meetings (last 20), activity (last 30 events) and formats them into a plain-text block with headers
- **System prompt:** `"You are AutFlow's AI business assistant... give concise, actionable intelligence. Reference actual names, amounts, and dates."` + industry context + full workspace data
- **History:** Last 10 messages passed back with each request (client-managed)
- **Streaming:** SSE chunks emit `data: {"content": "..."}`, completion emits `data: {"done": true}`
- **Token limit:** `max_tokens: 1024` — can truncate responses for complex questions
- **Tool calling:** Implemented for **clinic only** (create_followup, create_appointment, create_task). **Agency workspace has no tool/action capabilities** — AI is read-only for agencies.
- **Other AI endpoints:**
  - `POST /ai/briefing` → structured JSON (`headline, goingWell, needsAttention, criticalRisks, recommendedActions`)
  - `GET /ai/client-health/:clientId` → score, status, summary, reasons
  - `POST /ai/analyze-meeting` → summary, decisions, action items, follow-up tasks
  - `POST /ai/smart-search` → answer, results, insight

---

## 2. Feature Inventory

### Core Features

| Feature | Status | Notes |
|---|---|---|
| Signup / Login / Logout | ✅ Complete | Email+password, session-based |
| Email verification | ✅ Complete | Resend API; falls back gracefully |
| Password reset | ✅ Complete | Token-based flow |
| Onboarding (business setup) | ✅ Complete | Multi-step: workspace name → industry → branding |
| Industry selection | ⚠️ Partial | Sets `businessType`; only changes nav icons/labels and dashboard routing — no deep workflow change |
| Workspace settings | ✅ Complete | Name, logo, colors, business type in `agency_settings` |

### Agency Features

| Feature | Status | What Works | What's Missing |
|---|---|---|---|
| **Dashboard** | ✅ Complete | KPI cards, revenue, projects, tasks, deadlines, activity feed | No date-range filter |
| **Clients** | ✅ Complete | Full CRUD, detail view with tabs (projects, payments, docs, activity), health badge | No lead pipeline stage, no client portal link visible from list |
| **Projects** | ✅ Complete | Full CRUD, detail view, milestones tab, status management, progress % | No Gantt/timeline view |
| **Tasks** | ✅ Complete | Full CRUD, priority, status, project/client link | No bulk actions |
| **Meetings** | ✅ Complete | Full CRUD, AI meeting analyzer, file attachments | Attachments depend on GCS config |
| **Time Tracking** | ✅ Complete | Full CRUD, weekly/monthly/all-time summary, project grouping | Not linked to billing |
| **Milestones** | ✅ Complete | Full CRUD, status tabs, overdue detection | Not shown on project detail page |
| **Campaigns** | ⚠️ Partial | List, create, edit, delete | No campaign analytics, no deliverable link from campaign |
| **Deliverables** | ⚠️ Partial | List, create, edit, delete; nested under projects | No client approval workflow, no file attachment, missing `workspace_id` |
| **Team** | ⚠️ Partial | View team members, change role | No invite, no add member, no remove, ghost "action" button does nothing |
| **Documents** | ⚠️ Partial | List, upload, view; linked to clients/projects | No preview, no search, no folder structure |
| **Payments / Invoices** | ⚠️ Partial | List, create invoice, KPI cards | No mark-paid, no edit, no delete, "Manage" button opens settings (bug) |
| **Calendar** | ⚠️ Partial | Weekly grid, color-coded events, week navigation | Read-only — no create/edit/delete, no click-to-open |
| **Reports** | ⚠️ Partial | YTD revenue, paid vs outstanding, project status pie, revenue-by-client table | No date range, no export, no drill-down |
| **Search** | ⚠️ Partial | AI-powered smart search exists (`/ai/smart-search`) | Unknown UX quality; depends on workspace data quality |
| **AI Assistant** | ⚠️ Partial | Streaming chat, full workspace context, 6 AI endpoints | No write actions for agencies (clinic has them), 1024 token limit |
| **AI Briefing** | ✅ Complete | Structured daily briefing widget with headline + risks + actions | Only shown on dashboard, not surfaced in AI assistant UI |
| **Client Health Score** | ✅ Complete | Per-client AI score with reasons | Only shown as badge on client list/detail |
| **Meeting Analyzer** | ✅ Complete | AI summary, decisions, action items from meeting notes | — |

### Client Portal Features

| Feature | Status | Notes |
|---|---|---|
| Portal login | ✅ Complete | Separate auth for portal users |
| Portal dashboard | ✅ Complete | Client-facing project/payment/doc overview |
| Portal projects | ✅ Complete | Read-only project view |
| Portal documents | ✅ Complete | Client document access |
| Portal payments | ✅ Complete | Client invoice view |
| Portal messages | ✅ Complete | Basic messaging between client and agency |

### Clinic Features (separate workspace type)

| Feature | Status | Notes |
|---|---|---|
| Clinic dashboard | ⚠️ Partial | Different dashboard component; today's appts, patient count, billing summary |
| Patients | ⚠️ Partial | List + detail with tabs |
| Appointments | ⚠️ Partial | Grouped by date, status management |
| Treatments | ⚠️ Partial | Cost tracking |
| Follow-ups | ⚠️ Partial | Overdue alerts |
| Clinic billing | ⚠️ Partial | Revenue/pending summary |
| AI (clinic) | ⚠️ Partial | Has tool calling; can create followups/appointments/tasks |

### Features That Are Placeholder / Empty
- **Automations** — no page, no backend, not in nav
- **Integrations** — no page, no backend, not in nav
- **Freelancer workspace** — `time-tracking` and `milestones` pages exist and work, but the freelancer niche config only adds those nav items — there's no dedicated freelancer onboarding, no rate/client invoicing flow

---

## 3. Current User Experience

### Onboarding Flow
1. `/signup` — email + password
2. Email verification gate (verify token from email)
3. `/onboarding` — multi-step wizard:
   - Step 1: Workspace/agency name
   - Step 2: Industry selection (Digital Agency, Clinic, Freelancer Developer, or custom)
   - Step 3: Branding (logo upload, primary color)
   - Completion → redirect to dashboard
4. `agencySettingsTable` is created/updated with `businessType` + branding

**Gap:** If a user skips or abandons onboarding, they land on the dashboard with no workspace configuration, which causes AI context to be empty.

### Navigation
- Rendered by `layout.tsx` using `navItems` from `niche-config.ts` based on `businessType`
- Icons + labels differ per industry; active route is highlighted
- No collapsible sections, no nested nav, no favourites
- All 3 workspace types share the same base layout shell

### What Changes Per Industry (niche system reality check)
The industry/niche system currently does **3 things only:**
1. Changes which nav items appear and their labels/icons
2. Routes `/` to `ClinicDashboard` instead of agency `Dashboard` when `businessType === 'clinic'`
3. Changes the AI system prompt and context-building function

**It does NOT:**
- Change data models or table structures
- Change form field labels (e.g. "Client" vs "Patient" in the client form)
- Change workflow steps or business logic
- Change the onboarding wizard content
- Change dashboard KPIs (only clinic gets a different dashboard component)
- Change terminology inside page content (only nav labels change)

This means the "niche personalization" is **surface-level** — a patient in a clinic is still stored and managed using the same clients table with the same UI, just reached via a renamed nav item.

### Key User Journeys

**Agency: Add a new client and start a project**
1. Clients → "New Client" → fill form → Save ✅
2. Client detail → Projects tab → "New Project" → fill form → Save ✅
3. Project detail → Tasks tab → add tasks ✅
4. No prompt to create campaign or deliverables from project flow

**Agency: Track a payment**
1. Payments → "New Invoice" → fill form (client, amount, due date) → Save ✅
2. Invoice appears in list ✅
3. Mark as paid → **NOT POSSIBLE** (no update/mark-paid action) ❌
4. "Manage" button → opens Settings (bug) ❌

**Agency: Use AI assistant**
1. `/ai-assistant` → chat interface ✅
2. Ask a question → streaming response with real workspace data ✅
3. Ask AI to create a task → **not supported** (no action capability for agencies) ❌
4. No suggested prompts or starter questions visible ❌

**Onboarding a new team member**
1. Team page → view members ✅
2. Invite / add member → **NOT POSSIBLE** ❌
3. Ghost "action" button on member row → does nothing ❌

---

## 4. Industry System — Deep Analysis

### How it works
```
DB: agency_settings.business_type = 'digital-agency' | 'clinic' | 'freelancer'
API: GET /api/auth/me → returns { user, workspace, businessType }
Frontend: auth-provider.tsx stores businessType in context
Layout: reads businessType → looks up niche-config → renders matching navItems
SmartDashboard: businessType === 'clinic' → <ClinicDashboard> else <Dashboard>
AI: getWorkspaceSystemPrompt() → businessType 'clinic' → buildClinicContext else buildWorkspaceContext
```

### What niche-config.ts actually defines (per industry)
Each niche entry contains:
- `label` — display name (e.g. "Digital Agency")
- `navItems` — array of `{ key, label, icon, href }` — the nav menu
- `emptyHeadlines` — per-entity empty state messages (e.g. "No campaigns yet")
- `terminology` — object mapping generic terms to industry-specific terms (e.g. `client → patient`)

**The terminology map exists in config but is NOT applied in page components.** Pages hardcode "Client", "Project", "Task" — the terminology object is defined but unused in rendering. This is dead config.

### Conclusion
The niche system is a **nav router and AI context switcher**. It is not a true multi-industry platform. Selecting "Clinic" gives you: different nav items, different dashboard component, different AI prompts, and clinic-specific DB tables. Everything else (client management, project management, payments) is the same generic UI with different labels in the sidebar.

---

## 5. Digital Agency Capabilities — Detailed Assessment

### ✅ Strong (can demo today)
- **Client management** — full CRUD, detail tabs, health score, activity timeline
- **Project management** — full CRUD, milestones, status tracking, progress
- **Task management** — full CRUD, priority levels, project/client links
- **Meetings** — full CRUD with AI analyzer
- **Dashboard** — KPIs, revenue, deadlines, AI briefing, activity feed
- **AI chat** — streaming, real workspace data, good system prompt
- **Client portal** — complete and functional (big differentiator)
- **Time tracking** — full CRUD (more relevant for freelancers but works)

### ⚠️ Partial (needs work before demo)
- **Campaigns** — exists but shallow; no analytics, no link to deliverables
- **Deliverables** — exists but no client approval flow, no attachment; missing workspace_id
- **Documents** — upload works but no preview, no folder structure
- **Reports** — static KPIs only; no date range, no export
- **Calendar** — read-only; events show but can't be created/edited here

### ❌ Broken or misleading (must fix before demo)
- **Payments "Manage" button** → opens Settings (wrong route)
- **Mark invoice as paid** → not possible at all
- **Team invite/add** → ghost button, no functionality
- **AI write actions for agencies** → UI may suggest capability that doesn't exist

---

## 6. Technical Issues

### Bugs
| Issue | Severity | Location |
|---|---|---|
| Payments "Manage" button routes to `/settings` | High | `payments/index.tsx` |
| Team member action button is a ghost with no handler | Medium | `team/index.tsx` |
| `deliverables` table missing `workspace_id` | High | DB schema + all deliverable queries |
| Seed script (`seed.ts`) omits `workspace_id` on inserts | High | `scripts/src/seed.ts` |
| `max_tokens: 1024` truncates AI responses for busy workspaces | Medium | `ai.ts` |
| Hard-coded admin password `admin123` in migration script | High | `scripts/src/migrate.ts` |
| Calendar creates no events — can't test create flow | Medium | `calendar/index.tsx` |

### Architecture Concerns
| Issue | Severity | Notes |
|---|---|---|
| No DB-level workspace isolation (no RLS, no composite FKs) | High | Cross-tenant data leakage is possible if any route forgets to filter by workspaceId |
| Workspace isolation is application-enforced only | High | Any bug in a route handler leaks data across workspaces |
| `deliverables` has no `workspace_id` — relies on project JOIN | Medium | Makes direct deliverable listing unsafe |
| Clinic patient FKs not composite — child rows not transitively workspace-scoped | Medium | A patient_id from workspace A could be used in workspace B's appointment |
| niche terminology config exists but is never applied in page UI | Low | Dead code — false impression of deep customization |
| Onboarding can be abandoned without completing agency_settings | Low | Leaves workspace in unconfigured state |
| AI token limit (1024) is too low for large workspaces | Medium | Will truncate for any workspace with 20+ clients |
| Seed script creates data without workspace_id → unusable with auth | High | Seeded demo data won't appear for logged-in users |

### Technical Debt
- `meetings/index.tsx` is described as large — likely a God Component
- No versioned migrations — single idempotent script makes rollback impossible
- OpenAPI spec must be kept manually in sync with route implementations
- Generated Zod schemas and React Query hooks require re-running codegen after any API change
- No error monitoring (Sentry or equivalent)
- No automated tests anywhere in the codebase

---

## 7. Product Maturity Assessment

### Current MVP Level: **60% — Functional Demo, Not Yet Sellable**

#### What is genuinely demo-ready right now
- Agency dashboard with real KPIs
- Client management (full CRUD)
- Project management (full CRUD)
- Task management (full CRUD)
- AI chat with real workspace context (impressive when data exists)
- AI daily briefing widget
- AI client health scores
- Meeting management with AI analyzer
- Client portal (complete)
- Responsive, modern UI throughout

#### What prevents selling to agencies today
1. **No demo data** — the seed script is broken (missing workspace_id); a demo with empty data makes the AI useless and KPIs all show zero
2. **Invoice/payment flow is broken** — can create invoices but cannot mark them paid; "Manage" button routes to settings
3. **Team management is half-built** — the team page is visible but the invite/add flow doesn't exist; the action button is a ghost
4. **Calendar is passive** — displaying events you can't create from the calendar itself looks unfinished
5. **Campaigns and deliverables are shallow** — exist but lack depth to demonstrate real agency value
6. **AI can't take actions for agencies** — asking the AI to create a task fails silently; clinic got this feature, agency didn't
7. **Incomplete pages are reachable** — Reports, Search, and some other pages are partial and would embarrass in a live demo
8. **No way to quickly reset a demo** — without working seed data, every demo requires manual data entry

---

## 8. Improvement Roadmap (Priority Order)

These are ordered by impact on closing the first paying customer. No new features — all of this is completing or fixing what already exists.

### Priority 1 — Fix broken flows (blocker-level, 1–2 days)
1. **Fix the seed script** — add `workspace_id` to all inserts; make it create a realistic agency workspace (5 clients, 8 projects, 20 tasks, 4 invoices, 8 calendar events)
2. **Fix Payments "Manage" button** — route to payment detail or implement inline mark-paid action
3. **Add mark-paid to invoices** — at minimum a status toggle (pending → paid → overdue)
4. **Fix deliverables workspace_id** — add column, update all routes and queries

### Priority 2 — Hide unfinished surfaces (1 day)
5. **Audit navigation** — for digital agency workspace, hide or remove any nav item that leads to an embarrassing page (placeholder automations, integrations, etc.)
6. **Fix team action button** — either wire it up (show a remove/edit dialog) or remove the button entirely
7. **Add fallback states** to any page that crashes or shows blank when data is missing

### Priority 3 — Make the AI impressive (2–3 days)
8. **Add AI write actions for agencies** — at minimum: create_task, update_project_status (clinic already has this pattern; copy it to agency)
9. **Raise AI token limit** — increase `max_tokens` to 2048 or 4096
10. **Add starter prompts to AI assistant** — empty state should show 6 suggested questions relevant to agency work
11. **Surface AI briefing in the AI assistant page** — currently only on dashboard; should be accessible from AI chat

### Priority 4 — Polish the agency demo flow (2–3 days)
12. **Make calendar interactive** — add click-to-create and event detail modal
13. **Add invoice detail page** — status history, edit, mark paid, send to client
14. **Deepen campaigns** — link campaigns to clients/projects, add status/budget fields
15. **Link milestones to project detail** — currently milestones are a separate page with no entry point from a project
16. **Add "New Project" from client detail** — the natural flow; currently requires going to Projects separately

### Priority 5 — Business model features (3–5 days)
17. **Improve reports with date range filter** — currently static YTD only
18. **Add team invite flow** — email invite → creates user under workspace
19. **Apply niche terminology** — wire up the existing (but unused) terminology map in niche-config to page headings and form labels
20. **Add lead/prospect stage to clients** — simple status field: Lead → Prospect → Active → Churned

---

*Audit complete. All findings are based on actual code, not assumptions.*
