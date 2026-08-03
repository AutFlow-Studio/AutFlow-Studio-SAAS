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
```

## Dev credentials
- Email: `admin@autflow.io`
- Password: `admin123`

## Agency OS transformation (what was built)
The project was transformed into a digital agency operating system. Added:

### Backend
- `lib/db/src/schema/campaigns.ts` — campaigns table (type, goal, budget, startDate, endDate, status, performanceNotes, results, clientId, projectId, workspaceId)
- `artifacts/api-server/src/routes/campaigns.ts` — full CRUD API for campaigns
- `artifacts/api-server/src/routes/team.ts` — GET /team (workspace members + workload stats), PATCH /team/:id/role

### Frontend — Navigation
- `niche-config.ts` updated: digital-agency nav now includes campaigns, deliverables, team, ai-assistant
- `layout.tsx` updated: new nav icons (Megaphone, Package, UserCog, Bot)
- `App.tsx` updated: routes for /campaigns, /deliverables, /team, /ai-assistant

### Frontend — New Pages
- `src/pages/campaigns/index.tsx` — full CRUD campaigns list (filter by status/type/client)
- `src/pages/deliverables/index.tsx` — workspace-wide deliverables view (aggregates across all projects)
- `src/pages/team/index.tsx` — team management (roles, workload stats, overload detection)
- `src/pages/ai-assistant/index.tsx` — full-page AI chat with agency-specific prompt suggestions

### Frontend — Dashboard
- Added useQuery for campaigns data
- Added Campaign Performance KPI card (active campaigns, total budget)
- Added Deliverables and Team quick-link KPI cards
- Added "Campaign" quick action button
- Updated quick actions to include campaigns

### Onboarding
- Updated digital-agency template tagline and feature list to reflect agency OS capabilities

## Known pre-existing TS errors
Several pre-existing files (meetings, payments, projects, reports, search, tasks) have `implicit any` TS errors that existed before this work. Not introduced by these changes.

**Why:** The niche-config NavItemKey type required adding the 4 new keys before they could appear in any nav. All other niches (consulting, clinic, freelancer, generic) were also updated with emptyCampaignHeadline/emptyDeliverableHeadline fields to satisfy the expanded NicheConfig interface.
