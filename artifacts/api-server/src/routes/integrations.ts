/**
 * Integrations management routes — owner-only.
 *
 * API keys are stored encrypted in the `workspace_integrations` table using
 * AES-256-GCM. Keys are NEVER returned to the browser — only a boolean
 * `configured` flag and metadata are exposed.
 *
 * Falls back to environment variables for any provider not yet configured via
 * the UI, so existing env-based deployments keep working.
 *
 * Generic design: adding a new provider (Anthropic, Gemini, Grok, …) requires
 * no schema changes — just insert a row with the new provider slug.
 *
 * Endpoints:
 *   GET  /integrations/status                 — configured status for all providers
 *   POST /integrations/:provider/configure    — save/update encrypted key
 *   POST /integrations/:provider/test         — live connection test
 *   DELETE /integrations/:provider            — remove stored key
 */
import { Router, type IRouter } from "express";
import { eq, and } from "drizzle-orm";
import { db, workspaceIntegrationsTable } from "@workspace/db";
import { requireAuth, requireOwner } from "../middleware/auth";
import { encrypt, decrypt } from "../lib/encryption";
import OpenAI from "openai";
import { Resend } from "resend";

const router: IRouter = Router();

// Middleware chain used on every integrations route: session freshness + owner gate
const ownerOnly = [requireAuth, requireOwner];

// ── Helpers ───────────────────────────────────────────────────────────────────

/**
 * Retrieve the decrypted API key for a provider from the DB.
 * Falls back to an environment variable if no DB row exists.
 */
async function resolveKey(
  workspaceId: number,
  provider: string,
  envFallback?: string,
): Promise<string | null> {
  const [row] = await db
    .select({ encryptedKey: workspaceIntegrationsTable.encryptedKey })
    .from(workspaceIntegrationsTable)
    .where(
      and(
        eq(workspaceIntegrationsTable.workspaceId, workspaceId),
        eq(workspaceIntegrationsTable.provider, provider),
      ),
    )
    .limit(1);

  if (row) {
    try {
      return decrypt(row.encryptedKey);
    } catch {
      return null; // corrupt/re-keyed — treat as unconfigured
    }
  }

  // Environment variable fallback (for existing deployments)
  return envFallback ? (envFallback || null) : null;
}

/** Sanitize error messages to prevent key fragments leaking in responses. */
function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
            .replace(/re_[A-Za-z0-9_-]+/g, "[redacted]");
}

// ── GET /integrations/status ──────────────────────────────────────────────────

router.get(
  "/integrations/status",
  ...ownerOnly,
  async (req, res): Promise<void> => {
    const wsId = req.session.workspaceId!;

    // Load all rows for this workspace in one query
    const rows = await db
      .select({
        provider: workspaceIntegrationsTable.provider,
        configuredAt: workspaceIntegrationsTable.configuredAt,
        updatedAt: workspaceIntegrationsTable.updatedAt,
      })
      .from(workspaceIntegrationsTable)
      .where(eq(workspaceIntegrationsTable.workspaceId, wsId));

    const byProvider = Object.fromEntries(
      rows.map((r) => [r.provider, r]),
    );

    // Check each known provider — DB row OR env var counts as configured
    const status: Record<
      string,
      { configured: boolean; source: "db" | "env" | null; configuredAt?: string }
    > = {
      openai: byProvider.openai
        ? { configured: true, source: "db", configuredAt: byProvider.openai.updatedAt.toISOString() }
        : process.env.OPENAI_API_KEY
        ? { configured: true, source: "env" }
        : { configured: false, source: null },

      resend: byProvider.resend
        ? { configured: true, source: "db", configuredAt: byProvider.resend.updatedAt.toISOString() }
        : process.env.RESEND_API_KEY
        ? { configured: true, source: "env" }
        : { configured: false, source: null },
    };

    res.json(status);
  },
);

// ── POST /integrations/:provider/configure ────────────────────────────────────

router.post(
  "/integrations/:provider/configure",
  ...ownerOnly,
  async (req, res): Promise<void> => {
    const { provider } = req.params;
    const { key } = req.body ?? {};

    const ALLOWED_PROVIDERS = new Set(["openai", "resend", "anthropic", "gemini", "grok"]);
    if (!ALLOWED_PROVIDERS.has(provider)) {
      res.status(400).json({ error: `Unknown provider: ${provider}` });
      return;
    }

    if (!key || typeof key !== "string" || key.trim().length < 8) {
      res.status(400).json({ error: "A valid API key is required (min 8 characters)." });
      return;
    }

    const wsId = req.session.workspaceId!;
    const encryptedKey = encrypt(key.trim());

    // Upsert — update if exists, insert if new
    const [existing] = await db
      .select({ id: workspaceIntegrationsTable.id })
      .from(workspaceIntegrationsTable)
      .where(
        and(
          eq(workspaceIntegrationsTable.workspaceId, wsId),
          eq(workspaceIntegrationsTable.provider, provider),
        ),
      )
      .limit(1);

    const now = new Date();

    if (existing) {
      await db
        .update(workspaceIntegrationsTable)
        .set({ encryptedKey, updatedAt: now })
        .where(eq(workspaceIntegrationsTable.id, existing.id));
    } else {
      await db.insert(workspaceIntegrationsTable).values({
        workspaceId: wsId,
        provider,
        encryptedKey,
        configuredAt: now,
        updatedAt: now,
      });
    }

    res.json({ ok: true, message: "API key saved.", updatedAt: now.toISOString() });
  },
);

// ── DELETE /integrations/:provider ────────────────────────────────────────────

router.delete(
  "/integrations/:provider",
  ...ownerOnly,
  async (req, res): Promise<void> => {
    const { provider } = req.params;
    const wsId = req.session.workspaceId!;

    await db
      .delete(workspaceIntegrationsTable)
      .where(
        and(
          eq(workspaceIntegrationsTable.workspaceId, wsId),
          eq(workspaceIntegrationsTable.provider, provider),
        ),
      );

    res.json({ ok: true, message: "Integration removed." });
  },
);

// ── POST /integrations/:provider/test ─────────────────────────────────────────

router.post(
  "/integrations/:provider/test",
  ...ownerOnly,
  async (req, res): Promise<void> => {
    const { provider } = req.params;
    const wsId = req.session.workspaceId!;

    switch (provider) {
      // ── OpenAI ─────────────────────────────────────────────────────────────
      case "openai": {
        const key = await resolveKey(wsId, "openai", process.env.OPENAI_API_KEY);
        if (!key) {
          res.status(400).json({ ok: false, message: "OpenAI is not configured. Add your API key first." });
          return;
        }
        try {
          const client = new OpenAI({ apiKey: key });
          await client.models.list();
          res.json({ ok: true, message: "Connected — OpenAI API key is valid." });
        } catch (err) {
          res.status(502).json({ ok: false, message: sanitizeError(err) });
        }
        return;
      }

      // ── Resend ─────────────────────────────────────────────────────────────
      case "resend": {
        const key = await resolveKey(wsId, "resend", process.env.RESEND_API_KEY);
        if (!key) {
          res.status(400).json({ ok: false, message: "Resend is not configured. Add your API key first." });
          return;
        }
        const to = req.session.userEmail!;
        const from = process.env.FROM_EMAIL ?? "AutFlow Studio <onboarding@resend.dev>";
        try {
          const resend = new Resend(key);
          const { error } = await resend.emails.send({
            from,
            to,
            subject: "AutFlow Studio — Resend integration test",
            html: `
<!DOCTYPE html><html lang="en"><head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr><td align="center">
      <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid #27272a;padding:40px;">
        <tr><td align="center" style="padding-bottom:24px;">
          <div style="width:48px;height:48px;background:#16a34a;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
          </div>
          <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fafafa;">Resend is connected</h2>
          <p style="margin:0;font-size:14px;color:#71717a;">AutFlow Studio integration test</p>
        </td></tr>
        <tr><td style="padding-bottom:24px;">
          <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.6;">
            Your Resend integration is working. Emails will be sent from <strong style="color:#d4d4d8;">${from}</strong>.
          </p>
        </td></tr>
        <tr><td style="padding-top:24px;border-top:1px solid #27272a;">
          <p style="margin:0;font-size:13px;color:#52525b;">Automated test from your AutFlow Studio workspace.</p>
        </td></tr>
      </table>
    </td></tr>
  </table>
</body></html>`.trim(),
          });
          if (error) {
            res.status(502).json({ ok: false, message: error.message });
            return;
          }
          res.json({ ok: true, message: `Test email sent to ${to}.` });
        } catch (err) {
          res.status(502).json({ ok: false, message: sanitizeError(err) });
        }
        return;
      }

      // ── Anthropic ──────────────────────────────────────────────────────────
      case "anthropic": {
        const key = await resolveKey(wsId, "anthropic");
        if (!key) {
          res.status(400).json({ ok: false, message: "Anthropic is not configured. Add your API key first." });
          return;
        }
        try {
          const resp = await fetch("https://api.anthropic.com/v1/models", {
            headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
          });
          if (resp.ok) {
            res.json({ ok: true, message: "Connected — Anthropic API key is valid." });
          } else {
            const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
            res.status(502).json({ ok: false, message: body?.error?.message ?? `HTTP ${resp.status}` });
          }
        } catch (err) {
          res.status(502).json({ ok: false, message: sanitizeError(err) });
        }
        return;
      }

      // ── Gemini ─────────────────────────────────────────────────────────────
      case "gemini": {
        const key = await resolveKey(wsId, "gemini");
        if (!key) {
          res.status(400).json({ ok: false, message: "Gemini is not configured. Add your API key first." });
          return;
        }
        try {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          );
          if (resp.ok) {
            res.json({ ok: true, message: "Connected — Gemini API key is valid." });
          } else {
            const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
            res.status(502).json({ ok: false, message: body?.error?.message ?? `HTTP ${resp.status}` });
          }
        } catch (err) {
          res.status(502).json({ ok: false, message: sanitizeError(err) });
        }
        return;
      }

      default:
        res.status(400).json({ ok: false, message: `No test available for provider: ${provider}` });
    }
  },
);

export default router;
