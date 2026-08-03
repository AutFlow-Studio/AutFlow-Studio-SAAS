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
- `lib/db/src/schema/campaigns.ts` — campaigns table
- `artifacts/api-server/src/routes/campaigns.ts` — full CRUD API for campaigns
- `artifacts/api-server/src/routes/team.ts` — GET /team, PATCH /team/:id/role

### Frontend — Navigation
- `niche-config.ts` updated: digital-agency nav includes campaigns, deliverables, team, ai-assistant
- `layout.tsx` updated: new nav icons; clinic nav keys added (patients, appointments, treatments, followups, clinic-billing)
- `App.tsx` updated: SmartDashboard renders ClinicDashboard when businessType=clinic

### Frontend — Agency pages
- `src/pages/campaigns/index.tsx`, `deliverables/`, `team/`, `ai-assistant/`

## Clinic workspace (added later)

### Clinic DB tables (5 new, in `lib/db/src/schema/clinic-*.ts`)
clinic_patients, clinic_appointments, clinic_treatments, clinic_followups, clinic_billing
All scoped by workspace_id. Migration is idempotent (CREATE TABLE IF NOT EXISTS).

### Clinic API routes (`artifacts/api-server/src/routes/clinic/`)
- GET/POST/PUT/DELETE `/api/clinic/patients`, `/api/clinic/appointments`, `/api/clinic/treatments`, `/api/clinic/followups`, `/api/clinic/billing`
- GET `/api/clinic/dashboard` — today's appts, patient counts, billing summary, overdue followups

### Clinic frontend pages (`artifacts/autflow-studio/src/pages/clinic/`)
- `dashboard/index.tsx` — healthcare-focused dashboard (today, patients, financials, activity)
- `patients/index.tsx` — patient list with search, add/delete
- `patients/detail.tsx` — tabbed patient profile (overview, appointments, treatments, billing)
- `appointments/index.tsx` — grouped by date, status management
- `treatments/index.tsx` — treatment tracking with cost
- `followups/index.tsx` — overdue alerts, complete/delete
- `billing/index.tsx` — revenue/pending/overdue summary cards + records

### Niche config (clinic)
navItems: dashboard, patients, appointments, treatments, followups, clinic-billing, documents, tasks, calendar, ai-assistant
SmartDashboard in App.tsx renders ClinicDashboard when businessType === 'clinic'.

## Known pre-existing TS errors
Several pre-existing files (meetings, payments, projects, reports, search, tasks) have `implicit any` TS errors. Not introduced by our changes.

**Why:** The niche-config NavItemKey type requires adding new keys before they appear in nav. All niches were updated with emptyCampaignHeadline/emptyDeliverableHeadline fields when the interface was expanded.
