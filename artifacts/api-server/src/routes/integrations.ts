/**
 * Integrations management routes — owner-only.
 *
 * API keys are stored encrypted in the `workspace_integrations` table using
 * AES-256-GCM. Keys are NEVER returned to the browser — only a boolean
 * `configured` flag and metadata are exposed.
 *
 * AI providers are unified under a single "ai" provider slug. The actual
 * provider (openai, anthropic, gemini, openai-compatible) is auto-detected
 * from the key prefix and stored in `metadata`. Adding support for a new
 * AI provider only requires updating the detection logic and test handler
 * server-side — no UI or schema changes needed.
 *
 * Endpoints:
 *   GET  /integrations/status                 — configured status for all providers
 *   POST /integrations/:provider/configure    — save/update encrypted key (+ optional baseUrl for AI)
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

const ownerOnly = [requireAuth, requireOwner];

// ── Types ─────────────────────────────────────────────────────────────────────

type DetectedProvider = "openai" | "anthropic" | "gemini" | "openai-compatible";

interface AiMetadata {
  detectedProvider: DetectedProvider;
  baseUrl?: string | null;
  model?: string | null;
}

// ── Provider auto-detection ───────────────────────────────────────────────────

/**
 * Infer the AI provider from the key prefix and optional base URL.
 * Extend this function to support additional providers without touching the UI.
 */
function detectProvider(key: string, baseUrl?: string | null): DetectedProvider {
  if (baseUrl && baseUrl.trim().length > 0) return "openai-compatible";
  if (key.startsWith("sk-ant-")) return "anthropic";
  if (key.startsWith("AIza")) return "gemini";
  return "openai"; // default: OpenAI-format key
}

function providerLabel(p: DetectedProvider): string {
  switch (p) {
    case "openai": return "OpenAI";
    case "anthropic": return "Anthropic";
    case "gemini": return "Google Gemini";
    case "openai-compatible": return "OpenAI-compatible";
  }
}

// ── Helpers ───────────────────────────────────────────────────────────────────

async function resolveKey(
  workspaceId: number,
  provider: string,
  envFallback?: string,
): Promise<{ key: string | null; metadata: AiMetadata | null }> {
  const [row] = await db
    .select({
      encryptedKey: workspaceIntegrationsTable.encryptedKey,
      metadata: workspaceIntegrationsTable.metadata,
    })
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
      const key = decrypt(row.encryptedKey);
      const metadata = row.metadata ? (JSON.parse(row.metadata) as AiMetadata) : null;
      return { key, metadata };
    } catch {
      return { key: null, metadata: null };
    }
  }

  if (envFallback) {
    return { key: envFallback, metadata: null };
  }

  return { key: null, metadata: null };
}

function sanitizeError(err: unknown): string {
  const raw = err instanceof Error ? err.message : String(err);
  return raw
    .replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/re_[A-Za-z0-9_-]+/g, "[redacted]")
    .replace(/AIza[A-Za-z0-9_-]+/g, "[redacted]");
}

// ── GET /integrations/status ──────────────────────────────────────────────────

router.get(
  "/integrations/status",
  ...ownerOnly,
  async (req, res): Promise<void> => {
    const wsId = req.session.workspaceId!;

    const rows = await db
      .select({
        provider: workspaceIntegrationsTable.provider,
        metadata: workspaceIntegrationsTable.metadata,
        configuredAt: workspaceIntegrationsTable.configuredAt,
        updatedAt: workspaceIntegrationsTable.updatedAt,
      })
      .from(workspaceIntegrationsTable)
      .where(eq(workspaceIntegrationsTable.workspaceId, wsId));

    const byProvider = Object.fromEntries(rows.map((r) => [r.provider, r]));

    const aiRow = byProvider["ai"];
    const aiMeta: AiMetadata | null = aiRow?.metadata
      ? (JSON.parse(aiRow.metadata) as AiMetadata)
      : null;

    const status: Record<string, {
      configured: boolean;
      source: "db" | "env" | null;
      configuredAt?: string;
      detectedProvider?: DetectedProvider;
      model?: string | null;
      baseUrl?: string | null;
    }> = {
      ai: aiRow
        ? {
            configured: true,
            source: "db",
            configuredAt: aiRow.updatedAt.toISOString(),
            detectedProvider: aiMeta?.detectedProvider,
            model: aiMeta?.model ?? null,
            baseUrl: aiMeta?.baseUrl ?? null,
          }
        : process.env.OPENAI_API_KEY
        ? {
            configured: true,
            source: "env",
            detectedProvider: "openai",
            model: null,
            baseUrl: null,
          }
        : { configured: false, source: null },

      resend: byProvider["resend"]
        ? {
            configured: true,
            source: "db",
            configuredAt: byProvider["resend"].updatedAt.toISOString(),
          }
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
    const { key, baseUrl } = req.body ?? {};

    const ALLOWED_PROVIDERS = new Set(["ai", "resend"]);
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

    // For the unified AI provider, detect and persist metadata
    let metadata: string | null = null;
    if (provider === "ai") {
      const detected = detectProvider(key.trim(), baseUrl);
      const aiMeta: AiMetadata = {
        detectedProvider: detected,
        baseUrl: baseUrl?.trim() || null,
        model: null, // populated on test
      };
      metadata = JSON.stringify(aiMeta);
    }

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
        .set({ encryptedKey, metadata, updatedAt: now })
        .where(eq(workspaceIntegrationsTable.id, existing.id));
    } else {
      await db.insert(workspaceIntegrationsTable).values({
        workspaceId: wsId,
        provider,
        encryptedKey,
        metadata,
        configuredAt: now,
        updatedAt: now,
      });
    }

    // Return detected provider so the UI can update immediately after save
    let detectedProvider: DetectedProvider | undefined;
    if (provider === "ai") {
      detectedProvider = detectProvider(key.trim(), baseUrl);
    }

    res.json({
      ok: true,
      message: "API key saved.",
      updatedAt: now.toISOString(),
      ...(detectedProvider ? { detectedProvider } : {}),
    });
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

    // ── Unified AI provider ────────────────────────────────────────────────────
    if (provider === "ai") {
      const envKey = process.env.OPENAI_API_KEY;
      const { key, metadata } = await resolveKey(wsId, "ai", envKey);

      if (!key) {
        res.status(400).json({ ok: false, message: "AI is not configured. Add your API key first." });
        return;
      }

      const detected = metadata?.detectedProvider ?? detectProvider(key, metadata?.baseUrl);
      const baseUrl = metadata?.baseUrl ?? undefined;

      try {
        let model: string | null = null;

        if (detected === "openai" || detected === "openai-compatible") {
          const client = new OpenAI({ apiKey: key, ...(baseUrl ? { baseURL: baseUrl } : {}) });
          const list = await client.models.list();
          // Pick the first model name as confirmation
          const first = list.data[0];
          model = first?.id ?? null;
        } else if (detected === "anthropic") {
          const resp = await fetch("https://api.anthropic.com/v1/models", {
            headers: { "x-api-key": key, "anthropic-version": "2023-06-01" },
          });
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
            res.status(502).json({ ok: false, message: body?.error?.message ?? `HTTP ${resp.status}` });
            return;
          }
          const body = await resp.json() as { data?: Array<{ id: string }> };
          model = body.data?.[0]?.id ?? null;
        } else if (detected === "gemini") {
          const resp = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models?key=${key}`,
          );
          if (!resp.ok) {
            const body = await resp.json().catch(() => ({})) as { error?: { message?: string } };
            res.status(502).json({ ok: false, message: body?.error?.message ?? `HTTP ${resp.status}` });
            return;
          }
          const body = await resp.json() as { models?: Array<{ name: string }> };
          model = body.models?.[0]?.name?.replace("models/", "") ?? null;
        }

        // Persist the resolved model back into metadata
        if (metadata && model) {
          const updatedMeta: AiMetadata = { ...metadata, model };
          await db
            .update(workspaceIntegrationsTable)
            .set({ metadata: JSON.stringify(updatedMeta), updatedAt: new Date() })
            .where(
              and(
                eq(workspaceIntegrationsTable.workspaceId, wsId),
                eq(workspaceIntegrationsTable.provider, "ai"),
              ),
            );
        }

        const label = providerLabel(detected);
        const modelSuffix = model ? ` · ${model}` : "";
        res.json({
          ok: true,
          message: `Connected — ${label}${modelSuffix}`,
          detectedProvider: detected,
          model,
        });
      } catch (err) {
        res.status(502).json({ ok: false, message: sanitizeError(err) });
      }
      return;
    }

    // ── Resend ─────────────────────────────────────────────────────────────────
    if (provider === "resend") {
      const { key } = await resolveKey(wsId, "resend", process.env.RESEND_API_KEY);
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

    res.status(400).json({ ok: false, message: `No test available for provider: ${provider}` });
  },
);

export default router;
