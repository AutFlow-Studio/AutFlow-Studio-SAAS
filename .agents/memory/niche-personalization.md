---
name: Niche personalization system
description: How businessType drives UI customization and what templates actually do (empty workspace + starter tasks)
---

## Architecture

`agency_settings.businessType` is the single source of truth for niche config.
It is set in two places:
1. `PUT /api/settings/agency` — saved with `onboardingCompleted: true` + `businessType: templateId ?? "generic"` in the onboarding `saveAndFinish` function.
2. `POST /api/templates/apply` — overwrites `businessType` after clearing workspace and seeding starter tasks.

## New fields added to NicheConfig (2026-08-02)

- `meetingTerm` / `meetingTermPlural` — e.g. "Appointment" / "Appointments" for clinic
- `paymentTerm` / `paymentTermPlural` — e.g. "Billing" for clinic, "Invoice" for others
- `navItems: NavItemKey[]` — ordered list of nav keys to show; layout.tsx filters BASE_NAV_ITEMS against this
- `aiIndustryContext: string` — industry blurb injected into the AI system prompt

Nav filtering is done in `layout.tsx`: BASE_NAV_ITEMS now use a `key: NavItemKey` field; NAV_ITEMS is built by filtering to `nicheConfig.navItems` order, then mapping all terminology labels (clients, projects, meetings, payments).

AI system prompt is now dynamic: `getWorkspaceSystemPrompt(wid)` in `ai.ts` queries `agency_settings.business_type` and returns a per-industry system prompt from `INDUSTRY_CONTEXT` map. All 5 AI routes use it.

## What templates do (NOT demo data)

Templates in `artifacts/api-server/src/routes/templates.ts`:
1. **Clear** all workspace data (clients, projects, payments, tasks, etc.)
2. **Set** `businessType` in `agency_settings`
3. **Seed** 5 niche-appropriate starter **workflow tasks** for the user (e.g. "Add your first client")

They do NOT seed any fake clients, projects, or payments.

## Frontend niche config

`artifacts/autflow-studio/src/lib/niche-config.ts` — maps `businessType` to `NicheConfig`.
`getNicheConfig(businessType)` returns a `NicheConfig` object with:
- `navClientLabel` / `navProjectLabel` — sidebar nav labels
- `dashboardTitle` / `dashboardDescription` — dashboard page header
- `emptyClientHeadline/Body` / `emptyProjectHeadline/Body` — empty-state copy
- `clientTerm`, `projectTerm` (singular/plural) — terminology for page headers/forms

## Where niche config is consumed

- `layout.tsx` — reads `agencyProfile.businessType`, calls `getNicheConfig()`, applies `navClientLabel` / `navProjectLabel` to NAV_ITEMS inside the component (not as a module-level constant)
- `dashboard.tsx` — uses `nicheConfig.dashboardTitle` for page header
- Can be extended to `clients/index.tsx`, `projects/index.tsx` empty states by importing `useAgencyProfile` + `getNicheConfig`

## AgencyProfileProvider

Now exposes `businessType: string | null` in the profile context (fetched from `/api/settings/agency`).
All places that need niche config import `useAgencyProfile` + `getNicheConfig`.

**Why:** `AgencyProfileProvider` is mounted outside `QueryClientProvider` in `App.tsx`, so it uses plain `fetch`, not react-query. This is correct and intentional.

## Crash fixes applied

- `dashboard.tsx` line 703: `stats.totalRevenue.toLocaleString()` → `(stats.totalRevenue ?? 0).toLocaleString()`
- `dashboard.tsx` line 712: `stats.outstandingPayments.toLocaleString()` → `(stats.outstandingPayments ?? 0).toLocaleString()`
- `AIBriefing` wrapped in `SectionErrorBoundary` so it can't crash the whole dashboard
- `SectionErrorBoundary` added to `error-boundary.tsx` — shows inline retry card instead of full-page error
- `requireAuth` added to `GET /api/dashboard` route to prevent session-undefined crash
