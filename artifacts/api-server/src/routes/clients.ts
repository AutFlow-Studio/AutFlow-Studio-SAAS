import { Router, type IRouter } from "express";
import { eq, ilike, and, sql, desc, asc } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  paymentsTable,
  activityTable,
  deliverablesTable,
} from "@workspace/db";
import { createNotification } from "../lib/createNotification";
import {
  ListClientsQueryParams,
  CreateClientBody,
  GetClientParams,
  UpdateClientParams,
  UpdateClientBody,
  DeleteClientParams,
} from "@workspace/api-zod";

const router: IRouter = Router();

/** Map a DB client row to a consistent API shape. */
function mapClient(c: typeof clientsTable.$inferSelect) {
  return {
    ...c,
    contractValue: c.contractValue ? Number(c.contractValue) : null,
    monthlyRetainer: c.monthlyRetainer ? Number(c.monthlyRetainer) : null,
    tags: c.tags ?? [],
    updatedAt: c.updatedAt.toISOString(),
    createdAt: c.createdAt.toISOString(),
  };
}

/**
 * Compute a health score (0–100) from existing data — no AI required.
 *
 * Deductions:
 *  -25  any overdue payments
 *  -10  each additional overdue payment (capped at -20 extra)
 *  -20  any project past its deadline with status not completed/archived
 *  -10  each additional overdue project (capped at -20 extra)
 *  -15  any deliverable in "sent" status >7 days (awaiting client approval)
 *  -10  no activity in the last 30 days
 *
 * Bonus: +5 if activity in last 7 days.
 * Clamped to [0, 100].
 */
function computeHealthScore(
  payments: Array<{ status: string }>,
  projects: Array<{ status: string; deadline: string | null }>,
  deliverables: Array<{ status: string; createdAt: Date | string }>,
  lastActivityAt: Date | null,
): { score: number; reasons: string[] } {
  let score = 100;
  const reasons: string[] = [];
  const now = new Date();

  // Overdue payments
  const overduePayments = payments.filter((p) => p.status === "overdue");
  if (overduePayments.length > 0) {
    score -= 25;
    score -= Math.min(20, (overduePayments.length - 1) * 10);
    reasons.push(
      `${overduePayments.length} overdue invoice${overduePayments.length > 1 ? "s" : ""}`,
    );
  }

  // Projects past deadline
  const delayedProjects = projects.filter(
    (p) =>
      p.deadline &&
      new Date(p.deadline) < now &&
      !["completed", "archived", "delivered", "cancelled"].includes(p.status),
  );
  if (delayedProjects.length > 0) {
    score -= 20;
    score -= Math.min(20, (delayedProjects.length - 1) * 10);
    reasons.push(
      `${delayedProjects.length} project${delayedProjects.length > 1 ? "s" : ""} past deadline`,
    );
  }

  // Deliverables awaiting client approval (sent status, older than 7 days)
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const pendingApprovals = deliverables.filter(
    (d) =>
      d.status === "sent" && new Date(d.createdAt) < sevenDaysAgo,
  );
  if (pendingApprovals.length > 0) {
    score -= 15;
    reasons.push(
      `${pendingApprovals.length} deliverable${pendingApprovals.length > 1 ? "s" : ""} awaiting client approval`,
    );
  }

  // Activity recency
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoActivity = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  if (!lastActivityAt || lastActivityAt < thirtyDaysAgo) {
    score -= 10;
    reasons.push("No recent activity in the last 30 days");
  } else if (lastActivityAt > sevenDaysAgoActivity) {
    score += 5; // bonus for active engagement
  }

  return { score: Math.max(0, Math.min(100, score)), reasons };
}

// ── GET /clients ──────────────────────────────────────────────────────────────

router.get("/clients", async (req, res): Promise<void> => {
  const parsed = ListClientsQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const { status, search } = parsed.data;
  const lifecycleStatus = req.query.lifecycleStatus as string | undefined;
  const sort = (req.query.sort as string) ?? "name";
  const wid = req.session.workspaceId!;

  const conditions = [eq(clientsTable.workspaceId, wid)];
  if (status) conditions.push(eq(clientsTable.status, status));
  if (lifecycleStatus) conditions.push(eq(clientsTable.lifecycleStatus, lifecycleStatus));
  if (search) {
    const pattern = `%${search}%`;
    conditions.push(
      sql`(${ilike(clientsTable.companyName, pattern)} OR ${ilike(clientsTable.industry, pattern)} OR ${ilike(clientsTable.email, pattern)})`,
    );
  }

  let query = db.select().from(clientsTable).where(and(...conditions));

  // Sorting (name and healthScore can be done in DB; revenue/activity sorted post-fetch)
  if (sort === "healthScore") {
    query = query.orderBy(desc(sql`COALESCE(${clientsTable.healthScore}, 50)`)) as typeof query;
  } else {
    query = query.orderBy(asc(clientsTable.companyName)) as typeof query;
  }

  const clients = await query;

  const mapped = clients.map(mapClient);

  // For revenue/activity sorts we need extra data — only done on small lists
  if (sort === "revenue") {
    // Attach revenue from payments
    const clientIds = clients.map((c) => c.id);
    if (clientIds.length > 0) {
      const payments = await db
        .select({ clientId: paymentsTable.clientId, amount: paymentsTable.amount, status: paymentsTable.status })
        .from(paymentsTable)
        .where(and(eq(paymentsTable.workspaceId, wid), sql`${paymentsTable.clientId} = ANY(${sql.raw(`ARRAY[${clientIds.join(",")}]::integer[]`)})`));

      const revenueMap = new Map<number, number>();
      for (const p of payments) {
        if (p.status === "paid" && p.clientId) {
          revenueMap.set(p.clientId, (revenueMap.get(p.clientId) ?? 0) + Number(p.amount));
        }
      }
      mapped.sort((a, b) => (revenueMap.get(b.id) ?? 0) - (revenueMap.get(a.id) ?? 0));
    }
  } else if (sort === "recentActivity") {
    const clientIds = clients.map((c) => c.id);
    if (clientIds.length > 0) {
      const activity = await db
        .select({ clientId: activityTable.clientId, createdAt: activityTable.createdAt })
        .from(activityTable)
        .where(sql`${activityTable.clientId} = ANY(${sql.raw(`ARRAY[${clientIds.join(",")}]::integer[]`)})`)
        .orderBy(desc(activityTable.createdAt));

      const latestMap = new Map<number, Date>();
      for (const a of activity) {
        if (a.clientId && !latestMap.has(a.clientId)) latestMap.set(a.clientId, a.createdAt);
      }
      mapped.sort((a, b) => {
        const aTime = latestMap.get(a.id)?.getTime() ?? 0;
        const bTime = latestMap.get(b.id)?.getTime() ?? 0;
        return bTime - aTime;
      });
    }
  }

  res.json(mapped);
});

// ── POST /clients ─────────────────────────────────────────────────────────────

router.post("/clients", async (req, res): Promise<void> => {
  const parsed = CreateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [client] = await db
    .insert(clientsTable)
    .values({
      ...parsed.data,
      workspaceId: wid,
      // Default new clients to "prospect" in the agency lifecycle
      lifecycleStatus: (parsed.data as any).lifecycleStatus ?? "prospect",
      tags: parsed.data.tags ?? [],
      contractValue: parsed.data.contractValue != null ? String(parsed.data.contractValue) : undefined,
      monthlyRetainer: parsed.data.monthlyRetainer != null ? String(parsed.data.monthlyRetainer) : undefined,
    })
    .returning();

  await db.insert(activityTable).values({
    type: "client_created",
    entityType: "client",
    entityId: client.id,
    description: `Client "${client.companyName}" created`,
    clientId: client.id,
    workspaceId: wid,
  });

  void createNotification(
    {
      type: "client_created",
      title: "New client added",
      message: `"${client.companyName}" has been added as a client.`,
      entityType: "client",
      entityId: client.id,
      href: `/clients/${client.id}`,
    },
    wid,
  );

  res.status(201).json(mapClient(client));
});

// ── GET /clients/:id ──────────────────────────────────────────────────────────

router.get("/clients/:id", async (req, res): Promise<void> => {
  const params = GetClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [client] = await db
    .select()
    .from(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.workspaceId, wid)));

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  // Fetch all related data in parallel
  const [projects, allPayments, recentActivity, allDeliverables] = await Promise.all([
    db
      .select()
      .from(projectsTable)
      .where(and(eq(projectsTable.clientId, client.id), eq(projectsTable.workspaceId, wid)))
      .orderBy(sql`${projectsTable.createdAt} DESC`),

    db
      .select()
      .from(paymentsTable)
      .where(eq(paymentsTable.clientId, client.id))
      .orderBy(sql`${paymentsTable.createdAt} DESC`),

    db
      .select()
      .from(activityTable)
      .where(eq(activityTable.clientId, client.id))
      .orderBy(sql`${activityTable.createdAt} DESC`)
      .limit(15),

    // Deliverables via project join (scoped to this client's projects)
    db
      .select({ deliverable: deliverablesTable })
      .from(deliverablesTable)
      .innerJoin(projectsTable, eq(deliverablesTable.projectId, projectsTable.id))
      .where(
        and(
          eq(projectsTable.clientId, client.id),
          eq(projectsTable.workspaceId, wid),
        ),
      ),
  ]);

  const deliverables = allDeliverables.map((r) => r.deliverable);

  // Financial summary
  const totalRevenue = allPayments
    .filter((p) => p.status === "paid")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const totalInvoiced = allPayments.reduce((sum, p) => sum + Number(p.amount), 0);
  const outstandingBalance = allPayments
    .filter((p) => p.status === "pending" || p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const overdueAmount = allPayments
    .filter((p) => p.status === "overdue")
    .reduce((sum, p) => sum + Number(p.amount), 0);
  const openPayments = allPayments.filter(
    (p) => p.status === "pending" || p.status === "overdue",
  );

  // Deliverables summary
  const deliverablesSummary = {
    pendingApproval: deliverables.filter((d) => d.status === "sent").length,
    approved: deliverables.filter((d) => d.status === "approved").length,
    changesRequested: deliverables.filter((d) => d.status === "changes_requested").length,
    total: deliverables.length,
  };

  // Active projects count
  const activeProjectsCount = projects.filter(
    (p) => !["completed", "archived", "cancelled"].includes(p.status),
  ).length;

  // Last activity
  const lastActivityAt = recentActivity[0]?.createdAt ?? null;

  // Compute health score if not manually set
  const { score: computedScore, reasons: healthReasons } = computeHealthScore(
    allPayments,
    projects,
    deliverables,
    lastActivityAt,
  );
  const healthScore = client.healthScore ?? computedScore;

  // Persist computed score if not already stored (fire-and-forget)
  if (client.healthScore == null) {
    void db
      .update(clientsTable)
      .set({ healthScore: computedScore })
      .where(eq(clientsTable.id, client.id));
  }

  // Group deliverables by projectId so the frontend can access project.deliverables[]
  const deliverablesByProject = new Map<number, typeof deliverables>();
  for (const d of deliverables) {
    const list = deliverablesByProject.get(d.projectId) ?? [];
    list.push(d);
    deliverablesByProject.set(d.projectId, list);
  }

  res.json({
    ...mapClient(client),
    healthScore,
    projects: projects.map((p) => ({
      ...p,
      clientName: client.companyName,
      estimatedBudget: p.estimatedBudget ? Number(p.estimatedBudget) : null,
      actualCost: p.actualCost ? Number(p.actualCost) : null,
      revenue: p.revenue ? Number(p.revenue) : null,
      profit: p.revenue && p.actualCost ? Number(p.revenue) - Number(p.actualCost) : null,
      updatedAt: p.updatedAt.toISOString(),
      createdAt: p.createdAt.toISOString(),
      // Nest deliverables so the client detail page can render project.deliverables[]
      deliverables: (deliverablesByProject.get(p.id) ?? []).map((d) => ({
        ...d,
        createdAt: d.createdAt.toISOString(),
        updatedAt: d.updatedAt.toISOString(),
      })),
    })),
    openPayments: openPayments.map((p) => ({
      ...p,
      clientName: client.companyName,
      amount: Number(p.amount),
      remainingBalance: p.remainingBalance ? Number(p.remainingBalance) : null,
      createdAt: p.createdAt.toISOString(),
    })),
    totalRevenue,
    totalInvoiced,
    outstandingBalance,
    overdueAmount,
    activeProjectsCount,
    deliverablesSummary,
    healthReasons,
    lastActivityAt: lastActivityAt?.toISOString() ?? null,
    recentActivity: recentActivity.map((a) => ({
      ...a,
      clientName: client.companyName,
      createdAt: a.createdAt.toISOString(),
    })),
  });
});

// ── PATCH /clients/:id ────────────────────────────────────────────────────────

router.patch("/clients/:id", async (req, res): Promise<void> => {
  const params = UpdateClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const parsed = UpdateClientBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: parsed.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [client] = await db
    .update(clientsTable)
    .set({
      ...parsed.data,
      updatedAt: new Date(),
      contractValue: parsed.data.contractValue != null ? String(parsed.data.contractValue) : undefined,
      monthlyRetainer: parsed.data.monthlyRetainer != null ? String(parsed.data.monthlyRetainer) : undefined,
    })
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.workspaceId, wid)))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  await db.insert(activityTable).values({
    type: "client_updated",
    entityType: "client",
    entityId: client.id,
    description: `Client "${client.companyName}" updated`,
    clientId: client.id,
    workspaceId: wid,
  });

  res.json(mapClient(client));
});

// ── DELETE /clients/:id ───────────────────────────────────────────────────────

router.delete("/clients/:id", async (req, res): Promise<void> => {
  const params = DeleteClientParams.safeParse(req.params);
  if (!params.success) {
    res.status(400).json({ error: params.error.message });
    return;
  }
  const wid = req.session.workspaceId!;

  const [client] = await db
    .delete(clientsTable)
    .where(and(eq(clientsTable.id, params.data.id), eq(clientsTable.workspaceId, wid)))
    .returning();

  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  res.sendStatus(204);
});

export default router;
