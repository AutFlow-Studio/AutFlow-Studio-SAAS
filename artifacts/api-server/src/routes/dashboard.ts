import { Router, type IRouter } from "express";
import { eq, sql, and } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  paymentsTable,
  activityTable,
  meetingsTable,
  notesTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";

const router: IRouter = Router();

router.get("/dashboard", requireAuth, async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const now = new Date();
  const nowStr = now.toISOString().split("T")[0]!;
  const thirtyDaysLater = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
  const thirtyDaysStr = thirtyDaysLater.toISOString().split("T")[0]!;
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

  // ── Health Score (0–100) ───────────────────────────────────────────────────
  // Four equally-weighted pillars, each 0–25 pts
  const totalInvoices = allPayments.length;
  const totalRevenuePlusOutstanding = totalRevenue + outstandingPayments;

  // Revenue health: penalise overdue amount relative to total billed
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

  // Delivery health: penalise delayed projects relative to total
  const deliveryScore =
    projects.length === 0
      ? 25
      : Math.max(
          0,
          Math.round(25 * (1 - delayedProjects / Math.max(projects.length, 1))),
        );

  // Client activity: active ratio
  const clientActivityScore =
    totalClients === 0
      ? 25
      : Math.round((activeClients / Math.max(totalClients, 1)) * 25);

  // Payment status: penalise overdue invoices
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
    outstandingPayments,
    overdueInvoiceCount,
    overdueAmount,
    mrr,
    // Health
    healthScore,
    healthBreakdown,
    // Feeds
    recentActivity,
    upcomingMeetings,
    recentNotes,
  });
});

export default router;
