/**
 * Client Portal API routes.
 *
 * Two route groups:
 *  1. /api/portal/* — public + portal-authenticated endpoints for client users
 *  2. /api/portal-admin/* — agency team endpoints for managing portal access
 *
 * Security model:
 *  - Client portal users have a separate session key (clientPortalUserId).
 *  - Every portal data query MUST filter by both workspaceId AND clientId
 *    taken from the session — never from user-supplied input.
 *  - ownerNotes on projects is NEVER returned to portal users.
 *  - Only documents with sharedWithClient=true are visible to portal users.
 *  - Internal notes (notesTable) are never exposed — the messages table is
 *    the sole communication channel with clients.
 */
import { Router, type IRouter } from "express";
import { eq, and, desc } from "drizzle-orm";
import bcrypt from "bcryptjs";
import {
  db,
  clientPortalUsersTable,
  clientPortalMessagesTable,
  clientsTable,
  projectsTable,
  deliverablesTable,
  paymentsTable,
  documentsTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { requireClientPortalAuth } from "../middleware/auth";

const router: IRouter = Router();

// ─────────────────────────────────────────────────────────────────────────────
// Portal Auth — public endpoints
// ─────────────────────────────────────────────────────────────────────────────

/**
 * POST /api/portal/auth/login
 * Authenticates a client portal user and creates a portal session.
 */
router.post("/portal/auth/login", async (req, res): Promise<void> => {
  const { email, password } = req.body ?? {};
  if (!email || !password) {
    res.status(400).json({ error: "Email and password are required" });
    return;
  }

  const [portalUser] = await db
    .select()
    .from(clientPortalUsersTable)
    .where(eq(clientPortalUsersTable.email, String(email).toLowerCase().trim()))
    .limit(1);

  if (!portalUser) {
    await bcrypt.compare(password, "$2b$10$invalidhashpadding000000000000000000");
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  if (!portalUser.isActive) {
    res.status(403).json({ error: "Your portal access has been deactivated. Please contact your agency." });
    return;
  }

  const valid = await bcrypt.compare(String(password), portalUser.passwordHash);
  if (!valid) {
    res.status(401).json({ error: "Invalid email or password" });
    return;
  }

  await db
    .update(clientPortalUsersTable)
    .set({ lastLoginAt: new Date() })
    .where(eq(clientPortalUsersTable.id, portalUser.id));

  req.session.clientPortalUserId = portalUser.id;
  req.session.clientPortalClientId = portalUser.clientId;
  req.session.clientPortalWorkspaceId = portalUser.workspaceId;
  req.session.clientPortalUserName = portalUser.name;

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = portalUser;
  res.json({ ...safeUser, lastLoginAt: portalUser.lastLoginAt?.toISOString() ?? null, createdAt: portalUser.createdAt.toISOString() });
});

/**
 * POST /api/portal/auth/logout
 */
router.post("/portal/auth/logout", (req, res): void => {
  req.session.destroy((err) => {
    if (err) {
      res.status(500).json({ error: "Logout failed" });
      return;
    }
    res.clearCookie("autflow.sid");
    res.json({ success: true });
  });
});

/**
 * GET /api/portal/auth/me
 * Returns the currently authenticated portal user.
 */
router.get("/portal/auth/me", requireClientPortalAuth, async (req, res): Promise<void> => {
  const [portalUser] = await db
    .select()
    .from(clientPortalUsersTable)
    .where(eq(clientPortalUsersTable.id, req.session.clientPortalUserId!))
    .limit(1);

  if (!portalUser || !portalUser.isActive) {
    req.session.destroy(() => {});
    res.status(401).json({ error: "Session invalid" });
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = portalUser;
  res.json({ ...safeUser, lastLoginAt: portalUser.lastLoginAt?.toISOString() ?? null, createdAt: portalUser.createdAt.toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Portal Data — all require portal auth
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/portal/dashboard
 */
router.get("/portal/dashboard", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;

  const [client] = await db
    .select({ companyName: clientsTable.companyName })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.workspaceId, wid)))
    .limit(1);

  const projects = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      status: projectsTable.status,
      progress: projectsTable.progress,
      deadline: projectsTable.deadline,
    })
    .from(projectsTable)
    .where(and(eq(projectsTable.clientId, clientId), eq(projectsTable.workspaceId, wid)));

  const payments = await db
    .select({
      id: paymentsTable.id,
      invoiceNumber: paymentsTable.invoiceNumber,
      amount: paymentsTable.amount,
      status: paymentsTable.status,
      dueDate: paymentsTable.dueDate,
    })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.clientId, clientId), eq(paymentsTable.workspaceId, wid)));

  const pendingPayments = payments.filter((p) => p.status === "pending" || p.status === "overdue");
  const totalOutstanding = pendingPayments.reduce((sum, p) => sum + Number(p.amount), 0);

  const upcomingDeadlines = projects
    .filter((p) => p.deadline && p.status !== "delivered" && p.status !== "cancelled")
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 3);

  res.json({
    client: client ?? null,
    stats: {
      totalProjects: projects.length,
      activeProjects: projects.filter((p) => !["delivered", "cancelled", "paused"].includes(p.status)).length,
      pendingInvoices: pendingPayments.length,
      totalOutstanding,
    },
    upcomingDeadlines,
    recentProjects: projects
      .sort((a, b) => (b.status === "delivered" ? 1 : -1))
      .slice(0, 5)
      .map((p) => ({ ...p, amount: undefined })),
  });
});

/**
 * GET /api/portal/projects
 */
router.get("/portal/projects", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;

  const projects = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      status: projectsTable.status,
      priority: projectsTable.priority,
      progress: projectsTable.progress,
      startDate: projectsTable.startDate,
      deadline: projectsTable.deadline,
      description: projectsTable.description,
      // ownerNotes intentionally excluded
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .where(and(eq(projectsTable.clientId, clientId), eq(projectsTable.workspaceId, wid)));

  res.json(
    projects.map((p) => ({
      ...p,
      createdAt: p.createdAt.toISOString(),
      updatedAt: p.updatedAt.toISOString(),
    })),
  );
});

/**
 * GET /api/portal/projects/:id
 * Returns project + deliverables. ownerNotes is never included.
 */
router.get("/portal/projects/:id", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;
  const projectId = parseInt(String(req.params.id), 10);
  if (!projectId) { res.status(400).json({ error: "Invalid project id" }); return; }

  const [project] = await db
    .select({
      id: projectsTable.id,
      name: projectsTable.name,
      status: projectsTable.status,
      priority: projectsTable.priority,
      progress: projectsTable.progress,
      startDate: projectsTable.startDate,
      deadline: projectsTable.deadline,
      description: projectsTable.description,
      // ownerNotes intentionally excluded
      createdAt: projectsTable.createdAt,
      updatedAt: projectsTable.updatedAt,
    })
    .from(projectsTable)
    .where(
      and(
        eq(projectsTable.id, projectId),
        eq(projectsTable.clientId, clientId),
        eq(projectsTable.workspaceId, wid),
      ),
    )
    .limit(1);

  if (!project) {
    res.status(404).json({ error: "Project not found" });
    return;
  }

  const deliverables = await db
    .select()
    .from(deliverablesTable)
    .where(eq(deliverablesTable.projectId, projectId));

  res.json({
    ...project,
    createdAt: project.createdAt.toISOString(),
    updatedAt: project.updatedAt.toISOString(),
    deliverables: deliverables.map((d) => ({
      ...d,
      createdAt: d.createdAt.toISOString(),
    })),
  });
});

/**
 * GET /api/portal/documents
 * Only returns documents explicitly shared with the client.
 */
router.get("/portal/documents", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;

  const docs = await db
    .select()
    .from(documentsTable)
    .where(
      and(
        eq(documentsTable.clientId, clientId),
        eq(documentsTable.workspaceId, wid),
        eq(documentsTable.sharedWithClient, true),
      ),
    )
    .orderBy(desc(documentsTable.createdAt));

  res.json(docs.map((d) => ({ ...d, createdAt: d.createdAt.toISOString() })));
});

/**
 * GET /api/portal/payments
 * Returns the client's invoices.
 */
router.get("/portal/payments", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;

  const payments = await db
    .select({
      id: paymentsTable.id,
      invoiceNumber: paymentsTable.invoiceNumber,
      amount: paymentsTable.amount,
      status: paymentsTable.status,
      dueDate: paymentsTable.dueDate,
      paidDate: paymentsTable.paidDate,
      paymentMethod: paymentsTable.paymentMethod,
      // notes intentionally excluded (internal field)
      createdAt: paymentsTable.createdAt,
    })
    .from(paymentsTable)
    .where(and(eq(paymentsTable.clientId, clientId), eq(paymentsTable.workspaceId, wid)))
    .orderBy(desc(paymentsTable.createdAt));

  res.json(payments.map((p) => ({ ...p, amount: Number(p.amount), createdAt: p.createdAt.toISOString() })));
});

/**
 * GET /api/portal/messages
 * Returns the portal message thread for this client.
 */
router.get("/portal/messages", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;

  const messages = await db
    .select()
    .from(clientPortalMessagesTable)
    .where(and(eq(clientPortalMessagesTable.clientId, clientId), eq(clientPortalMessagesTable.workspaceId, wid)))
    .orderBy(clientPortalMessagesTable.createdAt);

  res.json(messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

/**
 * POST /api/portal/messages
 * Client sends a message to the agency.
 */
router.post("/portal/messages", requireClientPortalAuth, async (req, res): Promise<void> => {
  const wid = req.session.clientPortalWorkspaceId!;
  const clientId = req.session.clientPortalClientId!;
  const { message } = req.body ?? {};

  if (!message || !String(message).trim()) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const [msg] = await db
    .insert(clientPortalMessagesTable)
    .values({
      workspaceId: wid,
      clientId,
      senderType: "client",
      senderName: req.session.clientPortalUserName ?? "Client",
      message: String(message).trim(),
    })
    .returning();

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
});

// ─────────────────────────────────────────────────────────────────────────────
// Portal Admin — agency team management (requires team auth)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * GET /api/portal-admin/clients/:clientId/access
 * Returns the portal user for a given client (if any).
 */
router.get("/portal-admin/clients/:clientId/access", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const clientId = parseInt(String(req.params.clientId), 10);
  if (!clientId) { res.status(400).json({ error: "Invalid client id" }); return; }

  const [portalUser] = await db
    .select()
    .from(clientPortalUsersTable)
    .where(and(eq(clientPortalUsersTable.clientId, clientId), eq(clientPortalUsersTable.workspaceId, wid)))
    .limit(1);

  if (!portalUser) {
    res.json(null);
    return;
  }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = portalUser;
  res.json({ ...safeUser, lastLoginAt: portalUser.lastLoginAt?.toISOString() ?? null, createdAt: portalUser.createdAt.toISOString() });
});

/**
 * POST /api/portal-admin/clients/:clientId/access
 * Creates or replaces the portal user for a client.
 */
router.post("/portal-admin/clients/:clientId/access", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const clientId = parseInt(String(req.params.clientId), 10);
  if (!clientId) { res.status(400).json({ error: "Invalid client id" }); return; }

  const { name, email, password } = req.body ?? {};
  if (!name || !email || !password) {
    res.status(400).json({ error: "Name, email, and password are required" });
    return;
  }
  if (String(password).length < 8) {
    res.status(400).json({ error: "Password must be at least 8 characters" });
    return;
  }

  // Verify client belongs to this workspace
  const [client] = await db
    .select({ id: clientsTable.id })
    .from(clientsTable)
    .where(and(eq(clientsTable.id, clientId), eq(clientsTable.workspaceId, wid)))
    .limit(1);
  if (!client) { res.status(404).json({ error: "Client not found" }); return; }

  const normalizedEmail = String(email).toLowerCase().trim();
  const passwordHash = await bcrypt.hash(String(password), 12);

  // Upsert — one portal user per client
  const existing = await db
    .select({ id: clientPortalUsersTable.id })
    .from(clientPortalUsersTable)
    .where(and(eq(clientPortalUsersTable.clientId, clientId), eq(clientPortalUsersTable.workspaceId, wid)))
    .limit(1);

  if (existing.length > 0) {
    const [updated] = await db
      .update(clientPortalUsersTable)
      .set({ name: String(name).trim(), email: normalizedEmail, passwordHash, isActive: true })
      .where(eq(clientPortalUsersTable.id, existing[0]!.id))
      .returning();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...safeUser } = updated!;
    res.json({ ...safeUser, lastLoginAt: updated!.lastLoginAt?.toISOString() ?? null, createdAt: updated!.createdAt.toISOString() });
  } else {
    // Check global email uniqueness
    const [emailTaken] = await db
      .select({ id: clientPortalUsersTable.id })
      .from(clientPortalUsersTable)
      .where(eq(clientPortalUsersTable.email, normalizedEmail))
      .limit(1);
    if (emailTaken) { res.status(409).json({ error: "A portal user with that email already exists" }); return; }

    const [created] = await db
      .insert(clientPortalUsersTable)
      .values({ workspaceId: wid, clientId, name: String(name).trim(), email: normalizedEmail, passwordHash, isActive: true })
      .returning();
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { passwordHash: _ph, ...safeUser } = created!;
    res.status(201).json({ ...safeUser, lastLoginAt: created!.lastLoginAt?.toISOString() ?? null, createdAt: created!.createdAt.toISOString() });
  }
});

/**
 * PATCH /api/portal-admin/clients/:clientId/access
 * Toggles active status or updates fields without changing password.
 */
router.patch("/portal-admin/clients/:clientId/access", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const clientId = parseInt(String(req.params.clientId), 10);
  if (!clientId) { res.status(400).json({ error: "Invalid client id" }); return; }

  const { isActive } = req.body ?? {};

  const [updated] = await db
    .update(clientPortalUsersTable)
    .set({ isActive: Boolean(isActive) })
    .where(and(eq(clientPortalUsersTable.clientId, clientId), eq(clientPortalUsersTable.workspaceId, wid)))
    .returning();

  if (!updated) { res.status(404).json({ error: "Portal user not found" }); return; }

  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { passwordHash: _ph, ...safeUser } = updated;
  res.json({ ...safeUser, lastLoginAt: updated.lastLoginAt?.toISOString() ?? null, createdAt: updated.createdAt.toISOString() });
});

/**
 * DELETE /api/portal-admin/clients/:clientId/access
 * Revokes portal access (deletes the portal user).
 */
router.delete("/portal-admin/clients/:clientId/access", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const clientId = parseInt(String(req.params.clientId), 10);
  if (!clientId) { res.status(400).json({ error: "Invalid client id" }); return; }

  await db
    .delete(clientPortalUsersTable)
    .where(and(eq(clientPortalUsersTable.clientId, clientId), eq(clientPortalUsersTable.workspaceId, wid)));

  res.sendStatus(204);
});

/**
 * GET /api/portal-admin/clients/:clientId/messages
 * Agency view of the message thread.
 */
router.get("/portal-admin/clients/:clientId/messages", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const clientId = parseInt(String(req.params.clientId), 10);
  if (!clientId) { res.status(400).json({ error: "Invalid client id" }); return; }

  const messages = await db
    .select()
    .from(clientPortalMessagesTable)
    .where(and(eq(clientPortalMessagesTable.clientId, clientId), eq(clientPortalMessagesTable.workspaceId, wid)))
    .orderBy(clientPortalMessagesTable.createdAt);

  res.json(messages.map((m) => ({ ...m, createdAt: m.createdAt.toISOString() })));
});

/**
 * POST /api/portal-admin/clients/:clientId/messages
 * Agency sends a message to the client.
 */
router.post("/portal-admin/clients/:clientId/messages", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const clientId = parseInt(String(req.params.clientId), 10);
  if (!clientId) { res.status(400).json({ error: "Invalid client id" }); return; }

  const { message } = req.body ?? {};
  if (!message || !String(message).trim()) {
    res.status(400).json({ error: "Message cannot be empty" });
    return;
  }

  const [msg] = await db
    .insert(clientPortalMessagesTable)
    .values({
      workspaceId: wid,
      clientId,
      senderType: "agency",
      senderName: req.session.userName ?? "Agency",
      message: String(message).trim(),
    })
    .returning();

  res.status(201).json({ ...msg, createdAt: msg.createdAt.toISOString() });
});

/**
 * PATCH /api/portal-admin/documents/:id/share
 * Toggle sharedWithClient on a document.
 */
router.patch("/portal-admin/documents/:id/share", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const docId = parseInt(String(req.params.id), 10);
  if (!docId) { res.status(400).json({ error: "Invalid document id" }); return; }

  const { sharedWithClient } = req.body ?? {};

  const [doc] = await db
    .update(documentsTable)
    .set({ sharedWithClient: Boolean(sharedWithClient) })
    .where(and(eq(documentsTable.id, docId), eq(documentsTable.workspaceId, wid)))
    .returning();

  if (!doc) { res.status(404).json({ error: "Document not found" }); return; }

  res.json({ ...doc, createdAt: doc.createdAt.toISOString() });
});

export default router;
