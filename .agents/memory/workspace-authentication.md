---
name: Workspace authentication
description: Durable decisions for agency auth, tenant isolation, and post-registration workspace access.
---

# Workspace authentication

New agency users enter their workspace immediately after registration. Agency configuration is optional and belongs in Workspace Settings rather than an onboarding questionnaire.

**Why:** Registration should establish identity and tenant ownership with the smallest possible input surface; forcing configuration before access creates abandonment risk and made the persisted workspace depend on a UI completion flag.

**How to apply:** Keep `users.workspaceId` as the server-side tenant anchor. Authenticated middleware rehydrates role, email, verification status, and workspace ID from the database before protected routes run. Never trust a workspace ID supplied by the client or only stored in a stale session.

Email addresses are normalized to lowercase at auth boundaries, checked with a database uniqueness constraint, and protected against insert/update race conditions. Session IDs are regenerated on successful login and signup.

**Why:** Case variants and concurrent requests can bypass an application-level pre-check; database enforcement and session regeneration are required for production behavior.

**How to apply:** Preserve generic auth errors for invalid credentials, return conflict responses for duplicate registration/profile emails, and keep logout destroying the server-side session plus clearing the cookie.