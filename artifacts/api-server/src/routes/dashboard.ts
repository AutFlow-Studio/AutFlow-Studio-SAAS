import { Router, type IRouter } from "express";
import { eq, sql, and, isNotNull } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  paymentsTable,
  activityTable,
  meetingsTable,
  notesTable,
  tasksTable,
  deliverablesTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const now = new Date();
  const nowStr = now.toISOString().split("T")[0]!;
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysStr = thirtyDaysLater.toISOString().split("T")[0]!;
  const sevenDaysLater = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
  const sevenDaysStr = sevenDaysLater.toISOString().split("T")[0]!;
  const sevenDaysAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const sevenDaysAgoStr = sevenDaysAgo.toISOString().split("T")[0]!;
  const currentMonthStart = new Date(now.getFullYear(), now.getMonth(), 1)
    .toISOString()
    .split("T")[0]!;

  const [
    allClients,
    allProjects,
    allPayments,
    recentActivityRows,
    upcomingMeetingRows,
    recentNoteRows,
    allTasks,
    allDeliverables,
  ] = await Promise.all([
    db.select().from(clientsTable).where(eq(clientsTable.workspaceId, wid)),
    db
      .select({ project: projectsTable, clientName: clientsTable.companyName })
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(eq(projectsTable.workspaceId, wid)),
    db
      .select({ payment: paymentsTable, clientName: clientsTable.companyName })
      .from(paymentsTable)
      .leftJoin(clientsTable, eq(paymentsTable.clientId, clientsTable.id))
      .where(eq(paymentsTable.workspaceId, wid)),
    db
      .select({ activity: activityTable, clientName: clientsTable.companyName })
      .from(activityTable)
      .leftJoin(clientsTable, eq(activityTable.clientId, clientsTable.id))
      .where(eq(activityTable.workspaceId, wid))
      .orderBy(sql`${activityTable.createdAt} DESC`)
      .limit(10),
    db
      .select({ meeting: meetingsTable, clientName: clientsTable.companyName })
      .from(meetingsTable)
      .leftJoin(clientsTable, eq(meetingsTable.clientId, clientsTable.id))
      .where(and(eq(meetingsTable.workspaceId, wid), sql`${meetingsTable.date} >= NOW()`))
      .orderBy(meetingsTable.date)
      .limit(5),
    db
      .select({ note: notesTable, clientName: clientsTable.companyName })
      .from(notesTable)
      .leftJoin(clientsTable, eq(notesTable.clientId, clientsTable.id))
      .where(eq(notesTable.workspaceId, wid))
      .orderBy(sql`${notesTable.createdAt} DESC`)
      .limit(5),
    db
      .select({
        task: tasksTable,
        clientName: clientsTable.companyName,
        projectName: projectsTable.name,
      })
      .from(tasksTable)
      .leftJoin(clientsTable, eq(tasksTable.clientId, clientsTable.id))
      .leftJoin(projectsTable, eq(tasksTable.projectId, projectsTable.id))
      .where(and(eq(tasksTable.workspaceId, wid), sql`${tasksTable.status} != 'done'`))
      .orderBy(sql`${tasksTable.deadline} ASC NULLS LAST`),
    db
      .select({
        deliverable: deliverablesTable,
        projectName: projectsTable.name,
        clientName: clientsTable.companyName,
        clientId: projectsTable.clientId,
      })
      .from(deliverablesTable)
      .leftJoin(projectsTable, eq(deliverablesTable.projectId, projectsTable.id))
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(eq(deliverablesTable.workspaceId, wid))
      .orderBy(sql`${deliverablesTable.updatedAt} DESC`),
  ]);

  // ── Clients ────────────────────────────────────────────────────────────────
  const totalClients = allClients.length;
  const activeClients = allClients.filter((c) => c.status === "active").length;
  const inactiveClients = allClients.filter((c) => c.status === "inactive").length;

  // ── Projects ───────────────────────────────────────────────────────────────
  const projects = allProjects.map(({ project, clientName }) => ({
    ...project,
    clientName: clientName ?? null,
    estimatedBudget: project.estimatedBudget ? Number(project.estimatedBudget) : null,
    actualCost: project.actualCost ? Number(project.actualCost) : null,
    revenue: project.revenue ? Number(project.revenue) : null,
    profit:
      project.revenue && project.actualCost
        ? Number(project.revenue) - Number(project.actualCost)
        : null,
    updatedAt: project.updatedAt.toISOString(),
    createdAt: project.createdAt.toISOString(),
  }));

  const projectsInProgress = projects.filter((p) =>
    ["design", "development", "testing", "review"].includes(p.status),
  ).length;
  const completedProjects = projects.filter((p) => p.status === "delivered").length;
  const cancelledProjects = projects.filter((p) => p.status === "cancelled").length;
  const totalNonCancelled = projects.length - cancelledProjects;
  const delayedProjects = projects.filter(
    (p) =>
      p.deadline &&
      p.deadline < nowStr &&
      p.status !== "delivered" &&
      p.status !== "cancelled",
  ).length;
  const completionRate =
    totalNonCancelled === 0
      ? 100
      : Math.round((completedProjects / totalNonCancelled) * 100);

  const upcomingDeadlines = projects
    .filter(
      (p) =>
        p.deadline &&
        p.deadline >= nowStr &&
        p.deadline <= thirtyDaysStr &&
        p.status !== "delivered" &&
        p.status !== "cancelled",
    )
    .sort((a, b) => (a.deadline ?? "").localeCompare(b.deadline ?? ""))
    .slice(0, 5);

  const projectsAtRisk = projects
    .filter(
      (p) =>
        (p.deadline &&
          p.deadline < nowStr &&
          p.status !== "delivered" &&
          p.status !== "cancelled") ||
        (p.progress < 30 &&
          p.deadline &&
          p.deadline <= thirtyDaysStr &&
          p.status !== "delivered" &&
          p.status !== "cancelled"),
    )
    .slice(0, 5);

  const projectsNeedingAttention = projects
    .filter(
      (p) =>
        p.status === "paused" ||
        p.status === "waiting" ||
        (p.progress === 0 && p.status !== "planning" && p.status !== "cancelled"),
    )
    .slice(0, 5);

  // ── Payments ───────────────────────────────────────────────────────────────
  const invoicesAwaitingPayment = allPayments.filter(
    ({ payment }) => payment.status === "pending" || payment.status === "overdue",
  ).length;

  const totalRevenue = allPayments
    .filter(({ payment }) => payment.status === "paid")
    .reduce((sum, { payment }) => sum + Number(payment.amount), 0);

  const outstandingPayments = allPayments
    .filter(
      ({ payment }) =>
        payment.status === "pending" || payment.status === "overdue",
    )
    .reduce((sum, { payment }) => sum + Number(payment.amount), 0);

  // Overdue invoices: explicitly overdue status, OR pending past due date
  const overdueInvoices = allPayments.filter(
    ({ payment }) =>
      payment.status === "overdue" ||
      (payment.status === "pending" &&
        payment.dueDate != null &&
        payment.dueDate < nowStr),
  );
  const overdueInvoiceCount = overdueInvoices.length;
  const overdueAmount = overdueInvoices.reduce(
    (sum, { payment }) => sum + Number(payment.amount),
    0,
  );

  // MRR: payments paid in the current calendar month
  const mrr = allPayments
    .filter(
      ({ payment }) =>
        payment.status === "paid" &&
        payment.paidDate != null &&
        payment.paidDate >= currentMonthStart,
    )
    .reduce((sum, { payment }) => sum + Number(payment.amount), 0);

  // Total invoiced (all time, regardless of status)
  const totalInvoiced = allPayments
    .filter(({ payment }) => payment.status !== "cancelled")
    .reduce((sum, { payment }) => sum + Number(payment.amount), 0);

  // Revenue per client (paid only)
  const revenueByClientMap = new Map<number, { clientName: string; revenue: number; outstanding: number }>();
  for (const { payment, clientName } of allPayments) {
    if (!payment.clientId) continue;
    const entry = revenueByClientMap.get(payment.clientId) ?? {
      clientName: clientName ?? "Unknown",
      revenue: 0,
      outstanding: 0,
    };
    if (payment.status === "paid") {
      entry.revenue += Number(payment.amount);
    } else if (payment.status === "pending" || payment.status === "overdue") {
      entry.outstanding += Number(payment.amount);
    }
    revenueByClientMap.set(payment.clientId, entry);
  }
  const revenueByClient = Array.from(revenueByClientMap.entries())
    .map(([clientId, d]) => ({ clientId, ...d }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 5);

  // ── Health Score (0–100) ───────────────────────────────────────────────────
  const totalInvoices = allPayments.length;
  const totalRevenuePlusOutstanding = totalRevenue + outstandingPayments;

  const revenueScore =
    totalRevenuePlusOutstanding === 0
      ? 25
      : Math.max(
          0,
          Math.round(
            25 *
              (1 -
                Math.min(
                  overdueAmount / Math.max(totalRevenuePlusOutstanding, 1),
                  1,
                )),
          ),
        );

  const deliveryScore =
    projects.length === 0
      ? 25
      : Math.max(
          0,
          Math.round(25 * (1 - delayedProjects / Math.max(projects.length, 1))),
        );

  const clientActivityScore =
    totalClients === 0
      ? 25
      : Math.round((activeClients / Math.max(totalClients, 1)) * 25);

  const paymentScore =
    totalInvoices === 0
      ? 25
      : Math.max(
          0,
          Math.round(
            25 -
              (overdueInvoiceCount / Math.max(totalInvoices, 1)) * 25,
          ),
        );

  const healthScore = Math.min(
    100,
    revenueScore + deliveryScore + clientActivityScore + paymentScore,
  );
  const healthBreakdown = {
    revenue: revenueScore,
    delivery: deliveryScore,
    clientActivity: clientActivityScore,
    payments: paymentScore,
  };

  // ── Client Health ──────────────────────────────────────────────────────────
  // Build per-client context to determine health reason
  const clientProjectsMap = new Map<number, typeof projects[0][]>();
  for (const p of projects) {
    if (!p.clientId) continue;
    const arr = clientProjectsMap.get(p.clientId) ?? [];
    arr.push(p);
    clientProjectsMap.set(p.clientId, arr);
  }
  const clientOverdueMap = new Map<number, number>();
  for (const { payment } of overdueInvoices) {
    if (!payment.clientId) continue;
    clientOverdueMap.set(payment.clientId, (clientOverdueMap.get(payment.clientId) ?? 0) + 1);
  }

  const clientHealth = allClients
    .filter((c) => c.status !== "inactive" && c.lifecycleStatus !== "archived")
    .map((c) => {
      const clientProjects = clientProjectsMap.get(c.id) ?? [];
      const hasDelayedProject = clientProjects.some(
        (p) => p.deadline && p.deadline < nowStr && p.status !== "delivered" && p.status !== "cancelled",
      );
      const hasOverdueInvoice = (clientOverdueMap.get(c.id) ?? 0) > 0;
      const hasBlockedProject = clientProjects.some((p) => p.status === "paused" || p.status === "waiting");
      const hasDeliverableWaiting = allDeliverables.some(
        (d) => d.clientId === c.id && d.deliverable.status === "sent",
      );
      const hasRevisionRequested = allDeliverables.some(
        (d) => d.clientId === c.id && d.deliverable.status === "changes_requested",
      );

      // Determine health status and primary reason
      let healthStatus: "healthy" | "attention" | "at_risk";
      let reason: string;

      const score = c.healthScore ?? 70;

      if (c.lifecycleStatus === "at_risk" || hasDelayedProject || (hasOverdueInvoice && hasDelayedProject)) {
        healthStatus = "at_risk";
        if (hasDelayedProject) reason = "Project delayed";
        else if (hasOverdueInvoice) reason = "Payment overdue";
        else reason = "At risk";
      } else if (hasOverdueInvoice || hasBlockedProject || hasRevisionRequested || score < 50) {
        healthStatus = "attention";
        if (hasOverdueInvoice) reason = "Payment overdue";
        else if (hasRevisionRequested) reason = "Revision requested";
        else if (hasBlockedProject) reason = "Project blocked";
        else reason = "Low health score";
      } else if (hasDeliverableWaiting) {
        healthStatus = "attention";
        reason = "Waiting for approval";
      } else {
        healthStatus = "healthy";
        reason = "On track";
      }

      return {
        id: c.id,
        companyName: c.companyName,
        healthScore: score,
        lifecycleStatus: c.lifecycleStatus,
        healthStatus,
        reason,
      };
    })
    .sort((a, b) => {
      const order = { at_risk: 0, attention: 1, healthy: 2 };
      return order[a.healthStatus] - order[b.healthStatus];
    })
    .slice(0, 8);

  // ── Tasks ──────────────────────────────────────────────────────────────────
  const activeTasks = allTasks.map(({ task, clientName, projectName }) => ({
    id: task.id,
    title: task.title,
    priority: task.priority,
    status: task.status,
    deadline: task.deadline,
    clientName: clientName ?? null,
    projectName: projectName ?? null,
  }));

  const overdueTasks = activeTasks.filter(
    (t) => t.deadline && t.deadline < nowStr && t.status !== "done",
  ).slice(0, 5);

  const todayTasks = activeTasks.filter(
    (t) => t.deadline === nowStr,
  ).slice(0, 5);

  const upcomingTasks = activeTasks.filter(
    (t) => t.deadline && t.deadline > nowStr && t.deadline <= sevenDaysStr,
  ).slice(0, 5);

  const taskSummary = {
    overdueCount: activeTasks.filter((t) => t.deadline && t.deadline < nowStr).length,
    todayCount: activeTasks.filter((t) => t.deadline === nowStr).length,
    upcomingCount: activeTasks.filter(
      (t) => t.deadline && t.deadline > nowStr && t.deadline <= sevenDaysStr,
    ).length,
    totalActive: activeTasks.length,
    overdueTasks,
    todayTasks,
    upcomingTasks,
  };

  // ── Deliverables ───────────────────────────────────────────────────────────
  const waitingApproval = allDeliverables
    .filter((d) => d.deliverable.status === "sent")
    .map((d) => ({
      id: d.deliverable.id,
      title: d.deliverable.title,
      projectName: d.projectName ?? null,
      clientName: d.clientName ?? null,
      deadline: d.deliverable.deadline,
      projectId: d.deliverable.projectId,
    }))
    .slice(0, 5);

  const pendingRevisions = allDeliverables
    .filter((d) => d.deliverable.status === "changes_requested")
    .map((d) => ({
      id: d.deliverable.id,
      title: d.deliverable.title,
      projectName: d.projectName ?? null,
      clientName: d.clientName ?? null,
      revisionCount: d.deliverable.revisionCount,
      projectId: d.deliverable.projectId,
    }))
    .slice(0, 5);

  const recentlyApproved = allDeliverables
    .filter(
      (d) =>
        d.deliverable.status === "approved" &&
        d.deliverable.approvalDate &&
        d.deliverable.approvalDate >= sevenDaysAgoStr,
    )
    .map((d) => ({
      id: d.deliverable.id,
      title: d.deliverable.title,
      projectName: d.projectName ?? null,
      clientName: d.clientName ?? null,
      approvalDate: d.deliverable.approvalDate,
      projectId: d.deliverable.projectId,
    }))
    .slice(0, 5);

  const deliverableSummary = {
    waitingApprovalCount: allDeliverables.filter((d) => d.deliverable.status === "sent").length,
    pendingRevisionsCount: allDeliverables.filter((d) => d.deliverable.status === "changes_requested").length,
    recentlyApprovedCount: allDeliverables.filter(
      (d) =>
        d.deliverable.status === "approved" &&
        d.deliverable.approvalDate &&
        d.deliverable.approvalDate >= sevenDaysAgoStr,
    ).length,
    waitingApproval,
    pendingRevisions,
    recentlyApproved,
  };

  // ── Activity / Meetings / Notes ────────────────────────────────────────────
  const recentActivity = recentActivityRows.map(({ activity, clientName }) => ({
    ...activity,
    clientName: clientName ?? null,
    createdAt: activity.createdAt.toISOString(),
  }));

  const upcomingMeetings = upcomingMeetingRows.map(({ meeting, clientName }) => ({
    ...meeting,
    clientName: clientName ?? null,
    date: meeting.date.toISOString(),
    nextMeeting: meeting.nextMeeting ? meeting.nextMeeting.toISOString() : null,
    createdAt: meeting.createdAt.toISOString(),
  }));

  const recentNotes = recentNoteRows.map(({ note, clientName }) => ({
    ...note,
    clientName: clientName ?? null,
    createdAt: note.createdAt.toISOString(),
    updatedAt: note.updatedAt.toISOString(),
  }));

  res.json({
    // Clients
    totalClients,
    activeClients,
    inactiveClients,
    // Projects
    projectsInProgress,
    completedProjects,
    delayedProjects,
    completionRate,
    upcomingDeadlines,
    projectsAtRisk,
    projectsNeedingAttention,
    // Payments
    invoicesAwaitingPayment,
    totalRevenue,
    totalInvoiced,
    outstandingPayments,
    overdueInvoiceCount,
    overdueAmount,
    mrr,
    revenueByClient,
    // Health
    healthScore,
    healthBreakdown,
    // Client Health
    clientHealth,
    // Tasks
    taskSummary,
    // Deliverables
    deliverableSummary,
    // Feeds
    recentActivity,
    upcomingMeetings,
    recentNotes,
  });
});

export default router;
