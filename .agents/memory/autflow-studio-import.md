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
- Email: `admin@autflow.io`
- Password: `admin123`
- Admin name: `Alex Rivera`

## Demo workspace
Agency: **Velocity Creative Agency** (`velocitycreative.co`)
- 8 clients, 14 projects, 18 deliverables, 24 invoices, 5 campaigns, 4 team members
- Team: Maya Chen, Theo Brandt, Priya Nadar, Sam Okoye (all at `@velocitycreative.co`)
- Re-seed anytime: `pnpm --filter @workspace/scripts run seed`

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
