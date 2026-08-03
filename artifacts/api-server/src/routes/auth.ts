import { Router, type IRouter } from "express";
import { eq, and, isNull, gt } from "drizzle-orm";
import { randomBytes } from "crypto";
import bcrypt from "bcryptjs";
import {
  db,
  usersTable,
  workspacesTable,
  agencySettingsTable,
  passwordResetTokensTable,
  emailVerificationTokensTable,
} from "@workspace/db";
import type { PublicUser } from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { loginRateLimiter, forgotPasswordRateLimiter } from "../middleware/rate-limit";
import { sendPasswordResetEmail, sendVerificationEmail } from "../lib/mailer";

const router: IRouter = Router();

function sanitizeUser(u: typeof usersTable.$inferSelect): PublicUser {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...rest } = u;
  return rest;
}

/**
 * Return the trusted frontend origin.
 * Only uses values set at deployment time — never request-derived headers.
 */
function getTrustedAppUrl(): string | null {
  if (process.env.APP_URL) return process.env.APP_URL.replace(/\/$/, "");
  if (process.env.REPLIT_DEV_DOMAIN) return `https://${process.env.REPLIT_DEV_DOMAIN}`;
  return null;
}

// ── Signup ────────────────────────────────────────────────────────────────────

/**
 * POST /api/auth/signup
 * Public — creates a new user + workspace in a transaction, then sends verification email.
 */
router.post("/auth/signup", async (req, res): Promise<void> => {
  const { name, email, password, companyName } = req.body ?? {};

  if (!name || !email || !password || !companyName) {
    res.status(400).json({ error: "Name, email, password, and company name are required" });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();

  // Check for existing account
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "An account with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), 12);

  // Create user → workspace → link (transaction)
  const { user, workspace } = await db.transaction(async (tx) => {
    const [newUser] = await tx
      .insert(usersTable)
      .values({
        name: String(name).trim(),
        email: normalizedEmail,
        passwordHash,
        role: "owner",
        isEmailVerified: false,
      })
      .returning();

    const [newWorkspace] = await tx
      .insert(workspacesTable)
      .values({
        name: String(companyName).trim(),
        ownerId: newUser.id,
        plan: "free",
      })
      .returning();

    const [updatedUser] = await tx
      .update(usersTable)
      .set({ workspaceId: newWorkspace.id })
      .where(eq(usersTable.id, newUser.id))
      .returning();

    // Create default workspace settings
    await tx.insert(agencySettingsTable).values({
      workspaceId: newWorkspace.id,
      agencyName: String(companyName).trim(),
      onboardingCompleted: false,
    });

    return { user: updatedUser, workspace: newWorkspace };
  });

  const emailEnabled = Boolean(process.env.RESEND_API_KEY);

  if (emailEnabled) {
    // Generate email verification token (24-hour expiry)
    const token = randomBytes(32).toString("hex");
    const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await db.insert(emailVerificationTokensTable).values({ userId: user.id, token, expiresAt });

    // Send verification email (fire-and-forget)
    const appUrl = getTrustedAppUrl();
    if (appUrl) {
      const verifyUrl = `${appUrl}/verify-email?token=${token}`;
      sendVerificationEmail({ to: user.email, name: user.name, verifyUrl }).catch((err) => {
        console.error("[signup] failed to send verification email:", err);
      });
    } else {
      console.warn(`[signup] No app URL configured — verification token for ${user.email}: ${token}`);
    }
  } else {
    // No email service configured — auto-verify so the user can proceed to onboarding
    await db
      .update(usersTable)
      .set({ isEmailVerified: true, emailVerifiedAt: new Date() })
      .where(eq(usersTable.id, user.id));
    user.isEmailVerified = true;
    console.info(`[signup] Email service not configured — auto-verified ${user.email}`);
  }

  // Create session
  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.workspaceId = workspace.id;
  req.session.isEmailVerified = emailEnabled ? false : true;

  res.status(201).json(sanitizeUser(user));
});

// ── Email verification — Validate token ──────────────────────────────────────

router.get("/auth/verify-email/validate", async (req, res): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    res.json({ valid: false, reason: "No token provided." });
    return;
  }

  const [record] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(eq(emailVerificationTokensTable.token, token))
    .limit(1);

  if (!record) {
    res.json({ valid: false, reason: "This verification link is invalid." });
    return;
  }
  if (record.usedAt) {
    res.json({ valid: false, reason: "This verification link has already been used." });
    return;
  }
  if (record.expiresAt < new Date()) {
    res.json({ valid: false, reason: "This verification link has expired. Please request a new one." });
    return;
  }

  res.json({ valid: true });
});

// ── Email verification — Consume token ───────────────────────────────────────

router.post("/auth/verify-email", async (req, res): Promise<void> => {
  const { token } = req.body ?? {};

  if (!token) {
    res.status(400).json({ error: "Verification token is required" });
    return;
  }

  const [record] = await db
    .select()
    .from(emailVerificationTokensTable)
    .where(eq(emailVerificationTokensTable.token, String(token)))
    .limit(1);

  if (!record) {
    res.status(400).json({ error: "This verification link is invalid." });
    return;
  }
  if (record.usedAt) {
    res.status(410).json({ error: "This verification link has already been used." });
    return;
  }
  if (record.expiresAt < new Date()) {
    res.status(410).json({ error: "This verification link has expired. Please request a new one." });
    return;
  }

  const now = new Date();

  // Mark user verified + consume token
  await db.transaction(async (tx) => {
    await tx
      .update(usersTable)
      .set({ isEmailVerified: true, emailVerifiedAt: now })
      .where(eq(usersTable.id, record.userId));

    await tx
      .update(emailVerificationTokensTable)
      .set({ usedAt: now })
      .where(eq(emailVerificationTokensTable.id, record.id));
  });

  // Update session if this user is already logged in
  if (req.session.userId === record.userId) {
    req.session.isEmailVerified = true;
  }

  res.json({ success: true });
});

// ── Resend verification email ─────────────────────────────────────────────────

router.post("/auth/resend-verification", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }
  if (user.isEmailVerified) {
    res.status(400).json({ error: "Email is already verified" });
    return;
  }

  // Invalidate existing unused tokens
  await db
    .delete(emailVerificationTokensTable)
    .where(
      and(
        eq(emailVerificationTokensTable.userId, user.id),
        isNull(emailVerificationTokensTable.usedAt),
      ),
    );

  const token = randomBytes(32).toString("hex");
  const expiresAt = new Date(Date.now() + 24 * 60 * 60 * 1000);
  await db.insert(emailVerificationTokensTable).values({ userId: user.id, token, expiresAt });

  const appUrl = getTrustedAppUrl();
  if (appUrl) {
    const verifyUrl = `${appUrl}/verify-email?token=${token}`;
    sendVerificationEmail({ to: user.email, name: user.name, verifyUrl }).catch((err) => {
      console.error("[resend-verification] failed to send email:", err);
    });
  } else {
    console.warn(`[resend-verification] No app URL configured — token for ${user.email}: ${token}`);
  }

  res.json({ success: true });
});

// ── Login ─────────────────────────────────────────────────────────────────────

router.post("/auth/login", loginRateLimiter, async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.email, String(email).toLowerCase().trim()))
    .limit(1);

  if (!user) {
    await bcrypt.compare(password, "$2b$10$invalidhashpadding000000000000000000");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  const valid = await bcrypt.compare(String(password), user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await db
    .update(usersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(usersTable.id, user.id));

  req.session.userId = user.id;
  req.session.userRole = user.role;
  req.session.userName = user.name;
  req.session.userEmail = user.email;
  req.session.workspaceId = user.workspaceId ?? 0;
  req.session.isEmailVerified = user.isEmailVerified;

  res.json(sanitizeUser(user));
});

// ── Logout ────────────────────────────────────────────────────────────────────

router.post("/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("autflow.sid");
    res.json({ success: true });
  });
});

// ── Current user ──────────────────────────────────────────────────────────────

router.get("/auth/me", requireAuth, async (req, res): Promise<void> => {
  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session invalid" });
    return;
  }

  res.json(sanitizeUser(user));
});

// ── Register (invite team member — owner only) ────────────────────────────────

router.post("/auth/register", requireAuth, async (req, res): Promise<void> => {
  if (req.session.userRole !== "owner") {
    res.status(403).json({ error: "Only owners can create new users" });
    return;
  }

  const { name, email, password, role } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  if (password.length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const normalizedEmail = String(email).toLowerCase().trim();
  const [existing] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, normalizedEmail))
    .limit(1);

  if (existing) {
    res.status(409).json({ error: "A user with that email already exists" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(password), 12);
  const validRole = role === "owner" ? "owner" : "member";

  const [newUser] = await db
    .insert(usersTable)
    .values({
      name: String(name).trim(),
      email: normalizedEmail,
      passwordHash,
      role: validRole,
      workspaceId: req.session.workspaceId,
      isEmailVerified: true, // invited users are pre-verified
    })
    .returning();

  res.status(201).json(sanitizeUser(newUser));
});

// ── Change own password ───────────────────────────────────────────────────────

router.patch("/auth/password", requireAuth, async (req, res): Promise<void> => {
  const { currentPassword, newPassword } = req.body ?? {};
  if (!currentPassword || !newPassword) {
    res.status(400).json({ error: "Current and new passwords are required" });
    return;
  }
  if (String(newPassword).length < 8) {
    res.status(400).json({ error: "New password must be at least 8 characters" });
    return;
  }

  const [user] = await db
    .select()
    .from(usersTable)
    .where(eq(usersTable.id, req.session.userId!))
    .limit(1);

  if (!user) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  const valid = await bcrypt.compare(String(currentPassword), user.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Current password is incorrect" });
    return;
  }

  const passwordHash = await bcrypt.hash(String(newPassword), 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  res.json({ success: true });
});

// ── Update profile ────────────────────────────────────────────────────────────

router.patch("/auth/profile", requireAuth, async (req, res): Promise<void> => {
  const { name, email, avatarUrl } = req.body ?? {};
  const updates: Record<string, unknown> = {};
  if (name) updates.name = String(name).trim();
  if (email) updates.email = String(email).toLowerCase().trim();
  if (avatarUrl !== undefined) updates.avatarUrl = avatarUrl ? String(avatarUrl).trim() : null;

  if (Object.keys(updates).length === 0) {
    res.status(400).json({ error: "No fields to update" });
    return;
  }

  const [updated] = await db
    .update(usersTable)
    .set(updates)
    .where(eq(usersTable.id, req.session.userId!))
    .returning();

  if (!updated) {
    res.status(404).json({ error: "User not found" });
    return;
  }

  if (updates.name) req.session.userName = updated.name;
  if (updates.email) req.session.userEmail = updated.email;

  res.json(sanitizeUser(updated));
});

// ── Forgot password ───────────────────────────────────────────────────────────

router.post(
  "/auth/forgot-password",
  forgotPasswordRateLimiter,
  async (req, res): Promise<void> => {
    const { email } = req.body ?? {};
    if (!email) {
      res.status(400).json({ error: "Email is required" });
      return;
    }

    res.json({ success: true });

    try {
      const normalizedEmail = String(email).toLowerCase().trim();
      const [user] = await db
        .select()
        .from(usersTable)
        .where(eq(usersTable.email, normalizedEmail))
        .limit(1);

      if (!user) return;

      await db
        .delete(passwordResetTokensTable)
        .where(
          and(
            eq(passwordResetTokensTable.userId, user.id),
            isNull(passwordResetTokensTable.usedAt),
          ),
        );

      const token = randomBytes(32).toString("hex");
      const expiresAt = new Date(Date.now() + 60 * 60 * 1000);

      await db.insert(passwordResetTokensTable).values({ userId: user.id, token, expiresAt });

      const appUrl = getTrustedAppUrl();
      if (!appUrl) {
        console.warn(`[forgot-password] No app URL configured — token for ${user.email}: ${token}`);
        return;
      }

      const resetUrl = `${appUrl}/reset-password?token=${token}`;
      await sendPasswordResetEmail({ to: user.email, name: user.name, resetUrl });
    } catch (err) {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (req as any).log?.error(err, "forgot-password: failed to send reset email");
      console.error("[forgot-password] Failed to send reset email:", err);
    }
  },
);

// ── Reset password — Validate token ──────────────────────────────────────────

router.get("/auth/reset-password/validate", async (req, res): Promise<void> => {
  const { token } = req.query;
  if (!token || typeof token !== "string") {
    res.json({ valid: false, reason: "No token provided." });
    return;
  }

  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, token))
    .limit(1);

  if (!record) { res.json({ valid: false, reason: "This reset link is invalid." }); return; }
  if (record.usedAt) { res.json({ valid: false, reason: "This reset link has already been used." }); return; }
  if (record.expiresAt < new Date()) { res.json({ valid: false, reason: "This reset link has expired. Please request a new one." }); return; }

  res.json({ valid: true });
});

// ── Reset password — Consume token ───────────────────────────────────────────

router.post("/auth/reset-password", async (req, res): Promise<void> => {
  const { token, password } = req.body ?? {};

  if (!token || !password) {
    res.status(400).json({ error: "Token and new password are required" });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  const [record] = await db
    .select()
    .from(passwordResetTokensTable)
    .where(eq(passwordResetTokensTable.token, String(token)))
    .limit(1);

  if (!record) { res.status(400).json({ error: "This reset link is invalid." }); return; }
  if (record.usedAt) { res.status(410).json({ error: "This reset link has already been used." }); return; }
  if (record.expiresAt < new Date()) { res.status(410).json({ error: "This reset link has expired. Please request a new one." }); return; }

  const [user] = await db.select().from(usersTable).where(eq(usersTable.id, record.userId)).limit(1);
  if (!user) { res.status(400).json({ error: "User not found." }); return; }

  const passwordHash = await bcrypt.hash(String(password), 12);
  await db.update(usersTable).set({ passwordHash }).where(eq(usersTable.id, user.id));

  const now = new Date();
  await db
    .update(passwordResetTokensTable)
    .set({ usedAt: now })
    .where(eq(passwordResetTokensTable.token, String(token)));

  await db
    .delete(passwordResetTokensTable)
    .where(
      and(
        eq(passwordResetTokensTable.userId, user.id),
        isNull(passwordResetTokensTable.usedAt),
        gt(passwordResetTokensTable.id, 0),
      ),
    );

  res.json({ success: true });
});

export default router;
