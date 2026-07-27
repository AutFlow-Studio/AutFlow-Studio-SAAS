// Business template configurator — applies niche-specific workspace structure,
// terminology, and starter workflow tasks when a user selects their industry
// during onboarding.  Workspaces start EMPTY (no fake demo clients, projects,
// payments, or revenue figures).  Each template sets the businessType in
// agency_settings and seeds a small set of workflow-guidance tasks so the user
// knows exactly what to do first.
import { Router, type IRouter } from "express";
import { db } from "@workspace/db";
import {
  clientsTable,
  projectsTable,
  deliverablesTable,
  paymentsTable,
  documentsTable,
  meetingsTable,
  notesTable,
  tasksTable,
  activityTable,
  agencySettingsTable,
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { sql, eq } from "drizzle-orm";

const router: IRouter = Router();

// ── Template metadata ─────────────────────────────────────────────────────────

export const TEMPLATE_META = [
  {
    id: "digital-agency",
    name: "Digital Agency",
    tagline: "Clients, projects & campaigns — structured for growth",
    description:
      "Configured for creative and digital agencies: client management with retainer and project billing, campaign tracking, deliverables, and team task workflows. Starts clean — add your own real clients.",
    icon: "Palette",
    color: "violet",
    includes: [
      "Client workspace with retainer & project billing fields",
      "Project structure for branding, web & campaigns",
      "Deliverables, tasks & payment tracking",
      "Starter workflow tasks to guide your setup",
    ],
    clientCount: 0,
    projectCount: 0,
  },
  {
    id: "consulting",
    name: "Consulting Business",
    tagline: "Engagements, reports & advisory — structured for impact",
    description:
      "Built for independent consultants and boutique firms: client and engagement tracking, session notes, report workflows, and advisory billing. Starts clean — bring your real clients.",
    icon: "Briefcase",
    color: "blue",
    includes: [
      "Client workspace labelled for advisory engagements",
      "Project structure for consulting engagements & reports",
      "Meeting notes and session tracking",
      "Starter workflow tasks to guide your setup",
    ],
    clientCount: 0,
    projectCount: 0,
  },
  {
    id: "clinic",
    name: "Clinic / Healthcare",
    tagline: "Appointments, follow-ups & revenue — all in one place",
    description:
      "Designed for clinics, wellness centres, and private practices: client/patient management, care programs, appointment tracking, follow-up workflows, and session billing. Starts clean.",
    icon: "Heart",
    color: "rose",
    includes: [
      "Client workspace for patients and partner organisations",
      "Care program structure with sessions & milestones",
      "Appointment and follow-up tracking",
      "Starter workflow tasks to guide your setup",
    ],
    clientCount: 0,
    projectCount: 0,
  },
  {
    id: "freelancer",
    name: "Freelancer",
    tagline: "Project workflow, invoices & client comms — simplified",
    description:
      "Lean setup for solo freelancers: client roster, project-by-project billing, task lists, and straightforward invoicing. Starts clean — add your real clients.",
    icon: "Laptop",
    color: "amber",
    includes: [
      "Client workspace with project billing",
      "Project structure with scope & deadline tracking",
      "Task lists and milestone management",
      "Starter workflow tasks to guide your setup",
    ],
    clientCount: 0,
    projectCount: 0,
  },
  {
    id: "generic",
    name: "Generic Business",
    tagline: "A balanced starting point for any service business",
    description:
      "A versatile configuration for service businesses of any kind: mixed-industry client management, varied project types, and full feature access. Starts clean.",
    icon: "Building2",
    color: "emerald",
    includes: [
      "General-purpose client and project workspace",
      "Full feature access: invoices, documents, meetings",
      "Task and activity tracking",
      "Starter workflow tasks to guide your setup",
    ],
    clientCount: 0,
    projectCount: 0,
  },
];

// ── Workspace reset helper ────────────────────────────────────────────────────

async function clearWorkspace(wid: number) {
  await db.execute(sql`DELETE FROM activity      WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM notifications WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM meetings      WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM notes         WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM tasks         WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM deliverables  WHERE project_id IN (SELECT id FROM projects WHERE workspace_id = ${wid})`);
  await db.execute(sql`DELETE FROM documents     WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM payments      WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM projects      WHERE workspace_id = ${wid}`);
  await db.execute(sql`DELETE FROM clients       WHERE workspace_id = ${wid}`);
}

// ── Per-niche starter task seeds ──────────────────────────────────────────────
// These are REAL workflow tasks for the user — not demo data.
// They serve as a "getting started" checklist.

async function seedAgencyStarterTasks(wid: number) {
  await db.insert(tasksTable).values([
    {
      workspaceId: wid,
      title: "Add your first client",
      priority: "high",
      status: "todo",
      notes: "Go to Clients → New Client and fill in the company name, contact, and billing details.",
    },
    {
      workspaceId: wid,
      title: "Create your first project",
      priority: "high",
      status: "todo",
      notes: "Go to Projects → New Project, link it to a client, and set a budget and deadline.",
    },
    {
      workspaceId: wid,
      title: "Set up your agency profile",
      priority: "medium",
      status: "todo",
      notes: "Go to Settings and update your agency name, logo, invoice prefix, and payment terms.",
    },
    {
      workspaceId: wid,
      title: "Issue your first invoice",
      priority: "medium",
      status: "todo",
      notes: "Go to Payments → New Invoice, select a client and project, and set the amount and due date.",
    },
    {
      workspaceId: wid,
      title: "Log your first client meeting",
      priority: "low",
      status: "todo",
      notes: "Go to Meetings → New Meeting to record notes, action items, and next meeting date.",
    },
  ]);
}

async function seedConsultingStarterTasks(wid: number) {
  await db.insert(tasksTable).values([
    {
      workspaceId: wid,
      title: "Add your first client",
      priority: "high",
      status: "todo",
      notes: "Go to Clients → New Client. Record the company, key decision-maker, contract value, and payment method.",
    },
    {
      workspaceId: wid,
      title: "Create your first engagement",
      priority: "high",
      status: "todo",
      notes: "Go to Projects → New Project. Define the engagement scope, deliverables, and timeline.",
    },
    {
      workspaceId: wid,
      title: "Log a meeting or session note",
      priority: "medium",
      status: "todo",
      notes: "Go to Meetings → New Meeting to capture session notes, decisions, and action items.",
    },
    {
      workspaceId: wid,
      title: "Issue your first consulting invoice",
      priority: "medium",
      status: "todo",
      notes: "Go to Payments → New Invoice. Track retainer or project-based billing.",
    },
    {
      workspaceId: wid,
      title: "Configure your profile and invoice settings",
      priority: "low",
      status: "todo",
      notes: "Go to Settings to update your firm name, logo, currency, and payment terms.",
    },
  ]);
}

async function seedClinicStarterTasks(wid: number) {
  await db.insert(tasksTable).values([
    {
      workspaceId: wid,
      title: "Add your first client or patient organisation",
      priority: "high",
      status: "todo",
      notes: "Go to Clients & Patients → New Client. Record the organisation name, clinical contact, and billing info.",
    },
    {
      workspaceId: wid,
      title: "Create your first care program",
      priority: "high",
      status: "todo",
      notes: "Go to Care Programs → New Program. Define the program type, session count, timeline, and billing.",
    },
    {
      workspaceId: wid,
      title: "Log your first appointment",
      priority: "medium",
      status: "todo",
      notes: "Go to Meetings → New Meeting to record session notes, care decisions, and the next appointment date.",
    },
    {
      workspaceId: wid,
      title: "Issue a session or program invoice",
      priority: "medium",
      status: "todo",
      notes: "Go to Payments → New Invoice to track session fees or program billing.",
    },
    {
      workspaceId: wid,
      title: "Set up your practice profile",
      priority: "low",
      status: "todo",
      notes: "Go to Settings to update your practice name, currency, and invoice prefix.",
    },
  ]);
}

async function seedFreelancerStarterTasks(wid: number) {
  await db.insert(tasksTable).values([
    {
      workspaceId: wid,
      title: "Add your first client",
      priority: "high",
      status: "todo",
      notes: "Go to Clients → New Client. Add the contact name, email, and preferred payment method.",
    },
    {
      workspaceId: wid,
      title: "Create your first project",
      priority: "high",
      status: "todo",
      notes: "Go to Projects → New Project. Set the scope, rate, deliverables, and deadline.",
    },
    {
      workspaceId: wid,
      title: "Send a deposit invoice",
      priority: "high",
      status: "todo",
      notes: "Go to Payments → New Invoice. Many freelancers bill 50% upfront — record that here.",
    },
    {
      workspaceId: wid,
      title: "Add your first task or milestone",
      priority: "medium",
      status: "todo",
      notes: "Go to Tasks → New Task to break the project into actionable steps with deadlines.",
    },
    {
      workspaceId: wid,
      title: "Update your profile and invoice template",
      priority: "low",
      status: "todo",
      notes: "Go to Settings to set your name, invoice prefix, payment terms, and tax rate.",
    },
  ]);
}

async function seedGenericStarterTasks(wid: number) {
  await db.insert(tasksTable).values([
    {
      workspaceId: wid,
      title: "Add your first client",
      priority: "high",
      status: "todo",
      notes: "Go to Clients → New Client and fill in the company details, primary contact, and billing info.",
    },
    {
      workspaceId: wid,
      title: "Create your first project",
      priority: "high",
      status: "todo",
      notes: "Go to Projects → New Project. Link it to a client, set a budget and deadline.",
    },
    {
      workspaceId: wid,
      title: "Issue your first invoice",
      priority: "medium",
      status: "todo",
      notes: "Go to Payments → New Invoice to track what you're owed.",
    },
    {
      workspaceId: wid,
      title: "Explore tasks and meetings",
      priority: "low",
      status: "todo",
      notes: "Use Tasks to manage your to-do list and Meetings to log client session notes.",
    },
    {
      workspaceId: wid,
      title: "Configure your workspace settings",
      priority: "low",
      status: "todo",
      notes: "Go to Settings to update your business name, currency, and invoice preferences.",
    },
  ]);
}

// ── Template dispatcher ────────────────────────────────────────────────────────

async function applyTemplate(templateId: string, wid: number): Promise<void> {
  // 1. Clear all existing workspace data
  await clearWorkspace(wid);

  // 2. Update businessType in agency_settings so the UI can adapt
  await db
    .update(agencySettingsTable)
    .set({ businessType: templateId })
    .where(eq(agencySettingsTable.workspaceId, wid));

  // 3. Seed niche-specific starter workflow tasks (no fake clients/projects/payments)
  switch (templateId) {
    case "digital-agency":  return seedAgencyStarterTasks(wid);
    case "consulting":      return seedConsultingStarterTasks(wid);
    case "clinic":          return seedClinicStarterTasks(wid);
    case "freelancer":      return seedFreelancerStarterTasks(wid);
    case "generic":         return seedGenericStarterTasks(wid);
    default: throw new Error(`Unknown template: ${templateId}`);
  }
}

// ── Routes ────────────────────────────────────────────────────────────────────

// GET /api/templates — list available templates
router.get("/templates", (req, res): void => {
  res.json({ templates: TEMPLATE_META });
});

// POST /api/templates/apply — apply a template to the current workspace
router.post("/templates/apply", requireAuth, async (req, res): Promise<void> => {
  const { templateId } = req.body as { templateId?: string };

  if (!templateId) {
    res.status(422).json({ error: "templateId is required" });
    return;
  }

  if (!TEMPLATE_META.find((t) => t.id === templateId)) {
    res.status(404).json({ error: `Unknown template: ${templateId}` });
    return;
  }

  const wid = req.session.workspaceId!;

  try {
    await applyTemplate(templateId, wid);
    res.json({ success: true, templateId });
  } catch (err) {
    console.error("Template apply failed:", err);
    res.status(500).json({
      error: "Failed to apply template",
      details: err instanceof Error ? err.message : "Unknown error",
    });
  }
});

export default router;
