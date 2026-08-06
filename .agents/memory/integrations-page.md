---
name: Integrations page
description: OpenAI and Resend integration status/test endpoints and the owner-only frontend page.
---

# Integrations Page

## Backend
- Route file: `artifacts/api-server/src/routes/integrations.ts`
- Registered in: `artifacts/api-server/src/routes/index.ts` (after milestonesRouter)
- All three endpoints protected by `requireOwner` (returns 401 if not authed, 403 if not owner)
- `GET /api/integrations/status` — returns `{ openai: { configured: bool }, resend: { configured: bool, fromEmail: string } }`. Never returns key values.
- `POST /api/integrations/openai/test` — calls `client.models.list()` (cheap, no token usage). Returns `{ ok, message }`.
- `POST /api/integrations/resend/test` — sends a test email to `req.session.userEmail`. Returns `{ ok, message }`.

## Frontend
- Page: `artifacts/autflow-studio/src/pages/integrations/index.tsx`
- Route: `/integrations` in `App.tsx` AgencyRouter
- Nav link: sidebar footer in `layout.tsx`, conditionally rendered for `user?.role === "owner"` only (uses `Plug` icon from lucide-react)

## Email (mailer.ts)
- `sendWelcomeEmail({ to, name, appUrl })` added to `lib/mailer.ts`
- Called in `auth.ts` after successful email verification (POST /auth/verify-email), fire-and-forget

## Key design decisions
**Why server-side only:** keys are read via `process.env` in the route handler; the status endpoint only returns a boolean. The frontend never sees key values.
**Why models.list for OpenAI test:** cheapest possible API call — no chat/completion tokens consumed.
**Why email goes to session user:** the owner tests to their own inbox — avoids needing a separate "test recipient" input field.
