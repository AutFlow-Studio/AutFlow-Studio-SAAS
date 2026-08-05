---
name: AutFlow Studio import & agency OS transformation
description: How the project was imported, its port layout, and the full agency OS feature set built on top of it.
---

# AutFlow Studio — Import & Agency OS Build

## Port layout
- API server: PORT 8080 (`artifacts/api-server`)
- Frontend: PORT 22583 (`artifacts/autflow-studio`)
- Preview paths: API at `/api/`, frontend at `/`

## Run commands
```
pnpm --filter @workspace/api-server run dev   # API
pnpm --filter @workspace/autflow-studio run dev  # Frontend
pnpm --filter @workspace/db run push           # push DB schema
pnpm --filter @workspace/scripts run migrate   # migrate + create admin
pnpm --filter @workspace/scripts run seed      # seed demo data (Velocity Creative Agency)
```

## Dev credentials
- See migrate.ts for admin user creation; seed.ts confirms the admin user on each run.
- Team members use a separate password set in seed.ts.

## Demo workspace
Agency: **Velocity Creative Agency** (`velocitycreative.co`)
- **5 clients** across 3 lifecycle statuses: active (Beacon & Co., Solace Wellness, Kepler Robotics), at_risk (Northfield Realty Group), prospect (Marrow Coffee Roasters)
- **8 projects**: in_progress, client_review, completed, revision (delayed) statuses
- **~34 tasks** per project: done, in_progress, todo; overdue = todo/in_progress with past deadline
- **~20 deliverables**: approved, sent (waiting), changes_requested, internal_review, completed
- **20 payments**: paid, pending, overdue — Northfield has 2 overdue invoices
- **4 campaigns**, **14 documents**, **10 meetings**, **7 notes**
- **Activity feed**: client_added, task_completed, deliverable_approved, invoice_paid, payment_overdue events
- Team: Maya Chen, Theo Brandt, Priya Nadar, Sam Okoye (all at `@velocitycreative.co`)
- Admin: `admin@autflow.io` / `admin123`; team password: `member123`
- Re-seed anytime: `pnpm --filter @workspace/scripts run seed`
- NOW anchor in seed.ts: `2026-08-05T15:00:00Z` (update if re-seeding far in the future)

## Agency nav items (AGENCY_CONFIG in niche-config.ts)
dashboard, clients, projects, tasks, campaigns, deliverables, documents, meetings, payments, calendar, team, reports, ai-assistant

## Known schema quirks
- `tasks.sort_order` was missing from the DB; added via migrate.ts (v2 additions block)
- `campaigns` table was missing from the DB; added via migrate.ts (v2 additions block)
- Both fixes are now idempotent in migrate.ts

## Pre-existing TS errors (not introduced here)
`reports/index.tsx`, `search/index.tsx`, `tasks/index.tsx`, `time-tracking/index.tsx` — implicit `any` parameter errors. The lib hasn't been built (`api-client-react/dist`), but the app runs fine via Vite.

## UX polish applied
- "Clear Data" button removed from dashboard header (destructive action inappropriate for demo)
- Duplicate "Profile" entry removed from user dropdown (kept "Settings")
- Meetings nav icon changed from CalendarDays to Video (was duplicating calendar icon)
- "team" and "reports" added to agency nav (both pages exist and work)

**Why:** The niche-config NavItemKey type requires adding new keys before they appear in nav. All niches were updated with emptyCampaignHeadline/emptyDeliverableHeadline fields when the interface was expanded.
