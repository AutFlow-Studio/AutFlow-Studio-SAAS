/**
 * Integrations management routes.
 *
 * All endpoints are owner-only — non-owner team members cannot access them.
 * API keys are read server-side only; this file never returns key values.
 */
import { Router, type IRouter } from "express";
import { requireOwner } from "../middleware/auth";
import OpenAI from "openai";
import { Resend } from "resend";

const router: IRouter = Router();

// ── GET /integrations/status ──────────────────────────────────────────────────
// Returns whether each key is present + the from-address. Never returns key values.
router.get("/integrations/status", requireOwner, (_req, res): void => {
  res.json({
    openai: {
      configured: Boolean(process.env.OPENAI_API_KEY),
    },
    resend: {
      configured: Boolean(process.env.RESEND_API_KEY),
      fromEmail: process.env.FROM_EMAIL ?? "onboarding@resend.dev",
    },
  });
});

// ── POST /integrations/openai/test ────────────────────────────────────────────
// Makes a real (cheap) models.list() call to verify the key is valid and accepted.
router.post("/integrations/openai/test", requireOwner, async (_req, res): Promise<void> => {
  if (!process.env.OPENAI_API_KEY) {
    res.status(400).json({ ok: false, message: "OPENAI_API_KEY is not set. Add it to your environment secrets." });
    return;
  }
  try {
    const client = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });
    // models.list is the cheapest call — no token usage, just auth verification.
    await client.models.list();
    res.json({ ok: true, message: "Connected. OpenAI API key is valid." });
  } catch (err) {
    const raw = err instanceof Error ? err.message : String(err);
    // Sanitize the error — never echo key fragments back.
    const safe = raw.replace(/sk-[A-Za-z0-9_-]+/g, "[redacted]");
    res.status(502).json({ ok: false, message: safe });
  }
});

// ── POST /integrations/resend/test ────────────────────────────────────────────
// Sends a test email to the authenticated owner to confirm Resend is working.
router.post("/integrations/resend/test", requireOwner, async (req, res): Promise<void> => {
  if (!process.env.RESEND_API_KEY) {
    res.status(400).json({ ok: false, message: "RESEND_API_KEY is not set. Add it to your environment secrets." });
    return;
  }
  const to = req.session.userEmail!;
  const from = process.env.FROM_EMAIL ?? "AutFlow Studio <onboarding@resend.dev>";

  try {
    const resend = new Resend(process.env.RESEND_API_KEY);
    const { error } = await resend.emails.send({
      from,
      to,
      subject: "AutFlow Studio — Resend integration test",
      html: `
<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"></head>
<body style="margin:0;padding:0;background:#09090b;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#09090b;padding:40px 20px;">
    <tr>
      <td align="center">
        <table width="480" cellpadding="0" cellspacing="0" style="background:#18181b;border-radius:16px;border:1px solid #27272a;padding:40px;">
          <tr>
            <td align="center" style="padding-bottom:28px;">
              <div style="width:48px;height:48px;background:#16a34a;border-radius:12px;display:inline-flex;align-items:center;justify-content:center;margin-bottom:16px;">
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><polyline points="22 4 12 14.01 9 11.01"/></svg>
              </div>
              <h2 style="margin:0 0 8px;font-size:20px;font-weight:700;color:#fafafa;">Resend is connected</h2>
              <p style="margin:0;font-size:14px;color:#71717a;">AutFlow Studio — Integration test</p>
            </td>
          </tr>
          <tr>
            <td style="padding-bottom:24px;">
              <p style="margin:0;font-size:15px;color:#a1a1aa;line-height:1.6;">
                Your Resend integration is working correctly. Password reset emails, welcome emails,
                and verification emails will be delivered from <strong style="color:#d4d4d8;">${from}</strong>.
              </p>
            </td>
          </tr>
          <tr>
            <td style="padding-top:24px;border-top:1px solid #27272a;">
              <p style="margin:0;font-size:13px;color:#52525b;">
                This is an automated test sent from your AutFlow Studio workspace integrations panel.
              </p>
            </td>
          </tr>
        </table>
      </td>
    </tr>
  </table>
</body>
</html>`.trim(),
    });
    if (error) {
      res.status(502).json({ ok: false, message: error.message });
      return;
    }
    res.json({ ok: true, message: `Test email sent to ${to}.` });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Resend connection failed.";
    res.status(502).json({ ok: false, message });
  }
});

export default router;
