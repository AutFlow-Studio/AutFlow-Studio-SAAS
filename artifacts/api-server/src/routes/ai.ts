import { Router, type IRouter } from "express";
import { eq, and, sql, desc, lte, gte, ilike, ne } from "drizzle-orm";
import {
  db,
  clientsTable,
  projectsTable,
  paymentsTable,
  tasksTable,
  meetingsTable,
  activityTable,
  notesTable,
  agencySettingsTable,
  deliverablesTable,
  invoicesTable,
  campaignsTable,
  clinicPatientsTable,
  clinicAppointmentsTable,
  clinicFollowupsTable,
  clinicTreatmentsTable,
  clinicBillingTable,
} from "@workspace/db";
import OpenAI from "openai";

const router: IRouter = Router();

function getOpenAI(): OpenAI {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) throw new Error("OPENAI_API_KEY is not configured.");
  return new OpenAI({ apiKey });
}

// ── Business-type helper ─────────────────────────────────────────────────────

async function getBusinessType(wid: number): Promise<string> {
  const [settings] = await db
    .select({ businessType: agencySettingsTable.businessType })
    .from(agencySettingsTable)
    .where(eq(agencySettingsTable.workspaceId, wid))
    .limit(1);
  return settings?.businessType ?? "digital-agency";
}

// ── Agency workspace context ──────────────────────────────────────────────────

async function buildWorkspaceContext(wid: number): Promise<string> {
  const now = new Date();
  const nowStr = now.toISOString().split("T")[0]!;
  const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
  const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  const [
    clients,
    projects,
    payments,
    invoices,
    tasks,
    deliverables,
    campaigns,
    meetings,
    recentActivity,
  ] = await Promise.all([
    db.select().from(clientsTable).where(eq(clientsTable.workspaceId, wid)),
    db
      .select({ p: projectsTable, clientName: clientsTable.companyName })
      .from(projectsTable)
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(eq(projectsTable.workspaceId, wid)),
    db
      .select({ pay: paymentsTable, clientName: clientsTable.companyName })
      .from(paymentsTable)
      .leftJoin(clientsTable, eq(paymentsTable.clientId, clientsTable.id))
      .where(eq(paymentsTable.workspaceId, wid)),
    db
      .select({
        inv: invoicesTable,
        clientName: clientsTable.companyName,
      })
      .from(invoicesTable)
      .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
      .where(eq(invoicesTable.workspaceId, wid)),
    db.select().from(tasksTable).where(eq(tasksTable.workspaceId, wid)),
    db
      .select({
        d: deliverablesTable,
        projectName: projectsTable.name,
        clientName: clientsTable.companyName,
      })
      .from(deliverablesTable)
      .leftJoin(projectsTable, eq(deliverablesTable.projectId, projectsTable.id))
      .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
      .where(eq(deliverablesTable.workspaceId, wid)),
    db
      .select({ c: campaignsTable, clientName: clientsTable.companyName })
      .from(campaignsTable)
      .leftJoin(clientsTable, eq(campaignsTable.clientId, clientsTable.id))
      .where(eq(campaignsTable.workspaceId, wid)),
    db
      .select({ m: meetingsTable, clientName: clientsTable.companyName })
      .from(meetingsTable)
      .leftJoin(clientsTable, eq(meetingsTable.clientId, clientsTable.id))
      .where(eq(meetingsTable.workspaceId, wid))
      .orderBy(desc(meetingsTable.date))
      .limit(20),
    db
      .select()
      .from(activityTable)
      .where(eq(activityTable.workspaceId, wid))
      .orderBy(desc(activityTable.createdAt))
      .limit(30),
  ]);

  // ── Financial analysis (primary source: paymentsTable) ─────────────────────
  // The invoicesTable is a formal entity but all day-to-day invoices are stored
  // in paymentsTable, which is what the frontend reads. Use paymentsTable as the
  // primary source and fall back to invoicesTable totals if paymentsTable is empty.
  const paidPayments = payments.filter(({ pay }) => pay.status === "paid");
  const unpaidPayments = payments.filter(
    ({ pay }) => pay.status === "pending" || pay.status === "sent" || pay.status === "overdue",
  );
  const overduePayments = payments.filter(
    ({ pay }) =>
      pay.status === "overdue" ||
      (pay.status === "pending" && pay.dueDate != null && pay.dueDate < nowStr) ||
      (pay.status === "sent" && pay.dueDate != null && pay.dueDate < nowStr),
  );
  const paidRevenue = paidPayments.reduce((s, { pay }) => s + Number(pay.amount), 0);
  const outstandingRevenue = unpaidPayments.reduce((s, { pay }) => s + Number(pay.amount), 0);
  const overdueRevenue = overduePayments.reduce((s, { pay }) => s + Number(pay.amount), 0);

  // Supplement with formal invoicesTable if it has any paid records
  const formalPaidRevenue = invoices
    .filter(({ inv }) => inv.status === "paid")
    .reduce((s, { inv }) => s + Number(inv.total), 0);
  const totalPaidRevenue = paidRevenue + formalPaidRevenue;

  // Per-client revenue breakdown (from paymentsTable)
  const clientRevenueMap = new Map<number, { clientName: string; paid: number; outstanding: number; overdue: number }>();
  for (const { pay, clientName } of payments) {
    if (!pay.clientId) continue;
    const entry = clientRevenueMap.get(pay.clientId) ?? { clientName: clientName ?? "Unknown", paid: 0, outstanding: 0, overdue: 0 };
    const isOverdue = pay.status === "overdue" || ((pay.status === "pending" || pay.status === "sent") && pay.dueDate != null && pay.dueDate < nowStr);
    if (pay.status === "paid") entry.paid += Number(pay.amount);
    else if (isOverdue) entry.overdue += Number(pay.amount);
    else if (pay.status === "pending" || pay.status === "sent") entry.outstanding += Number(pay.amount);
    clientRevenueMap.set(pay.clientId, entry);
  }
  const clientRevenueBreakdown = Array.from(clientRevenueMap.values())
    .filter(d => d.paid > 0 || d.outstanding > 0 || d.overdue > 0)
    .sort((a, b) => b.paid - a.paid)
    .slice(0, 10);

  // Per-project revenue breakdown
  const projectRevenueMap = new Map<number, { projectName: string; paid: number; outstanding: number }>();
  for (const { pay } of payments) {
    if (!pay.projectId) continue;
    const proj = projects.find(({ p }) => p.id === pay.projectId);
    if (!proj) continue;
    const entry = projectRevenueMap.get(pay.projectId) ?? { projectName: proj.p.name, paid: 0, outstanding: 0 };
    if (pay.status === "paid") entry.paid += Number(pay.amount);
    else if (pay.status === "pending" || pay.status === "sent" || pay.status === "overdue") entry.outstanding += Number(pay.amount);
    projectRevenueMap.set(pay.projectId, entry);
  }
  const projectRevenueBreakdown = Array.from(projectRevenueMap.values())
    .sort((a, b) => b.paid - a.paid)
    .slice(0, 10);

  // ── Project analysis ────────────────────────────────────────────────────────
  const activeProjects = projects.filter(
    ({ p }) => p.status !== "completed" && p.status !== "archived" && p.status !== "cancelled",
  );
  const delayedProjects = activeProjects.filter(
    ({ p }) => p.deadline && p.deadline < nowStr,
  );
  const atRiskProjects = activeProjects.filter(
    ({ p }) =>
      (p.progress ?? 0) < 30 &&
      p.deadline &&
      p.deadline <= sevenDaysFromNow,
  );
  const projectsAwaitingClientReview = projects.filter(
    ({ p }) => p.status === "client_review",
  );
  const blockedProjects = activeProjects.filter(
    ({ p }) => p.blockers && p.blockers.trim().length > 0,
  );
  const upcomingDeadlines = activeProjects.filter(
    ({ p }) => p.deadline && p.deadline >= nowStr && p.deadline <= sevenDaysFromNow,
  );

  // ── Task analysis ───────────────────────────────────────────────────────────
  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdueTasks = tasks.filter(
    (t) => t.deadline && t.deadline < nowStr && t.status !== "done",
  );
  const highPriorityTasks = openTasks.filter(
    (t) => t.priority === "high" || t.priority === "urgent",
  );
  const tasksDueSoon = openTasks.filter(
    (t) => t.deadline && t.deadline >= nowStr && t.deadline <= sevenDaysFromNow,
  );

  // ── Deliverable analysis ────────────────────────────────────────────────────
  const pendingApprovalDeliverables = deliverables.filter(
    ({ d }) => d.status === "sent",
  );
  const changesRequestedDeliverables = deliverables.filter(
    ({ d }) => d.status === "changes_requested",
  );
  const overdueDeliverables = deliverables.filter(
    ({ d }) =>
      d.deadline &&
      d.deadline < nowStr &&
      d.status !== "completed" &&
      d.status !== "approved",
  );

  // ── Campaign analysis ───────────────────────────────────────────────────────
  const activeCampaigns = campaigns.filter(({ c }) => c.status === "active");
  const pausedCampaigns = campaigns.filter(({ c }) => c.status === "paused");

  // ── Client analysis ─────────────────────────────────────────────────────────
  const clientsWithRecentMeeting = new Set(
    meetings
      .filter(({ m }) => new Date(m.date) >= thirtyDaysAgo)
      .map(({ m }) => m.clientId),
  );
  const activeClients = clients.filter((c) => c.status === "active");
  const clientsNeedingFollowUp = activeClients.filter(
    (c) => !clientsWithRecentMeeting.has(c.id),
  );

  const lines: string[] = [
    `Today: ${nowStr}`,
    ``,
    `=== CLIENTS (${clients.length} total, ${activeClients.length} active) ===`,
    ...clients.map(
      (c) =>
        `- [id:${c.id}] ${c.companyName} | status: ${c.status} | industry: ${c.industry ?? "N/A"} | email: ${c.email ?? "N/A"}`,
    ),
    ``,
    `=== PROJECTS (${projects.length} total, ${activeProjects.length} active) ===`,
    ...projects.map(
      ({ p, clientName }) =>
        `- [id:${p.id}] "${p.name}" | client: ${clientName ?? "?"} | status: ${p.status} | progress: ${p.progress}% | deadline: ${p.deadline ?? "none"} | priority: ${p.priority}${p.blockers ? ` | BLOCKER: ${p.blockers}` : ""}${p.healthScore != null ? ` | health: ${p.healthScore}` : ""}`,
    ),
    ``,
    `=== DELAYED PROJECTS (${delayedProjects.length}) ===`,
    delayedProjects.length === 0
      ? "- None"
      : delayedProjects.map(
          ({ p, clientName }) =>
            `- "${p.name}" (${clientName ?? "?"}) — deadline was ${p.deadline}, progress: ${p.progress}%`,
        ).join("\n"),
    ``,
    `=== AT-RISK PROJECTS (${atRiskProjects.length}) ===`,
    atRiskProjects.length === 0
      ? "- None"
      : atRiskProjects.map(
          ({ p, clientName }) =>
            `- "${p.name}" (${clientName ?? "?"}) — deadline: ${p.deadline}, only ${p.progress}% done`,
        ).join("\n"),
    ``,
    `=== PROJECTS AWAITING CLIENT REVIEW (${projectsAwaitingClientReview.length}) ===`,
    projectsAwaitingClientReview.length === 0
      ? "- None"
      : projectsAwaitingClientReview.map(
          ({ p, clientName }) =>
            `- "${p.name}" (${clientName ?? "?"}) — waiting since ${p.clientWaitingSince ?? "unknown"}`,
        ).join("\n"),
    ``,
    `=== BLOCKED PROJECTS (${blockedProjects.length}) ===`,
    blockedProjects.length === 0
      ? "- None"
      : blockedProjects.map(
          ({ p, clientName }) =>
            `- "${p.name}" (${clientName ?? "?"}) — ${p.blockers}`,
        ).join("\n"),
    ``,
    `=== DEADLINES THIS WEEK (${upcomingDeadlines.length}) ===`,
    upcomingDeadlines.length === 0
      ? "- None"
      : upcomingDeadlines.map(
          ({ p, clientName }) =>
            `- "${p.name}" (${clientName ?? "?"}) — due ${p.deadline}, ${p.progress}% done`,
        ).join("\n"),
    ``,
    `=== DELIVERABLES ===`,
    `Pending client approval: ${pendingApprovalDeliverables.length} | Changes requested: ${changesRequestedDeliverables.length} | Overdue: ${overdueDeliverables.length}`,
    ...(pendingApprovalDeliverables.length > 0
      ? [`Awaiting approval:`].concat(
          pendingApprovalDeliverables.slice(0, 8).map(
            ({ d, projectName, clientName }) =>
              `  - "${d.title}" | project: ${projectName ?? "?"} | client: ${clientName ?? "?"} | due: ${d.deadline ?? "none"}`,
          ),
        )
      : []),
    ...(changesRequestedDeliverables.length > 0
      ? [`Changes requested:`].concat(
          changesRequestedDeliverables.slice(0, 8).map(
            ({ d, projectName, clientName }) =>
              `  - "${d.title}" | project: ${projectName ?? "?"} | client: ${clientName ?? "?"} | revisions: ${d.revisionCount}`,
          ),
        )
      : []),
    ``,
    `=== INVOICES & REVENUE ===`,
    `Revenue collected: $${totalPaidRevenue.toLocaleString()} | Outstanding: $${outstandingRevenue.toLocaleString()} across ${unpaidPayments.length} unpaid invoice(s)`,
    `Overdue: ${overduePayments.length} invoice(s) totaling $${overdueRevenue.toLocaleString()}`,
    ...(overduePayments.length > 0
      ? overduePayments.slice(0, 10).map(
          ({ pay, clientName }) =>
            `  - ${pay.invoiceNumber} | ${clientName ?? "?"} | $${Number(pay.amount).toLocaleString()} | due: ${pay.dueDate ?? "none"} | status: ${pay.status}`,
        )
      : [`  - None overdue`]),
    ...(unpaidPayments.length > 0
      ? [`All unpaid (${unpaidPayments.length}):`].concat(
          unpaidPayments.slice(0, 15).map(
            ({ pay, clientName }) =>
              `  - ${pay.invoiceNumber} | ${clientName ?? "?"} | $${Number(pay.amount).toLocaleString()} | status: ${pay.status} | due: ${pay.dueDate ?? "none"}`,
          ),
        )
      : [`  - All invoices collected`]),
    ``,
    `=== REVENUE BY CLIENT ===`,
    clientRevenueBreakdown.length === 0
      ? "- No payment data yet"
      : clientRevenueBreakdown.map(
          (d) =>
            `- ${d.clientName}: collected $${d.paid.toLocaleString()}${d.outstanding > 0 ? `, outstanding $${d.outstanding.toLocaleString()}` : ""}${d.overdue > 0 ? ` | OVERDUE: $${d.overdue.toLocaleString()}` : ""}`,
        ).join("\n"),
    ``,
    `=== REVENUE BY PROJECT ===`,
    projectRevenueBreakdown.length === 0
      ? "- No project billing data"
      : projectRevenueBreakdown.map(
          (d) =>
            `- "${d.projectName}": collected $${d.paid.toLocaleString()}${d.outstanding > 0 ? `, outstanding $${d.outstanding.toLocaleString()}` : ""}`,
        ).join("\n"),
    ``,
    `=== CAMPAIGNS (${campaigns.length} total, ${activeCampaigns.length} active) ===`,
    campaigns.length === 0
      ? "- No campaigns"
      : campaigns.map(
          ({ c, clientName }) =>
            `- "${c.name}" | client: ${clientName ?? "?"} | type: ${c.type} | status: ${c.status} | budget: ${c.budget ? "$" + Number(c.budget).toLocaleString() : "N/A"} | ends: ${c.endDate ?? "none"}`,
        ).join("\n"),
    ``,
    `=== TASKS ===`,
    `Open: ${openTasks.length} | Overdue: ${overdueTasks.length} | High-priority: ${highPriorityTasks.length} | Due this week: ${tasksDueSoon.length}`,
    ...(overdueTasks.length > 0
      ? overdueTasks.slice(0, 10).map(
          (t) =>
            `- [OVERDUE] "${t.title}" | priority: ${t.priority} | due: ${t.deadline}`,
        )
      : []),
    ...(highPriorityTasks.length > 0
      ? highPriorityTasks.slice(0, 10).map(
          (t) =>
            `- [${t.priority.toUpperCase()}] "${t.title}" | status: ${t.status} | due: ${t.deadline ?? "none"}`,
        )
      : []),
    ``,
    `=== CLIENTS NEEDING FOLLOW-UP (no meeting in 30 days) ===`,
    clientsNeedingFollowUp.length === 0
      ? "- All active clients have had recent contact"
      : clientsNeedingFollowUp.map((c) => `- ${c.companyName} (${c.status})`).join("\n"),
    ``,
    `=== RECENT ACTIVITY (last 30 events) ===`,
    ...recentActivity.map(
      (a) =>
        `- [${new Date(a.createdAt).toISOString().split("T")[0]}] ${a.description}`,
    ),
  ];

  return lines.join("\n");
}

// ── Clinic workspace context ──────────────────────────────────────────────────

async function buildClinicContext(wid: number): Promise<string> {
  const nowStr = new Date().toISOString().split("T")[0]!;
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  const [
    patients,
    todayAppts,
    upcomingAppts,
    pendingFollowups,
    recentTreatments,
    billing,
    tasks,
  ] = await Promise.all([
    db
      .select()
      .from(clinicPatientsTable)
      .where(eq(clinicPatientsTable.workspaceId, wid)),

    db
      .select({
        a: clinicAppointmentsTable,
        patientName: clinicPatientsTable.name,
      })
      .from(clinicAppointmentsTable)
      .leftJoin(
        clinicPatientsTable,
        eq(clinicAppointmentsTable.patientId, clinicPatientsTable.id),
      )
      .where(
        and(
          eq(clinicAppointmentsTable.workspaceId, wid),
          eq(clinicAppointmentsTable.date, nowStr),
        ),
      )
      .orderBy(clinicAppointmentsTable.time),

    db
      .select({
        a: clinicAppointmentsTable,
        patientName: clinicPatientsTable.name,
      })
      .from(clinicAppointmentsTable)
      .leftJoin(
        clinicPatientsTable,
        eq(clinicAppointmentsTable.patientId, clinicPatientsTable.id),
      )
      .where(
        and(
          eq(clinicAppointmentsTable.workspaceId, wid),
          gte(clinicAppointmentsTable.date, nowStr),
          lte(clinicAppointmentsTable.date, sevenDaysFromNow),
        ),
      )
      .orderBy(clinicAppointmentsTable.date, clinicAppointmentsTable.time)
      .limit(20),

    db
      .select({
        f: clinicFollowupsTable,
        patientName: clinicPatientsTable.name,
      })
      .from(clinicFollowupsTable)
      .leftJoin(
        clinicPatientsTable,
        eq(clinicFollowupsTable.patientId, clinicPatientsTable.id),
      )
      .where(
        and(
          eq(clinicFollowupsTable.workspaceId, wid),
          eq(clinicFollowupsTable.status, "pending"),
        ),
      )
      .orderBy(clinicFollowupsTable.dueDate)
      .limit(20),

    db
      .select({
        t: clinicTreatmentsTable,
        patientName: clinicPatientsTable.name,
      })
      .from(clinicTreatmentsTable)
      .leftJoin(
        clinicPatientsTable,
        eq(clinicTreatmentsTable.patientId, clinicPatientsTable.id),
      )
      .where(eq(clinicTreatmentsTable.workspaceId, wid))
      .orderBy(desc(clinicTreatmentsTable.date))
      .limit(15),

    db
      .select()
      .from(clinicBillingTable)
      .where(eq(clinicBillingTable.workspaceId, wid)),

    db.select().from(tasksTable).where(eq(tasksTable.workspaceId, wid)),
  ]);

  const overdueFollowups = pendingFollowups.filter(
    ({ f }) => f.dueDate < nowStr,
  );
  const activePatients = patients.filter((p) => p.status === "active");
  const paidRevenue = billing
    .filter((b) => b.status === "paid")
    .reduce((s, b) => s + Number(b.amount), 0);
  const pendingAmount = billing
    .filter((b) => b.status === "pending" || b.status === "overdue")
    .reduce((s, b) => s + Number(b.amount), 0);
  const overdueAmount = billing
    .filter(
      (b) =>
        b.status === "overdue" ||
        (b.status === "pending" && b.dueDate && b.dueDate < nowStr),
    )
    .reduce((s, b) => s + Number(b.amount), 0);
  const openTasks = tasks.filter((t) => t.status !== "done");
  const overdueTasks = tasks.filter(
    (t) => t.deadline && t.deadline < nowStr && t.status !== "done",
  );
  const activeTreatments = recentTreatments.filter(
    ({ t }) => t.status === "in-progress" || t.status === "planned",
  );

  const lines: string[] = [
    `Today: ${nowStr}`,
    ``,
    `=== PATIENTS (${patients.length} total, ${activePatients.length} active) ===`,
    ...patients
      .slice(0, 30)
      .map(
        (p) =>
          `- ${p.name} | status: ${p.status} | dob: ${p.dateOfBirth ?? "unknown"} | gender: ${p.gender ?? "unknown"} | phone: ${p.phone ?? "N/A"}`,
      ),
    ``,
    `=== TODAY'S APPOINTMENTS (${todayAppts.length}) ===`,
    todayAppts.length === 0
      ? "- No appointments today"
      : todayAppts
          .map(
            ({ a, patientName }) =>
              `- ${a.time} | ${patientName ?? "Unknown"} | type: ${a.type} | status: ${a.status}`,
          )
          .join("\n"),
    ``,
    `=== UPCOMING APPOINTMENTS NEXT 7 DAYS (${upcomingAppts.length}) ===`,
    ...upcomingAppts.map(
      ({ a, patientName }) =>
        `- ${a.date} ${a.time} | ${patientName ?? "Unknown"} | type: ${a.type} | status: ${a.status}`,
    ),
    ``,
    `=== PENDING FOLLOW-UPS (${pendingFollowups.length} total, ${overdueFollowups.length} overdue) ===`,
    ...pendingFollowups.map(
      ({ f, patientName }) =>
        `- ${patientName ?? "Unknown"} | reason: ${f.reason} | due: ${f.dueDate} | ${f.dueDate < nowStr ? "OVERDUE" : "upcoming"}`,
    ),
    ``,
    `=== RECENT TREATMENTS (${recentTreatments.length}, ${activeTreatments.length} active/planned) ===`,
    ...recentTreatments.map(
      ({ t, patientName }) =>
        `- ${patientName ?? "Unknown"} | "${t.name}" | date: ${t.date} | status: ${t.status} | cost: ${t.cost ? "$" + Number(t.cost).toLocaleString() : "N/A"}`,
    ),
    ``,
    `=== BILLING SUMMARY ===`,
    `Revenue collected: $${paidRevenue.toLocaleString()}`,
    `Pending payments: $${pendingAmount.toLocaleString()} across ${billing.filter((b) => b.status === "pending" || b.status === "overdue").length} records`,
    `Overdue amount: $${overdueAmount.toLocaleString()}`,
    ``,
    `=== TASKS (${openTasks.length} open, ${overdueTasks.length} overdue) ===`,
    ...openTasks
      .slice(0, 10)
      .map(
        (t) =>
          `- "${t.title}" | priority: ${t.priority} | status: ${t.status} | due: ${t.deadline ?? "none"}${t.deadline && t.deadline < nowStr ? " [OVERDUE]" : ""}`,
      ),
  ];

  return lines.join("\n");
}

// ── Industry-aware system prompt ─────────────────────────────────────────────

const INDUSTRY_CONTEXT: Record<string, string> = {
  "digital-agency": `You are an intelligent DIGITAL AGENCY OPERATIONS MANAGER — not a generic chatbot. You know this agency inside out.

This workspace includes: Clients, Projects, Campaigns, Deliverables, Tasks, Invoices, Client Meetings, Documents, and Calendar.

Always use agency terminology:
- "Clients" (not customers or patients)
- "Projects" (branding, web design, automation, marketing work)
- "Campaigns" (SEO, paid ads, social media, email, lead gen)
- "Deliverables" (websites, landing pages, logos, ad creatives, reports, videos)
- "Invoices" (not "payments" or "billing")
- "Client Meetings" (calls, check-ins, reviews)

## What you can do

**Answer questions** about:
- Agency health overview ("how is my agency doing?", "what should I focus on today?")
- Project status, delays, blockers, at-risk work, and progress
- Client relationship health, churn risk, clients needing follow-up
- Invoices outstanding, overdue, and revenue collected
- Deliverables waiting for approval, revision requests
- Campaigns active, paused, or ending soon
- Task priorities, overdue work, team workload
- Upcoming deadlines this week

**Take actions** when asked:
- Create a task: "Create a task to follow up with [Client] by [date]"
- Update project status: "Mark [Project] as completed" / "Set [Project] to in_progress"
- Create a reminder: "Remind me to send the proposal to [Client] tomorrow"

For actions: always confirm what was done. Before updating important data (like project status), confirm with the user first by describing exactly what will change.

## Response quality rules
- Format with **bold**, bullet lists, and tables when useful — never plain wall-of-text
- Always reference actual names, amounts, and dates from the workspace data
- Prioritize by urgency: overdue items first, then approaching deadlines
- Be direct and action-oriented — tell the user the next concrete step
- Never invent data. If something isn't in the workspace, say so clearly
- Group related items logically when listing multiple things`,

  agency: `You are an intelligent DIGITAL AGENCY OPERATIONS ASSISTANT.
This agency workspace includes: Clients, Projects, Campaigns, Deliverables, Tasks, Client Meetings, Invoices, Documents, Calendar.
Use agency terminology: "Clients", "Projects", "Campaigns", "Deliverables", "Client Meetings", "Invoices".
Reference actual names, amounts, and dates from the data. Be concise and action-oriented.
Key questions to answer: Which clients need attention? Which projects are behind? Which invoices are overdue? What's this month's revenue? What are my priorities this week?`,

  consulting: `This is a CONSULTING BUSINESS workspace.
Active modules: Clients, Engagements, Meetings, Reports, Tasks, Documents, Invoices.
Use this terminology: "Clients", "Engagements" (not projects — consulting mandates, strategy work, advisory retainers), "Meetings" (sessions, workshops, reviews), "Invoices".
Key questions to answer: What are the active engagements? Which clients have upcoming meetings? Are any reports overdue? What's the pending invoice value?`,

  clinic: `You are an intelligent CLINIC OPERATIONS ASSISTANT — not a generic chatbot.

This clinic has full management capabilities: Patients, Appointments, Treatments, Follow-ups, Billing, Tasks, and Calendar.

Always use clinical terminology:
- "Patients" (not clients/customers)
- "Appointments" (not meetings)
- "Treatments" (not projects)
- "Follow-ups" (patient check-ins, post-treatment reviews)
- "Billing" (not invoices/payments)

You can answer questions about:
- Patient counts, demographics, and status
- Today's and upcoming appointment schedule
- Treatment plans (active, completed, planned)
- Follow-up reminders and overdue follow-ups
- Billing — revenue collected, outstanding payments, overdue amounts
- Tasks and to-do items for the clinic team

You can also take ACTIONS when explicitly requested:
- Create a follow-up for a patient (use create_followup tool)
- Schedule an appointment (use create_appointment tool)
- Create a task (use create_task tool)

When creating anything, confirm what was created with the patient name and date.
If a patient name doesn't match any record, say so and ask for clarification.

Be concise, clinical, and action-oriented. Never invent patient data — only report what's in the system.`,

  freelancer: `This is a FREELANCER workspace.
Active modules: Clients, Projects, Tasks, Invoices, Documents, Calendar.
Use this terminology: "Clients", "Projects" (freelance contracts, engagements, gigs), "Invoices" (not payments/billing), "Tasks".
Key questions to answer: How much did I earn this month? Which invoices are outstanding? What are my current projects and their deadlines? Which clients owe me money?`,

  generic: `This is a GENERAL BUSINESS workspace.
Active modules: Customers, Projects, Tasks, Documents, Calendar, Invoices.
Use this terminology: "Customers" (not clients/patients), "Projects", "Invoices", "Tasks".
Key questions to answer: What's the current revenue? How many active customers? What projects are in progress? What invoices are outstanding?`,
};

async function getWorkspaceSystemPrompt(wid: number): Promise<string> {
  const businessType = await getBusinessType(wid);
  const industryContext =
    INDUSTRY_CONTEXT[businessType] ?? INDUSTRY_CONTEXT["digital-agency"]!;

  return `You are AutFlow's AI business assistant — an intelligent operating assistant. You have full access to the workspace's business data.

${industryContext}

Your job: give concise, actionable intelligence. Not generic advice. Reference actual names, amounts, and dates from the data. Be direct and specific. If asked about something not in the data, say so clearly.

Format responses with clear sections when helpful. Use bullet points for lists. Keep answers focused and practical.`;
}

// ── Agency tools (OpenAI function calling) ────────────────────────────────────

const AGENCY_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a task or reminder in the workspace. Use when the user asks to create a task, add a to-do, set a reminder, or follow up with someone.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title — be specific" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high", "urgent"],
            description: "Task priority (default: medium)",
          },
          deadline: {
            type: "string",
            description: "Optional deadline in YYYY-MM-DD format",
          },
          clientNameQuery: {
            type: "string",
            description:
              "Optional: partial client name to associate the task with",
          },
          projectNameQuery: {
            type: "string",
            description:
              "Optional: partial project name to associate the task with",
          },
          notes: { type: "string", description: "Optional notes or context" },
        },
        required: ["title"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "update_project_status",
      description:
        "Update the status of a project. Use when the user says 'mark project X as completed', 'set project Y to in progress', etc. Always confirm with the user before calling this — describe what will change.",
      parameters: {
        type: "object",
        properties: {
          projectNameQuery: {
            type: "string",
            description: "Partial project name to search for",
          },
          status: {
            type: "string",
            enum: [
              "planning",
              "in_progress",
              "client_review",
              "revision",
              "completed",
              "archived",
            ],
            description: "New project status",
          },
        },
        required: ["projectNameQuery", "status"],
      },
    },
  },
];

// ── Clinic tools (OpenAI function calling) ────────────────────────────────────

const CLINIC_TOOLS: OpenAI.Chat.ChatCompletionTool[] = [
  {
    type: "function",
    function: {
      name: "create_followup",
      description:
        "Create a follow-up reminder for a patient. Use when the user asks to schedule a follow-up, remind about a patient check-in, or create a post-treatment review.",
      parameters: {
        type: "object",
        properties: {
          patientNameQuery: {
            type: "string",
            description: "Patient name (full or partial) to search for",
          },
          reason: {
            type: "string",
            description:
              "Reason for the follow-up (e.g. 'Post-treatment check', 'Blood test results review')",
          },
          dueDate: {
            type: "string",
            description: "Due date in YYYY-MM-DD format",
          },
          notes: { type: "string", description: "Optional additional notes" },
        },
        required: ["patientNameQuery", "reason", "dueDate"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_appointment",
      description:
        "Schedule a new appointment for a patient. Use when the user asks to book, schedule, or add an appointment.",
      parameters: {
        type: "object",
        properties: {
          patientNameQuery: {
            type: "string",
            description: "Patient name (full or partial) to search for",
          },
          date: {
            type: "string",
            description: "Appointment date in YYYY-MM-DD format",
          },
          time: {
            type: "string",
            description: "Appointment time in HH:MM format (24-hour)",
          },
          type: {
            type: "string",
            description:
              "Appointment type: consultation, checkup, follow-up, treatment, procedure",
          },
          notes: { type: "string", description: "Optional notes" },
        },
        required: ["patientNameQuery", "date", "time"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "create_task",
      description:
        "Create a clinic task or reminder. Use when the user asks to add a task, to-do item, or reminder.",
      parameters: {
        type: "object",
        properties: {
          title: { type: "string", description: "Task title" },
          priority: {
            type: "string",
            enum: ["low", "medium", "high"],
            description: "Task priority",
          },
          deadline: {
            type: "string",
            description: "Optional deadline in YYYY-MM-DD format",
          },
          notes: { type: "string", description: "Optional notes" },
        },
        required: ["title"],
      },
    },
  },
];

// ── Tool execution ─────────────────────────────────────────────────────────────

interface ActionResult {
  type: string;
  success: boolean;
  entity: string;
  detail: string;
}

async function executeClinicTool(
  name: string,
  args: Record<string, unknown>,
  wid: number,
): Promise<ActionResult> {
  try {
    if (name === "create_followup") {
      const { patientNameQuery, reason, dueDate, notes } = args as {
        patientNameQuery: string;
        reason: string;
        dueDate: string;
        notes?: string;
      };

      const found = await db
        .select()
        .from(clinicPatientsTable)
        .where(
          and(
            eq(clinicPatientsTable.workspaceId, wid),
            ilike(clinicPatientsTable.name, `%${patientNameQuery}%`),
          ),
        )
        .limit(1);

      if (!found[0]) {
        return {
          type: "create_followup",
          success: false,
          entity: "Follow-up",
          detail: `Patient matching "${patientNameQuery}" was not found in the system.`,
        };
      }

      await db.insert(clinicFollowupsTable).values({
        workspaceId: wid,
        patientId: found[0].id,
        reason,
        dueDate,
        status: "pending",
        notes: notes ?? null,
      });

      return {
        type: "create_followup",
        success: true,
        entity: "Follow-up",
        detail: `Follow-up for ${found[0].name} — due ${dueDate} (${reason})`,
      };
    }

    if (name === "create_appointment") {
      const { patientNameQuery, date, time, type: apptType, notes } = args as {
        patientNameQuery: string;
        date: string;
        time: string;
        type?: string;
        notes?: string;
      };

      const found = await db
        .select()
        .from(clinicPatientsTable)
        .where(
          and(
            eq(clinicPatientsTable.workspaceId, wid),
            ilike(clinicPatientsTable.name, `%${patientNameQuery}%`),
          ),
        )
        .limit(1);

      if (!found[0]) {
        return {
          type: "create_appointment",
          success: false,
          entity: "Appointment",
          detail: `Patient matching "${patientNameQuery}" was not found in the system.`,
        };
      }

      await db.insert(clinicAppointmentsTable).values({
        workspaceId: wid,
        patientId: found[0].id,
        date,
        time,
        type: apptType ?? "consultation",
        status: "scheduled",
        notes: notes ?? null,
      });

      return {
        type: "create_appointment",
        success: true,
        entity: "Appointment",
        detail: `Appointment for ${found[0].name} on ${date} at ${time} (${apptType ?? "consultation"})`,
      };
    }

    if (name === "create_task") {
      const { title, priority, deadline, notes } = args as {
        title: string;
        priority?: string;
        deadline?: string;
        notes?: string;
      };

      await db.insert(tasksTable).values({
        workspaceId: wid,
        title,
        status: "todo",
        priority: (priority as "low" | "medium" | "high") ?? "medium",
        deadline: deadline ?? null,
        notes: notes ?? null,
      });

      return {
        type: "create_task",
        success: true,
        entity: "Task",
        detail: `Task "${title}" created${deadline ? ` — due ${deadline}` : ""}`,
      };
    }

    return {
      type: name,
      success: false,
      entity: "Unknown",
      detail: "Unknown tool name.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { type: name, success: false, entity: name, detail: `Error: ${msg}` };
  }
}

// ── Agency tool execution ──────────────────────────────────────────────────────

async function executeAgencyTool(
  name: string,
  args: Record<string, unknown>,
  wid: number,
): Promise<ActionResult> {
  try {
    if (name === "create_task") {
      const { title, priority, deadline, clientNameQuery, projectNameQuery, notes } =
        args as {
          title: string;
          priority?: string;
          deadline?: string;
          clientNameQuery?: string;
          projectNameQuery?: string;
          notes?: string;
        };

      let clientId: number | null = null;
      let projectId: number | null = null;
      let clientLabel = "";
      let projectLabel = "";

      if (clientNameQuery) {
        const found = await db
          .select()
          .from(clientsTable)
          .where(
            and(
              eq(clientsTable.workspaceId, wid),
              ilike(clientsTable.companyName, `%${clientNameQuery}%`),
            ),
          )
          .limit(1);
        if (found[0]) {
          clientId = found[0].id;
          clientLabel = ` for ${found[0].companyName}`;
        }
      }

      if (projectNameQuery) {
        const found = await db
          .select()
          .from(projectsTable)
          .where(
            and(
              eq(projectsTable.workspaceId, wid),
              ilike(projectsTable.name, `%${projectNameQuery}%`),
            ),
          )
          .limit(1);
        if (found[0]) {
          projectId = found[0].id;
          projectLabel = ` on "${found[0].name}"`;
        }
      }

      await db.insert(tasksTable).values({
        workspaceId: wid,
        title,
        status: "todo",
        priority: (priority as "low" | "medium" | "high" | "urgent") ?? "medium",
        deadline: deadline ?? null,
        clientId,
        projectId,
        notes: notes ?? null,
      });

      return {
        type: "create_task",
        success: true,
        entity: "Task",
        detail: `Task "${title}" created${clientLabel}${projectLabel}${deadline ? ` — due ${deadline}` : ""}`,
      };
    }

    if (name === "update_project_status") {
      const { projectNameQuery, status } = args as {
        projectNameQuery: string;
        status: string;
      };

      const found = await db
        .select({ p: projectsTable, clientName: clientsTable.companyName })
        .from(projectsTable)
        .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
        .where(
          and(
            eq(projectsTable.workspaceId, wid),
            ilike(projectsTable.name, `%${projectNameQuery}%`),
          ),
        )
        .limit(1);

      if (!found[0]) {
        return {
          type: "update_project_status",
          success: false,
          entity: "Project",
          detail: `No project matching "${projectNameQuery}" found in the workspace.`,
        };
      }

      await db
        .update(projectsTable)
        .set({ status, updatedAt: new Date() })
        .where(
          and(
            eq(projectsTable.id, found[0].p.id),
            eq(projectsTable.workspaceId, wid),
          ),
        );

      return {
        type: "update_project_status",
        success: true,
        entity: "Project",
        detail: `"${found[0].p.name}" status updated to ${status}`,
      };
    }

    return {
      type: name,
      success: false,
      entity: "Unknown",
      detail: "Unknown tool name.",
    };
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err);
    return { type: name, success: false, entity: name, detail: `Error: ${msg}` };
  }
}

// ── 1. AI Chat Assistant (streaming SSE with clinic tool calling) ─────────────

router.post("/ai/chat", async (req, res): Promise<void> => {
  const {
    message,
    history = [],
  } = req.body as {
    message: string;
    history?: Array<{ role: "user" | "assistant"; content: string }>;
  };

  if (!message?.trim()) {
    res.status(400).json({ error: "Message is required" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured. Set OPENAI_API_KEY." });
    return;
  }

  const wid = req.session.workspaceId!;

  const [businessType, systemPrompt] = await Promise.all([
    getBusinessType(wid),
    getWorkspaceSystemPrompt(wid),
  ]);

  const isClinic = businessType === "clinic";

  const context = isClinic
    ? await buildClinicContext(wid)
    : await buildWorkspaceContext(wid);

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  try {
    const messages: OpenAI.ChatCompletionMessageParam[] = [
      {
        role: "system",
        content: `${systemPrompt}\n\n=== CURRENT WORKSPACE DATA ===\n${context}`,
      },
      ...(history.slice(-10).map((h) => ({
        role: h.role,
        content: h.content,
      })) as OpenAI.ChatCompletionMessageParam[]),
      { role: "user", content: message },
    ];

    // ── Phase 1: Stream (with tools for agency and clinic) ───────────────────
    const tools = isClinic ? CLINIC_TOOLS : AGENCY_TOOLS;
    const stream1 = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 2048,
      messages,
      tools,
      tool_choice: "auto",
      stream: true,
    });

    let finishReason = "";
    const toolCallDeltas: Record<
      number,
      { id: string; name: string; arguments: string }
    > = {};

    for await (const chunk of stream1) {
      const choice = chunk.choices[0];
      if (!choice) continue;

      if (choice.finish_reason) finishReason = choice.finish_reason;

      const delta = choice.delta;

      // Stream content chunks to client
      if (delta.content) {
        res.write(`data: ${JSON.stringify({ content: delta.content })}\n\n`);
      }

      // Accumulate tool call deltas
      if (delta.tool_calls) {
        for (const tc of delta.tool_calls) {
          const idx = tc.index ?? 0;
          if (!toolCallDeltas[idx]) {
            toolCallDeltas[idx] = { id: "", name: "", arguments: "" };
          }
          if (tc.id) toolCallDeltas[idx]!.id = tc.id;
          if (tc.function?.name) toolCallDeltas[idx]!.name += tc.function.name;
          if (tc.function?.arguments)
            toolCallDeltas[idx]!.arguments += tc.function.arguments;
        }
      }
    }

    // ── Phase 2: Execute tools and stream follow-up ───────────────────────────
    if (finishReason === "tool_calls" && Object.keys(toolCallDeltas).length > 0) {
      const assistantToolCalls: OpenAI.ChatCompletionMessageToolCall[] = [];
      const toolResults: OpenAI.ChatCompletionToolMessageParam[] = [];

      for (const tc of Object.values(toolCallDeltas)) {
        let parsedArgs: Record<string, unknown> = {};
        try {
          parsedArgs = JSON.parse(tc.arguments);
        } catch {
          /* malformed args — pass empty */
        }

        const result = isClinic
          ? await executeClinicTool(tc.name, parsedArgs, wid)
          : await executeAgencyTool(tc.name, parsedArgs, wid);

        // Emit action event to client
        res.write(`data: ${JSON.stringify({ action: result })}\n\n`);

        assistantToolCalls.push({
          id: tc.id,
          type: "function",
          function: { name: tc.name, arguments: tc.arguments },
        });
        toolResults.push({
          role: "tool",
          tool_call_id: tc.id,
          content: JSON.stringify(result),
        });
      }

      // Stream follow-up response after tool execution
      const stream2 = await openai.chat.completions.create({
        model: "gpt-4o-mini",
        max_tokens: 512,
        messages: [
          ...messages,
          { role: "assistant", tool_calls: assistantToolCalls },
          ...toolResults,
        ],
        stream: true,
      });

      for await (const chunk of stream2) {
        const content = chunk.choices[0]?.delta?.content;
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }
    }

    res.write(`data: ${JSON.stringify({ done: true })}\n\n`);
    res.end();
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI request failed";
    res.write(`data: ${JSON.stringify({ error: msg })}\n\n`);
    res.end();
  }
});

// ── 2. Clinic Daily Summary (for dashboard widget) ────────────────────────────

router.get("/ai/clinic-summary", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const nowStr = new Date().toISOString().split("T")[0]!;
  const context = await buildClinicContext(wid);

  // Try AI-generated summary; fall back to data-driven if no key
  try {
    const openai = getOpenAI();

    const prompt = `Based on the clinic data below, generate a concise daily summary for the clinic owner.

Return JSON with this exact shape:
{
  "greeting": "Good morning" or "Good afternoon" or "Good evening",
  "headline": "One sentence summary of today's clinic state (mention appointment count, follow-up count, etc.)",
  "alerts": ["urgent item 1", "urgent item 2"],
  "recommendedActions": ["concrete action 1", "action 2", "action 3"],
  "upcomingPriorities": ["priority 1", "priority 2"]
}

Rules:
- Use actual numbers from the data (appointment count, patient names for overdue items, dollar amounts)
- alerts: overdue follow-ups, missed appointments, overdue billing — urgent items only (max 3)
- recommendedActions: top 3 concrete things to do today, in priority order
- upcomingPriorities: key items for today or this week (max 3)
- If alerts is empty (good day), still provide recommendedActions based on what's coming up
- Be specific and clinical. No generic advice.

CLINIC DATA:
${context}`;

    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 600,
      response_format: { type: "json_object" },
      messages: [
        {
          role: "system",
          content:
            "You are a clinic operations assistant generating a concise daily briefing. Be specific, use actual data.",
        },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const summary = JSON.parse(raw);
    res.json({ summary, generatedAt: new Date().toISOString(), aiGenerated: true });
  } catch (err) {
    // Data-driven fallback when no API key
    const isNoKey =
      err instanceof Error && err.message.includes("OPENAI_API_KEY");

    if (!isNoKey) {
      const msg = err instanceof Error ? err.message : "Summary failed";
      res.status(500).json({ error: msg });
      return;
    }

    // Build a summary purely from DB data
    const lines = context.split("\n");
    const todayCount =
      lines
        .find((l) => l.startsWith("=== TODAY'S APPOINTMENTS"))
        ?.match(/\((\d+)\)/)?.[1] ?? "0";
    const followupLine = lines.find((l) =>
      l.startsWith("=== PENDING FOLLOW-UPS"),
    );
    const overdueFollowups =
      followupLine?.match(/(\d+) overdue/)?.[1] ?? "0";
    const pendingFollowups = followupLine?.match(/(\d+) total/)?.[1] ?? "0";

    res.json({
      summary: {
        greeting: (() => {
          const h = new Date().getHours();
          return h < 12 ? "Good morning" : h < 17 ? "Good afternoon" : "Good evening";
        })(),
        headline: `Today you have ${todayCount} appointment${Number(todayCount) !== 1 ? "s" : ""} scheduled and ${pendingFollowups} pending follow-up${Number(pendingFollowups) !== 1 ? "s" : ""}.`,
        alerts:
          Number(overdueFollowups) > 0
            ? [`${overdueFollowups} follow-up${Number(overdueFollowups) > 1 ? "s are" : " is"} overdue`]
            : [],
        recommendedActions: [
          "Review today's appointment schedule",
          ...(Number(pendingFollowups) > 0
            ? ["Check and assign pending follow-ups"]
            : []),
        ],
        upcomingPriorities: [`${todayCount} appointments scheduled today`],
      },
      generatedAt: new Date().toISOString(),
      aiGenerated: false,
    });
  }
});

// ── 3. Daily Business Briefing ───────────────────────────────────────────────

router.get("/ai/briefing", async (req, res): Promise<void> => {
  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured. Set OPENAI_API_KEY." });
    return;
  }

  const wid = req.session.workspaceId!;
  const [context, systemPrompt] = await Promise.all([
    buildWorkspaceContext(wid),
    getWorkspaceSystemPrompt(wid),
  ]);

  const today = new Date().toISOString().split("T")[0];

  const prompt = `Based on the workspace data below, generate a concise executive business briefing for today (${today}).

Structure your response as JSON with this exact shape:
{
  "headline": "One sentence executive summary of the overall business state today",
  "goingWell": ["specific positive item 1", "specific positive item 2"],
  "needsAttention": ["concern requiring attention 1", "concern 2"],
  "criticalRisks": ["critical risk that needs immediate action 1"],
  "recommendedActions": ["concrete recommended action 1", "action 2", "action 3"]
}

Rules:
- Be specific — use actual client names, project names, dollar amounts, and dates from the data
- goingWell: positive achievements, on-track projects, paid invoices, active clients — what IS working
- needsAttention: non-urgent but important issues — slow progress, upcoming deadlines, quiet clients
- criticalRisks: overdue invoices, overdue projects, at-risk deliverables, churn risks — what NEEDS immediate action
- recommendedActions: concrete next steps the owner should take TODAY, in order of priority
- Max 4 items per array. If a category has nothing relevant, return an empty array.
- criticalRisks should only contain genuinely urgent items; empty array is fine if nothing is critical.

WORKSPACE DATA:
${context}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const briefing = JSON.parse(raw);
    res.json({ briefing, generatedAt: new Date().toISOString() });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "AI briefing failed";
    res.status(500).json({ error: msg });
  }
});

// ── 4. Client Health Score ───────────────────────────────────────────────────

router.get("/ai/client-health/:clientId", async (req, res): Promise<void> => {
  const clientId = parseInt(req.params.clientId ?? "", 10);
  if (isNaN(clientId)) {
    res.status(400).json({ error: "Invalid clientId" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured." });
    return;
  }

  const wid = req.session.workspaceId!;
  const systemPrompt = await getWorkspaceSystemPrompt(wid);
  const nowStr = new Date().toISOString().split("T")[0]!;

  const [clients, projects, payments, meetings, activity, tasks] =
    await Promise.all([
      db
        .select()
        .from(clientsTable)
        .where(
          and(
            eq(clientsTable.id, clientId),
            eq(clientsTable.workspaceId, wid),
          ),
        ),
      db
        .select()
        .from(projectsTable)
        .where(
          and(
            eq(projectsTable.clientId, clientId),
            eq(projectsTable.workspaceId, wid),
          ),
        ),
      db
        .select()
        .from(paymentsTable)
        .where(
          and(
            eq(paymentsTable.clientId, clientId),
            eq(paymentsTable.workspaceId, wid),
          ),
        ),
      db
        .select()
        .from(meetingsTable)
        .where(
          and(
            eq(meetingsTable.clientId, clientId),
            eq(meetingsTable.workspaceId, wid),
          ),
        )
        .orderBy(desc(meetingsTable.date))
        .limit(5),
      db
        .select()
        .from(activityTable)
        .where(
          and(
            eq(activityTable.clientId, clientId),
            eq(activityTable.workspaceId, wid),
          ),
        )
        .orderBy(desc(activityTable.createdAt))
        .limit(10),
      db
        .select()
        .from(tasksTable)
        .where(
          and(
            eq(tasksTable.clientId, clientId),
            eq(tasksTable.workspaceId, wid),
          ),
        ),
    ]);

  const client = clients[0];
  if (!client) {
    res.status(404).json({ error: "Client not found" });
    return;
  }

  const lastMeeting = meetings[0];
  const daysSinceLastMeeting = lastMeeting
    ? Math.floor(
        (Date.now() - new Date(lastMeeting.date).getTime()) /
          (1000 * 60 * 60 * 24),
      )
    : null;

  const overduePayments = payments.filter(
    (p) =>
      (p.status === "pending" || p.status === "overdue") &&
      p.dueDate &&
      p.dueDate < nowStr,
  );
  const pendingPayments = payments.filter(
    (p) => p.status === "pending" || p.status === "overdue",
  );
  const activeProjects = projects.filter(
    (p) => p.status !== "delivered" && p.status !== "cancelled",
  );
  const delayedProjects = activeProjects.filter(
    (p) => p.deadline && p.deadline < nowStr,
  );

  const dataStr = [
    `Client: ${client.companyName} | Status: ${client.status}`,
    `Last meeting: ${lastMeeting ? new Date((lastMeeting as any).date ?? lastMeeting).toISOString().split("T")[0] : "never"} (${daysSinceLastMeeting !== null ? daysSinceLastMeeting + " days ago" : "no meetings"})`,
    `Projects: ${projects.length} total, ${activeProjects.length} active, ${delayedProjects.length} delayed`,
    `Payments: ${payments.length} total, ${overduePayments.length} overdue, ${pendingPayments.length} pending`,
    `Overdue payment amounts: $${overduePayments.reduce((s, p) => s + Number(p.amount), 0).toLocaleString()}`,
    `Recent activity events: ${activity.length} in history`,
    `Tasks: ${tasks.length} total, ${tasks.filter((t) => t.status !== "done").length} open`,
    `Project details: ${activeProjects.map((p) => `"${p.name}" (${p.status}, ${p.progress}% done, deadline: ${p.deadline ?? "none"})`).join("; ")}`,
  ].join("\n");

  const prompt = `Analyze this client and return a JSON health assessment:
{
  "score": <0-100 integer>,
  "status": "<Healthy|Needs Attention|At Risk>",
  "summary": "<one sentence>",
  "reasons": ["reason 1", "reason 2", "reason 3"]
}

Scoring guide:
- 80-100: Healthy — active, paying on time, regular meetings, projects on track
- 50-79: Needs Attention — some concerns but manageable
- 0-49: At Risk — overdue payments, long inactivity, delayed projects, or churned

CLIENT DATA:
${dataStr}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 512,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const health = JSON.parse(raw);
    res.json({ clientId, clientName: client.companyName, ...health });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Health analysis failed";
    res.status(500).json({ error: msg });
  }
});

// ── 5. AI Meeting Analyzer ───────────────────────────────────────────────────

router.post("/ai/analyze-meeting", async (req, res): Promise<void> => {
  const { notes, clientName } = req.body as {
    notes: string;
    clientName?: string;
  };

  if (!notes?.trim()) {
    res.status(400).json({ error: "Meeting notes are required" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured." });
    return;
  }

  const wid = req.session.workspaceId!;
  const systemPrompt = await getWorkspaceSystemPrompt(wid);

  const prompt = `Analyze these meeting notes${clientName ? ` from a meeting with ${clientName}` : ""} and return structured JSON:
{
  "summary": "<2-3 sentence summary of what was discussed>",
  "decisions": ["decision 1", "decision 2"],
  "actionItems": ["action item with owner/deadline if mentioned"],
  "followUpTasks": [
    { "title": "task title", "priority": "high|medium|low", "notes": "optional context" }
  ],
  "clientIntel": ["important fact about client needs, concerns, or opportunities"]
}

Be specific and extract only what's actually in the notes. Don't invent items.

MEETING NOTES:
${notes}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const analysis = JSON.parse(raw);
    res.json(analysis);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Meeting analysis failed";
    res.status(500).json({ error: msg });
  }
});

// ── 6. Agency Attention Feed (dashboard widget) ───────────────────────────────

router.get("/ai/agency-attention", async (req, res): Promise<void> => {
  const wid = req.session.workspaceId!;
  const nowStr = new Date().toISOString().split("T")[0]!;
  const sevenDaysFromNow = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)
    .toISOString()
    .split("T")[0]!;

  try {
    const [overdueInvoices, delayedProjects, pendingDeliverables, overdueTasks] =
      await Promise.all([
        db
          .select({ inv: invoicesTable, clientName: clientsTable.companyName })
          .from(invoicesTable)
          .leftJoin(clientsTable, eq(invoicesTable.clientId, clientsTable.id))
          .where(
            and(
              eq(invoicesTable.workspaceId, wid),
              ilike(invoicesTable.status, "overdue"),
            ),
          )
          .limit(3),
        db
          .select({ p: projectsTable, clientName: clientsTable.companyName })
          .from(projectsTable)
          .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
          .where(eq(projectsTable.workspaceId, wid))
          .limit(50),
        db
          .select({
            d: deliverablesTable,
            projectName: projectsTable.name,
            clientName: clientsTable.companyName,
          })
          .from(deliverablesTable)
          .leftJoin(projectsTable, eq(deliverablesTable.projectId, projectsTable.id))
          .leftJoin(clientsTable, eq(projectsTable.clientId, clientsTable.id))
          .where(eq(deliverablesTable.workspaceId, wid))
          .limit(50),
        db
          .select()
          .from(tasksTable)
          .where(eq(tasksTable.workspaceId, wid))
          .limit(50),
      ]);

    const items: Array<{
      type: string;
      severity: "critical" | "warning" | "info";
      title: string;
      detail: string;
      url: string;
    }> = [];

    // Overdue invoices
    for (const { inv, clientName } of overdueInvoices) {
      if (inv.dueDate && inv.dueDate < nowStr) {
        items.push({
          type: "invoice",
          severity: "critical",
          title: `Overdue invoice — ${clientName ?? "Unknown"}`,
          detail: `${inv.invoiceNumber} · $${Number(inv.total).toLocaleString()} · due ${inv.dueDate}`,
          url: "/invoices",
        });
      }
    }

    // Delayed projects
    const delayed = delayedProjects.filter(
      ({ p }) =>
        p.deadline &&
        p.deadline < nowStr &&
        p.status !== "completed" &&
        p.status !== "archived" &&
        p.status !== "cancelled",
    );
    for (const { p, clientName } of delayed.slice(0, 3)) {
      items.push({
        type: "project",
        severity: "critical",
        title: `Project overdue — "${p.name}"`,
        detail: `${clientName ?? "?"} · was due ${p.deadline} · ${p.progress}% done`,
        url: "/projects",
      });
    }

    // Deliverables awaiting approval
    const awaitingApproval = pendingDeliverables.filter(
      ({ d }) => d.status === "sent",
    );
    for (const { d, projectName, clientName } of awaitingApproval.slice(0, 2)) {
      items.push({
        type: "deliverable",
        severity: "warning",
        title: `Awaiting client approval — "${d.title}"`,
        detail: `${clientName ?? "?"} · ${projectName ?? "?"}${d.deadline ? ` · due ${d.deadline}` : ""}`,
        url: "/deliverables",
      });
    }

    // Deliverables with changes requested
    const changesReq = pendingDeliverables.filter(
      ({ d }) => d.status === "changes_requested",
    );
    for (const { d, projectName, clientName } of changesReq.slice(0, 2)) {
      items.push({
        type: "deliverable",
        severity: "warning",
        title: `Changes requested — "${d.title}"`,
        detail: `${clientName ?? "?"} · ${projectName ?? "?"} · ${d.revisionCount} revision(s)`,
        url: "/deliverables",
      });
    }

    // Overdue tasks
    const overdueTaskList = overdueTasks.filter(
      (t) => t.deadline && t.deadline < nowStr && t.status !== "done",
    );
    if (overdueTaskList.length > 0) {
      items.push({
        type: "tasks",
        severity: "warning",
        title: `${overdueTaskList.length} overdue task${overdueTaskList.length > 1 ? "s" : ""}`,
        detail: overdueTaskList
          .slice(0, 2)
          .map((t) => `"${t.title}"`)
          .join(", "),
        url: "/tasks",
      });
    }

    // Upcoming project deadlines
    const upcoming = delayedProjects.filter(
      ({ p }) =>
        p.deadline &&
        p.deadline >= nowStr &&
        p.deadline <= sevenDaysFromNow &&
        p.status !== "completed" &&
        p.status !== "archived",
    );
    for (const { p, clientName } of upcoming.slice(0, 2)) {
      items.push({
        type: "project",
        severity: "info",
        title: `Deadline this week — "${p.name}"`,
        detail: `${clientName ?? "?"} · due ${p.deadline} · ${p.progress}% done`,
        url: "/projects",
      });
    }

    // Sort: critical first, then warning, then info. Cap at 6.
    const sorted = items.sort((a, b) => {
      const order = { critical: 0, warning: 1, info: 2 };
      return order[a.severity] - order[b.severity];
    });

    res.json({
      items: sorted.slice(0, 6),
      totalCount: sorted.length,
      generatedAt: new Date().toISOString(),
    });
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Failed to build attention feed";
    res.status(500).json({ error: msg });
  }
});

// ── 7. AI Smart Search ───────────────────────────────────────────────────────

router.post("/ai/smart-search", async (req, res): Promise<void> => {
  const { query } = req.body as { query: string };

  if (!query?.trim()) {
    res.status(400).json({ error: "Query is required" });
    return;
  }

  let openai: OpenAI;
  try {
    openai = getOpenAI();
  } catch {
    res.status(503).json({ error: "AI not configured." });
    return;
  }

  const wid = req.session.workspaceId!;
  const [context, systemPrompt] = await Promise.all([
    buildWorkspaceContext(wid),
    getWorkspaceSystemPrompt(wid),
  ]);

  const prompt = `The user asked: "${query}"

Based on the workspace data, answer this query directly. Return JSON:
{
  "answer": "<direct answer to the question>",
  "results": [
    { "type": "client|project|payment|task|meeting", "title": "name", "detail": "relevant detail", "url": "/path" }
  ],
  "insight": "<one actionable recommendation based on the answer>"
}

Max 10 results. Be specific — use real names and numbers from the data.

WORKSPACE DATA:
${context}`;

  try {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      max_tokens: 1024,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: prompt },
      ],
    });

    const raw = completion.choices[0]?.message?.content ?? "{}";
    const result = JSON.parse(raw);
    res.json(result);
  } catch (err) {
    const msg = err instanceof Error ? err.message : "Smart search failed";
    res.status(500).json({ error: msg });
  }
});

export default router;
