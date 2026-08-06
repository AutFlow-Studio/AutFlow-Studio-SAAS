// Populates the AutFlow Studio database with a realistic demo workspace for
// Velocity Creative Agency — a digital agency managing brand, web, and campaign
// work for five clients at different lifecycle stages.
//
// Safe to re-run: truncates business rows first so the dataset stays deterministic.
// Run `pnpm --filter @workspace/scripts run migrate` before first seed.
import {
  db,
  pool,
  clientsTable,
  projectsTable,
  deliverablesTable,
  paymentsTable,
  invoicesTable,
  documentsTable,
  meetingsTable,
  notesTable,
  tasksTable,
  activityTable,
  usersTable,
  agencySettingsTable,
  campaignsTable,
} from "@workspace/db";
import { sql, eq } from "drizzle-orm";
import bcrypt from "bcryptjs";

// Anchor: today in the demo world
const NOW = new Date("2026-08-05T15:00:00Z");

function daysFrom(base: Date, offset: number): Date {
  return new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
}
function dateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

async function main() {
  // ── Resolve workspace ID first — required for tenant-isolated inserts ──
  // migrate.ts creates the admin user and workspace before seed runs.
  const [adminUser] = await db
    .select({ workspaceId: usersTable.workspaceId })
    .from(usersTable)
    .where(eq(usersTable.email, "admin@autflow.io"))
    .limit(1);
  const wsId = adminUser?.workspaceId ?? 1;
  console.log(`Using workspaceId: ${wsId}`);

  console.log("Clearing existing data...");
  await db.execute(sql`
    TRUNCATE TABLE activity, deliverables, documents, meetings, notes, payments, tasks, projects, clients
    RESTART IDENTITY CASCADE
  `);

  // ─── CLIENTS (5 clients across 3 lifecycle statuses) ─────────────────────
  // Dashboard reads: status ('active'|'inactive') + lifecycleStatus ('prospect'|'active'|'at_risk'|'archived')
  console.log("Seeding clients...");
  const clientRows = await db
    .insert(clientsTable)
    .values([
      // 1. ACTIVE — flagship retainer, financial services
      {
        workspaceId: wsId,
        companyName: "Beacon & Co.",
        industry: "Financial Services",
        website: "https://beaconandco.com",
        email: "hello@beaconandco.com",
        phone: "+1 (415) 555-0142",
        primaryContact: "Nora Whitfield",
        secondaryContact: "Devon Ashby",
        address: "500 Market St, San Francisco, CA",
        timezone: "America/Los_Angeles",
        status: "active",
        lifecycleStatus: "active",
        startDate: dateStr(daysFrom(NOW, -420)),
        contractValue: "180000",
        monthlyRetainer: "9500",
        paymentMethod: "ACH",
        healthScore: 91,
        notes:
          "Long-term retainer client. Board meeting Sep 1 — brand guidelines must be final by Aug 25.",
        tags: ["retainer", "vip"],
      },
      // 2. ACTIVE — rebrand + web, wellness
      {
        workspaceId: wsId,
        companyName: "Solace Wellness",
        industry: "Health & Wellness",
        website: "https://solacewellness.co",
        email: "team@solacewellness.co",
        phone: "+1 (312) 555-0198",
        primaryContact: "Marcus Ibe",
        secondaryContact: null,
        address: "88 LaSalle Ave, Chicago, IL",
        timezone: "America/Chicago",
        status: "active",
        lifecycleStatus: "active",
        startDate: dateStr(daysFrom(NOW, -260)),
        contractValue: "64000",
        monthlyRetainer: null,
        paymentMethod: "Credit Card",
        healthScore: 78,
        notes:
          "Studio launch site completed. App onboarding flow in active development. Marcus is hands-on with design review.",
        tags: ["rebrand", "web"],
      },
      // 3. AT RISK — real estate, delayed project + overdue invoices
      {
        workspaceId: wsId,
        companyName: "Northfield Realty Group",
        industry: "Real Estate",
        website: "https://northfieldrealty.com",
        email: "info@northfieldrealty.com",
        phone: "+1 (617) 555-0110",
        primaryContact: "Elena Vaccaro",
        secondaryContact: "Ben Turcotte",
        address: "12 Beacon Hill Rd, Boston, MA",
        timezone: "America/New_York",
        status: "active",
        lifecycleStatus: "at_risk",
        startDate: dateStr(daysFrom(NOW, -190)),
        contractValue: "42000",
        monthlyRetainer: "3800",
        paymentMethod: "ACH",
        healthScore: 34,
        notes:
          "Listing site overhaul 3 weeks delayed — client slow to supply content. Two invoices overdue. Escalate to principals.",
        tags: ["retainer", "at-risk"],
      },
      // 4. ACTIVE — enterprise, manufacturing/tech
      {
        workspaceId: wsId,
        companyName: "Kepler Robotics",
        industry: "Manufacturing & Technology",
        website: "https://keplerrobotics.io",
        email: "contact@keplerrobotics.io",
        phone: "+1 (512) 555-0177",
        primaryContact: "Priya Raman",
        secondaryContact: "Sam Okafor",
        address: "900 Innovation Way, Austin, TX",
        timezone: "America/Chicago",
        status: "active",
        lifecycleStatus: "active",
        startDate: dateStr(daysFrom(NOW, -95)),
        contractValue: "96000",
        monthlyRetainer: null,
        paymentMethod: "Wire Transfer",
        healthScore: 82,
        notes:
          "Technical stakeholders — expects detailed weekly status reports. Docs hub on track; brand identity in final client review.",
        tags: ["enterprise", "series-b"],
      },
      // 5. PROSPECT — coffee brand, in proposal / early discovery stage
      {
        workspaceId: wsId,
        companyName: "Marrow Coffee Roasters",
        industry: "Food & Beverage",
        website: "https://marrowcoffee.com",
        email: "hi@marrowcoffee.com",
        phone: "+1 (503) 555-0133",
        primaryContact: "Jules Fontaine",
        secondaryContact: null,
        address: "77 Alder St, Portland, OR",
        timezone: "America/Los_Angeles",
        status: "active",
        lifecycleStatus: "prospect",
        startDate: dateStr(daysFrom(NOW, -12)),
        contractValue: "28500",
        monthlyRetainer: null,
        paymentMethod: "Credit Card",
        healthScore: 65,
        notes:
          "Proposal sent for packaging redesign and brand refresh. Jules loves bold visuals. Follow-up call Aug 14.",
        tags: ["prospect", "small-business"],
      },
    ])
    .returning();

  const clientByName = Object.fromEntries(
    clientRows.map((c) => [c.companyName, c])
  );

  // ─── PROJECTS (8 projects, 4 meaningful statuses) ────────────────────────
  // Dashboard status vocabulary (what the API actually filters on):
  //   In Progress  → 'design' | 'development' | 'testing'
  //   Client Review → 'review'
  //   Completed    → 'delivered'
  //   Delayed      → 'development' + deadline in the past  (dashboard computes it)
  //   Paused/Stuck → 'paused'
  // "At risk" is computed by the dashboard from deadline+progress, not a status.
  console.log("Seeding projects...");

  const projectSpecs = [
    // Beacon & Co. — 2 projects
    {
      client: "Beacon & Co.",
      name: "Q3 Brand Refresh",
      status: "development",   // In Progress
      priority: "high",
      progress: 62,
      start: -60,
      deadline: 25,            // future → not delayed
      budget: "45000",
      actual: "27800",
      revenue: "45000",
      blockers: null,
      clientWaitingSince: null,
      desc: "Full visual identity refresh — logo system, color palette, typography, and investor deck template — timed to Beacon's Q3 board presentation.",
    },
    {
      client: "Beacon & Co.",
      name: "Investor Portal Redesign",
      status: "review",        // Client Review
      priority: "medium",
      progress: 85,
      start: -55,
      deadline: 12,            // future → not delayed
      budget: "38000",
      actual: "31200",
      revenue: "38000",
      blockers: null,
      clientWaitingSince: dateStr(daysFrom(NOW, -6)),
      desc: "Redesign of the client-facing investor reporting portal. Awaiting stakeholder sign-off on final high-fidelity mockups.",
    },
    // Solace Wellness — 2 projects
    {
      client: "Solace Wellness",
      name: "Studio Launch Website",
      status: "delivered",     // Completed
      priority: "high",
      progress: 100,
      start: -120,
      deadline: -14,           // past, but delivered — not flagged as delayed
      budget: "34000",
      actual: "33200",
      revenue: "34000",
      blockers: null,
      clientWaitingSince: null,
      desc: "Full marketing site plus booking flow for new studio location in River North. Launched on time.",
    },
    {
      client: "Solace Wellness",
      name: "App Onboarding Flow",
      status: "development",   // In Progress
      priority: "high",
      progress: 55,
      start: -45,
      deadline: 20,            // future → not delayed
      budget: "26000",
      actual: "13100",
      revenue: "26000",
      blockers: null,
      clientWaitingSince: null,
      desc: "Redesign of mobile onboarding to cut signup drop-off. Prototype approved; now in build and usability testing.",
    },
    // Northfield Realty — 1 delayed project (past deadline, not delivered)
    {
      client: "Northfield Realty Group",
      name: "Listing Site Overhaul",
      status: "development",   // In Progress but past deadline → DELAYED by dashboard
      priority: "high",
      progress: 40,
      start: -90,
      deadline: -18,           // 18 days past due → dashboard flags as delayed + at risk
      budget: "40000",
      actual: "18600",
      revenue: "40000",
      blockers:
        "Client has not supplied property photography or MLS feed credentials. Project is 3 weeks behind original deadline.",
      clientWaitingSince: null,
      desc: "New listings platform with map-based property search. Delayed by missing client-side content and API access.",
    },
    // Kepler Robotics — 2 projects
    {
      client: "Kepler Robotics",
      name: "Technical Documentation Hub",
      status: "development",   // In Progress
      priority: "high",
      progress: 58,
      start: -50,
      deadline: 22,            // future → not delayed
      budget: "52000",
      actual: "26700",
      revenue: "52000",
      blockers: null,
      clientWaitingSince: null,
      desc: "Centralized documentation hub for hardware and firmware engineering teams, built on a custom component library.",
    },
    {
      client: "Kepler Robotics",
      name: "Brand Identity & Pitch System",
      status: "review",        // Client Review
      priority: "medium",
      progress: 88,
      start: -65,
      deadline: 7,             // future → not delayed
      budget: "28000",
      actual: "24300",
      revenue: "28000",
      blockers: null,
      clientWaitingSince: dateStr(daysFrom(NOW, -4)),
      desc: "Full visual brand identity plus a modular pitch deck system for Kepler's Series B fundraising campaign.",
    },
    // Marrow Coffee — 1 early-stage project (prospect)
    {
      client: "Marrow Coffee Roasters",
      name: "Packaging & Brand Redesign",
      status: "design",        // In Progress — early design phase
      priority: "medium",
      progress: 20,
      start: -10,
      deadline: 55,            // future → not delayed
      budget: "28500",
      actual: "3200",
      revenue: null,
      blockers: null,
      clientWaitingSince: null,
      desc: "Discovery and brand audit underway. New label system and brand identity for the core roast lineup, plus seasonal packaging.",
    },
  ] as const;

  const projectRows = await db
    .insert(projectsTable)
    .values(
      projectSpecs.map((p) => ({
        workspaceId: wsId,
        clientId: clientByName[p.client]!.id,
        name: p.name,
        status: p.status,
        priority: p.priority,
        progress: p.progress,
        startDate: dateStr(daysFrom(NOW, p.start)),
        deadline: dateStr(daysFrom(NOW, p.deadline)),
        estimatedBudget: p.budget,
        actualCost: p.actual,
        revenue: p.revenue,
        description: p.desc,
        blockers: p.blockers,
        clientWaitingSince: p.clientWaitingSince,
        ownerNotes: null,
      }))
    )
    .returning();

  const projectByName = Object.fromEntries(
    projectRows.map((p) => [p.name, p])
  );

  // ─── TASKS (3–5 per project) ──────────────────────────────────────────────
  // Status vocab: todo | in_progress | blocked | done
  // Overdue = todo/in_progress with a deadline in the past (negative offset)
  console.log("Seeding tasks...");

  const taskSpecs: {
    title: string;
    priority: string;
    status: string;
    deadlineOffset?: number;
    client: string;
    project: string;
    notes?: string;
    sortOrder: number;
  }[] = [
    // Q3 Brand Refresh
    { title: "Kick-off brand audit and competitor analysis", priority: "high", status: "done", deadlineOffset: -52, client: "Beacon & Co.", project: "Q3 Brand Refresh", sortOrder: 1 },
    { title: "Deliver three logo system directions for review", priority: "high", status: "done", deadlineOffset: -30, client: "Beacon & Co.", project: "Q3 Brand Refresh", sortOrder: 2 },
    { title: "Finalize direction 4 — refine color palette and spacing", priority: "high", status: "in_progress", deadlineOffset: 3, client: "Beacon & Co.", project: "Q3 Brand Refresh", sortOrder: 3 },
    { title: "Export investor deck template (PowerPoint + Google Slides)", priority: "high", status: "todo", deadlineOffset: 18, client: "Beacon & Co.", project: "Q3 Brand Refresh", sortOrder: 4 },
    { title: "Compile brand guidelines PDF for final delivery", priority: "medium", status: "todo", deadlineOffset: 23, client: "Beacon & Co.", project: "Q3 Brand Refresh", sortOrder: 5 },

    // Investor Portal Redesign
    { title: "Stakeholder interview — identify portal pain points", priority: "high", status: "done", deadlineOffset: -40, client: "Beacon & Co.", project: "Investor Portal Redesign", sortOrder: 1 },
    { title: "Deliver wireframes and information architecture", priority: "high", status: "done", deadlineOffset: -18, client: "Beacon & Co.", project: "Investor Portal Redesign", sortOrder: 2 },
    { title: "Present high-fidelity mockups to stakeholder group", priority: "high", status: "done", deadlineOffset: -8, client: "Beacon & Co.", project: "Investor Portal Redesign", sortOrder: 3 },
    { title: "Incorporate stakeholder feedback — simplify nav + remove secondary sidebar", priority: "medium", status: "in_progress", deadlineOffset: 5, client: "Beacon & Co.", project: "Investor Portal Redesign", sortOrder: 4 },
    { title: "Deliver final design handoff to development team", priority: "medium", status: "todo", deadlineOffset: 11, client: "Beacon & Co.", project: "Investor Portal Redesign", sortOrder: 5 },

    // Studio Launch Website (completed project — all done)
    { title: "Content and copy collection from client", priority: "high", status: "done", deadlineOffset: -100, client: "Solace Wellness", project: "Studio Launch Website", sortOrder: 1 },
    { title: "Design homepage and booking flow", priority: "high", status: "done", deadlineOffset: -60, client: "Solace Wellness", project: "Studio Launch Website", sortOrder: 2 },
    { title: "Build and integrate booking system", priority: "high", status: "done", deadlineOffset: -30, client: "Solace Wellness", project: "Studio Launch Website", sortOrder: 3 },
    { title: "QA pass — accessibility, mobile, and performance", priority: "high", status: "done", deadlineOffset: -18, client: "Solace Wellness", project: "Studio Launch Website", sortOrder: 4 },
    { title: "Launch and post-launch monitoring", priority: "high", status: "done", deadlineOffset: -14, client: "Solace Wellness", project: "Studio Launch Website", sortOrder: 5 },

    // App Onboarding Flow
    { title: "Audit current onboarding — identify top drop-off points", priority: "high", status: "done", deadlineOffset: -38, client: "Solace Wellness", project: "App Onboarding Flow", sortOrder: 1 },
    { title: "Design three onboarding flow concepts", priority: "high", status: "done", deadlineOffset: -20, client: "Solace Wellness", project: "App Onboarding Flow", sortOrder: 2 },
    { title: "Simplify intake form — reduce from 6 fields to 3", priority: "urgent", status: "in_progress", deadlineOffset: 2, client: "Solace Wellness", project: "App Onboarding Flow", sortOrder: 3 },
    { title: "Run usability testing on revised prototype", priority: "high", status: "todo", deadlineOffset: 10, client: "Solace Wellness", project: "App Onboarding Flow", sortOrder: 4 },
    { title: "Handoff final specs to Marcus's dev team", priority: "medium", status: "todo", deadlineOffset: 18, client: "Solace Wellness", project: "App Onboarding Flow", sortOrder: 5 },

    // Listing Site Overhaul (delayed — overdue tasks)
    { title: "Discovery workshop and requirements sign-off", priority: "high", status: "done", deadlineOffset: -80, client: "Northfield Realty Group", project: "Listing Site Overhaul", sortOrder: 1 },
    { title: "Wireframes for map-based search and listing detail", priority: "high", status: "done", deadlineOffset: -50, client: "Northfield Realty Group", project: "Listing Site Overhaul", sortOrder: 2 },
    // OVERDUE tasks — past deadline, still open
    { title: "Request MLS feed credentials and property photography from Elena", priority: "urgent", status: "todo", deadlineOffset: -22, client: "Northfield Realty Group", project: "Listing Site Overhaul", notes: "OVERDUE — blocking all frontend build. Third follow-up sent Aug 1.", sortOrder: 3 },
    { title: "Build listings grid and map search components", priority: "high", status: "in_progress", deadlineOffset: -10, client: "Northfield Realty Group", project: "Listing Site Overhaul", notes: "Partially built with placeholder data; blocked until photography arrives.", sortOrder: 4 },
    { title: "Schedule recovery call with Elena Vaccaro and Ben Turcotte", priority: "urgent", status: "todo", deadlineOffset: 2, client: "Northfield Realty Group", project: "Listing Site Overhaul", sortOrder: 5 },

    // Technical Documentation Hub
    { title: "Content architecture workshop with engineering leads", priority: "high", status: "done", deadlineOffset: -38, client: "Kepler Robotics", project: "Technical Documentation Hub", sortOrder: 1 },
    { title: "Finalize taxonomy for firmware and hardware doc sections", priority: "high", status: "done", deadlineOffset: -20, client: "Kepler Robotics", project: "Technical Documentation Hub", sortOrder: 2 },
    { title: "Build base component library for docs hub", priority: "high", status: "in_progress", deadlineOffset: 8, client: "Kepler Robotics", project: "Technical Documentation Hub", sortOrder: 3 },
    { title: "Migrate priority docs from Notion and Confluence", priority: "medium", status: "todo", deadlineOffset: 15, client: "Kepler Robotics", project: "Technical Documentation Hub", sortOrder: 4 },
    { title: "QA and accessibility review before pilot launch", priority: "medium", status: "todo", deadlineOffset: 20, client: "Kepler Robotics", project: "Technical Documentation Hub", sortOrder: 5 },

    // Brand Identity & Pitch System
    { title: "Brand discovery session and moodboard review", priority: "high", status: "done", deadlineOffset: -55, client: "Kepler Robotics", project: "Brand Identity & Pitch System", sortOrder: 1 },
    { title: "Deliver three brand directions for internal selection", priority: "high", status: "done", deadlineOffset: -30, client: "Kepler Robotics", project: "Brand Identity & Pitch System", sortOrder: 2 },
    { title: "Design full identity system for approved direction", priority: "high", status: "done", deadlineOffset: -10, client: "Kepler Robotics", project: "Brand Identity & Pitch System", sortOrder: 3 },
    { title: "Send pitch deck system to Priya for stakeholder review", priority: "high", status: "done", deadlineOffset: -5, client: "Kepler Robotics", project: "Brand Identity & Pitch System", sortOrder: 4 },
    // OVERDUE — awaiting client feedback past follow-up deadline
    { title: "Follow up with Priya Raman on Series B deck review feedback", priority: "urgent", status: "todo", deadlineOffset: -3, client: "Kepler Robotics", project: "Brand Identity & Pitch System", notes: "OVERDUE — 4 days since send, no feedback. Follow up today.", sortOrder: 5 },

    // Packaging & Brand Redesign (early stage)
    { title: "Intro call and brand questionnaire with Jules", priority: "high", status: "done", deadlineOffset: -10, client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", sortOrder: 1 },
    { title: "Competitive audit — specialty coffee packaging landscape", priority: "medium", status: "in_progress", deadlineOffset: 5, client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", sortOrder: 2 },
    { title: "Present initial moodboards and creative direction", priority: "medium", status: "todo", deadlineOffset: 14, client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", sortOrder: 3 },
    { title: "Develop three label system concepts", priority: "medium", status: "todo", deadlineOffset: 30, client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", sortOrder: 4 },
  ];

  await db.insert(tasksTable).values(
    taskSpecs.map((t) => ({
      workspaceId: wsId,
      title: t.title,
      priority: t.priority,
      status: t.status,
      deadline:
        t.deadlineOffset != null
          ? dateStr(daysFrom(NOW, t.deadlineOffset))
          : null,
      notes: t.notes ?? null,
      clientId: clientByName[t.client]!.id,
      projectId: projectByName[t.project]!.id,
      sortOrder: t.sortOrder,
    }))
  );

  // ─── DELIVERABLES ─────────────────────────────────────────────────────────
  // Status vocab: draft | internal_review | sent | approved | changes_requested | completed
  //   "Approved"                → approved
  //   "Waiting for client approval" → sent
  //   "Changes requested"       → changes_requested
  console.log("Seeding deliverables...");

  const deliverableSpecs: {
    project: string;
    title: string;
    type: string;
    status: string;
    deadlineOffset: number;
    assignedTo: string;
    completionDate?: number;
    approvalDate?: number;
    approvedBy?: string;
    revisionCount?: number;
    feedbackNotes?: string;
    notes?: string;
  }[] = [
    // Q3 Brand Refresh
    { project: "Q3 Brand Refresh", title: "Logo system exploration deck", type: "Brand Identity", status: "approved", deadlineOffset: -28, assignedTo: "Maya Chen", completionDate: -29, approvalDate: -26, approvedBy: "Nora Whitfield", revisionCount: 1, notes: "Client selected direction 4 after one round of revisions." },
    { project: "Q3 Brand Refresh", title: "Color & typography system guidelines", type: "Brand Identity", status: "approved", deadlineOffset: -14, assignedTo: "Maya Chen", completionDate: -15, approvalDate: -12, approvedBy: "Nora Whitfield", revisionCount: 0 },
    { project: "Q3 Brand Refresh", title: "Investor deck template (PowerPoint + Google Slides)", type: "Presentation", status: "sent", deadlineOffset: 8, assignedTo: "Theo Brandt", revisionCount: 0, notes: "Sent to Nora for stakeholder review on Aug 3." },
    { project: "Q3 Brand Refresh", title: "Brand guidelines PDF (final delivery)", type: "Brand Identity", status: "internal_review", deadlineOffset: 22, assignedTo: "Maya Chen", revisionCount: 0 },

    // Investor Portal Redesign
    { project: "Investor Portal Redesign", title: "Wireframes v1 — information architecture", type: "UX Design", status: "approved", deadlineOffset: -16, assignedTo: "Theo Brandt", completionDate: -17, approvalDate: -14, approvedBy: "Devon Ashby", revisionCount: 0 },
    { project: "Investor Portal Redesign", title: "High-fidelity UI mockups — full portal", type: "UI Design", status: "changes_requested", deadlineOffset: -2, assignedTo: "Theo Brandt", revisionCount: 2, feedbackNotes: "Devon requested a simplified navigation pattern for the portfolio view and removal of the secondary sidebar. Round 3 in progress." },
    { project: "Investor Portal Redesign", title: "Final design handoff + developer specs", type: "UI Design", status: "internal_review", deadlineOffset: 11, assignedTo: "Theo Brandt", revisionCount: 0 },

    // Studio Launch Website (all approved/completed)
    { project: "Studio Launch Website", title: "Homepage and booking flow design", type: "Web Design", status: "approved", deadlineOffset: -58, assignedTo: "Priya Nadar", completionDate: -60, approvalDate: -55, approvedBy: "Marcus Ibe", revisionCount: 1 },
    { project: "Studio Launch Website", title: "Booking system build + CMS integration", type: "Website", status: "approved", deadlineOffset: -28, assignedTo: "Sam Okoye", completionDate: -30, approvalDate: -25, approvedBy: "Marcus Ibe", revisionCount: 0 },
    { project: "Studio Launch Website", title: "Launched production site — solacewellness.co", type: "Website", status: "completed", deadlineOffset: -14, assignedTo: "Sam Okoye", completionDate: -14, revisionCount: 0, notes: "Site live. Passed all accessibility and performance audits." },

    // App Onboarding Flow
    { project: "App Onboarding Flow", title: "Onboarding audit report and recommendations", type: "UX Design", status: "approved", deadlineOffset: -32, assignedTo: "Priya Nadar", completionDate: -33, approvalDate: -30, approvedBy: "Marcus Ibe", revisionCount: 0 },
    { project: "App Onboarding Flow", title: "Revised onboarding prototype (v2)", type: "UX Design", status: "changes_requested", deadlineOffset: -5, assignedTo: "Sam Okoye", revisionCount: 1, feedbackNotes: "Marcus wants to reduce the welcome animation duration and make the email field the first input. Quick revision in progress." },
    { project: "App Onboarding Flow", title: "Final production-ready specs for dev handoff", type: "UI Design", status: "internal_review", deadlineOffset: 16, assignedTo: "Priya Nadar", revisionCount: 0 },

    // Listing Site Overhaul (delayed project)
    { project: "Listing Site Overhaul", title: "Wireframes — listing grid and map search", type: "UX Design", status: "approved", deadlineOffset: -48, assignedTo: "Theo Brandt", completionDate: -50, approvalDate: -45, approvedBy: "Elena Vaccaro", revisionCount: 1 },
    { project: "Listing Site Overhaul", title: "High-fidelity mockups — listing detail + search", type: "UI Design", status: "sent", deadlineOffset: -20, assignedTo: "Theo Brandt", revisionCount: 0, notes: "Sent to Elena on Jul 16. No feedback received — project blocked pending content delivery." },

    // Technical Documentation Hub
    { project: "Technical Documentation Hub", title: "Content architecture and navigation taxonomy", type: "UX Design", status: "approved", deadlineOffset: -22, assignedTo: "Maya Chen", completionDate: -23, approvalDate: -20, approvedBy: "Priya Raman", revisionCount: 0 },
    { project: "Technical Documentation Hub", title: "Doc hub component library v1", type: "Website", status: "internal_review", deadlineOffset: 8, assignedTo: "Sam Okoye", revisionCount: 0, notes: "In build — estimated complete Aug 10." },

    // Brand Identity & Pitch System
    { project: "Brand Identity & Pitch System", title: "Brand identity system — final files", type: "Brand Identity", status: "approved", deadlineOffset: -8, assignedTo: "Maya Chen", completionDate: -9, approvalDate: -7, approvedBy: "Priya Raman", revisionCount: 2, notes: "Approved after two rounds. Logo, color, type, and usage guidelines included." },
    { project: "Brand Identity & Pitch System", title: "Series B pitch deck system (modular slides)", type: "Presentation", status: "sent", deadlineOffset: -5, assignedTo: "Theo Brandt", revisionCount: 0, notes: "Delivered to Priya Raman on Aug 1. Awaiting feedback from Kepler board." },

    // Packaging & Brand Redesign (early stage)
    { project: "Packaging & Brand Redesign", title: "Brand audit and competitive analysis report", type: "Brand Identity", status: "internal_review", deadlineOffset: 3, assignedTo: "Maya Chen", revisionCount: 0 },
    { project: "Packaging & Brand Redesign", title: "Moodboards and initial creative direction", type: "Brand Identity", status: "internal_review", deadlineOffset: 14, assignedTo: "Maya Chen", revisionCount: 0, notes: "Scheduled to present to Jules on Aug 14." },
  ];

  await db.insert(deliverablesTable).values(
    deliverableSpecs.map((d) => ({
      workspaceId: wsId,
      projectId: projectByName[d.project]!.id,
      title: d.title,
      type: d.type,
      status: d.status,
      deadline: dateStr(daysFrom(NOW, d.deadlineOffset)),
      assignedTo: d.assignedTo,
      completionDate:
        d.completionDate != null
          ? dateStr(daysFrom(NOW, d.completionDate))
          : null,
      approvalDate:
        d.approvalDate != null
          ? dateStr(daysFrom(NOW, d.approvalDate))
          : null,
      approvedBy: d.approvedBy ?? null,
      revisionCount: d.revisionCount ?? 0,
      feedbackNotes: d.feedbackNotes ?? null,
      notes: d.notes ?? null,
    }))
  );

  // ─── PAYMENTS ─────────────────────────────────────────────────────────────
  // Status vocab: paid | pending | overdue
  // Dashboard outstanding = pending + overdue; revenue MTD = paid w/ paidDate this month
  console.log("Seeding payments...");

  const paymentSpecs: {
    client: string;
    project?: string;
    invoice: string;
    amount: string;
    status: string;
    dueOffset: number;
    paidOffset?: number;
    method?: string;
    notes?: string;
  }[] = [
    // Beacon & Co. — Q3 Brand Refresh (3 milestones)
    { client: "Beacon & Co.", project: "Q3 Brand Refresh", invoice: "INV-1041", amount: "15000", status: "paid", dueOffset: -50, paidOffset: -52, method: "ACH" },
    { client: "Beacon & Co.", project: "Q3 Brand Refresh", invoice: "INV-1058", amount: "15000", status: "paid", dueOffset: -20, paidOffset: -21, method: "ACH" },
    { client: "Beacon & Co.", project: "Q3 Brand Refresh", invoice: "INV-1072", amount: "15000", status: "pending", dueOffset: 15, method: "ACH" },
    // Beacon & Co. — Investor Portal Redesign
    { client: "Beacon & Co.", project: "Investor Portal Redesign", invoice: "INV-1059", amount: "19000", status: "paid", dueOffset: -30, paidOffset: -32, method: "ACH" },
    { client: "Beacon & Co.", project: "Investor Portal Redesign", invoice: "INV-1074", amount: "19000", status: "pending", dueOffset: 10, method: "ACH" },
    // Beacon & Co. — Monthly retainer
    { client: "Beacon & Co.", invoice: "INV-1080", amount: "9500", status: "paid", dueOffset: -5, paidOffset: -5, method: "ACH", notes: "July retainer." },
    { client: "Beacon & Co.", invoice: "INV-1088", amount: "9500", status: "pending", dueOffset: 26, method: "ACH", notes: "August retainer." },

    // Solace Wellness — Studio Launch Website (all paid — project delivered)
    { client: "Solace Wellness", project: "Studio Launch Website", invoice: "INV-2011", amount: "17000", status: "paid", dueOffset: -90, paidOffset: -92, method: "Credit Card" },
    { client: "Solace Wellness", project: "Studio Launch Website", invoice: "INV-2029", amount: "17000", status: "paid", dueOffset: -20, paidOffset: -22, method: "Credit Card" },
    // Solace Wellness — App Onboarding Flow
    { client: "Solace Wellness", project: "App Onboarding Flow", invoice: "INV-2034", amount: "13000", status: "paid", dueOffset: -28, paidOffset: -29, method: "Credit Card" },
    { client: "Solace Wellness", project: "App Onboarding Flow", invoice: "INV-2041", amount: "13000", status: "pending", dueOffset: 8, method: "Credit Card" },

    // Northfield Realty — overdue invoices (at-risk client, delayed project)
    { client: "Northfield Realty Group", project: "Listing Site Overhaul", invoice: "INV-3005", amount: "20000", status: "paid", dueOffset: -70, paidOffset: -72, method: "ACH" },
    { client: "Northfield Realty Group", project: "Listing Site Overhaul", invoice: "INV-3019", amount: "20000", status: "overdue", dueOffset: -25, notes: "30 days overdue. Second notice sent Jul 30." },
    { client: "Northfield Realty Group", invoice: "INV-3041", amount: "3800", status: "overdue", dueOffset: -8, method: "ACH", notes: "July retainer — overdue. Follow up by phone." },

    // Kepler Robotics — Technical Documentation Hub
    { client: "Kepler Robotics", project: "Technical Documentation Hub", invoice: "INV-4002", amount: "26000", status: "paid", dueOffset: -40, paidOffset: -41, method: "Wire Transfer" },
    { client: "Kepler Robotics", project: "Technical Documentation Hub", invoice: "INV-4018", amount: "26000", status: "pending", dueOffset: 14, method: "Wire Transfer" },
    // Kepler Robotics — Brand Identity & Pitch System
    { client: "Kepler Robotics", project: "Brand Identity & Pitch System", invoice: "INV-4025", amount: "14000", status: "paid", dueOffset: -35, paidOffset: -37, method: "Wire Transfer" },
    { client: "Kepler Robotics", project: "Brand Identity & Pitch System", invoice: "INV-4036", amount: "14000", status: "pending", dueOffset: 5, method: "Wire Transfer" },

    // Marrow Coffee — Packaging & Brand Redesign (prospect; deposit only)
    { client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", invoice: "INV-5003", amount: "5700", status: "paid", dueOffset: -8, paidOffset: -7, method: "Credit Card", notes: "20% discovery deposit paid upfront." },
    { client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", invoice: "INV-5011", amount: "8550", status: "pending", dueOffset: 30, method: "Credit Card", notes: "30% milestone — due on creative direction approval." },
  ];

  await db.insert(paymentsTable).values(
    paymentSpecs.map((p) => ({
      workspaceId: wsId,
      clientId: clientByName[p.client]!.id,
      projectId: p.project ? projectByName[p.project]!.id : null,
      invoiceNumber: p.invoice,
      amount: p.amount,
      status: p.status,
      dueDate: dateStr(daysFrom(NOW, p.dueOffset)),
      paidDate:
        p.paidOffset != null ? dateStr(daysFrom(NOW, p.paidOffset)) : null,
      paymentMethod: p.method ?? null,
      remainingBalance: p.status === "paid" ? "0" : p.amount,
      notes: p.notes ?? null,
    }))
  );

  // ─── INVOICES (formal invoice records with line items) ────────────────────
  console.log("Seeding invoices...");

  const invoiceSpecs: {
    client: string;
    project?: string;
    invoiceNumber: string;
    status: string;
    subtotal: string;
    tax: string;
    total: string;
    amountPaid: string;
    lineItems: { description: string; quantity: number; unitPrice: number; amount: number }[];
    dueOffset: number;
    paidOffset?: number;
    notes?: string;
    sentOffset?: number;
  }[] = [
    // Beacon & Co. — Q3 Brand Refresh milestone 1
    {
      client: "Beacon & Co.", project: "Q3 Brand Refresh",
      invoiceNumber: "INV-1041", status: "paid",
      subtotal: "15000", tax: "0", total: "15000", amountPaid: "15000",
      lineItems: [{ description: "Brand strategy & discovery phase", quantity: 1, unitPrice: 7500, amount: 7500 }, { description: "Logo system exploration (3 directions)", quantity: 1, unitPrice: 7500, amount: 7500 }],
      dueOffset: -50, paidOffset: -52, sentOffset: -55,
    },
    // Beacon & Co. — Q3 Brand Refresh milestone 2
    {
      client: "Beacon & Co.", project: "Q3 Brand Refresh",
      invoiceNumber: "INV-1058", status: "paid",
      subtotal: "15000", tax: "0", total: "15000", amountPaid: "15000",
      lineItems: [{ description: "Color & typography system", quantity: 1, unitPrice: 6000, amount: 6000 }, { description: "Brand guidelines document (draft)", quantity: 1, unitPrice: 9000, amount: 9000 }],
      dueOffset: -20, paidOffset: -21, sentOffset: -25,
    },
    // Beacon & Co. — Q3 Brand Refresh milestone 3 (pending)
    {
      client: "Beacon & Co.", project: "Q3 Brand Refresh",
      invoiceNumber: "INV-1072", status: "sent",
      subtotal: "15000", tax: "0", total: "15000", amountPaid: "0",
      lineItems: [{ description: "Investor deck template (PowerPoint + Google Slides)", quantity: 1, unitPrice: 8000, amount: 8000 }, { description: "Final brand guidelines PDF", quantity: 1, unitPrice: 7000, amount: 7000 }],
      dueOffset: 15, sentOffset: -3,
    },
    // Beacon & Co. — Investor Portal Redesign milestone 1
    {
      client: "Beacon & Co.", project: "Investor Portal Redesign",
      invoiceNumber: "INV-1059", status: "paid",
      subtotal: "19000", tax: "0", total: "19000", amountPaid: "19000",
      lineItems: [{ description: "UX research & stakeholder interviews", quantity: 1, unitPrice: 5000, amount: 5000 }, { description: "Wireframes & information architecture", quantity: 1, unitPrice: 8000, amount: 8000 }, { description: "High-fidelity UI mockups (round 1)", quantity: 1, unitPrice: 6000, amount: 6000 }],
      dueOffset: -30, paidOffset: -32, sentOffset: -35,
    },
    // Beacon & Co. — Investor Portal Redesign milestone 2
    {
      client: "Beacon & Co.", project: "Investor Portal Redesign",
      invoiceNumber: "INV-1074", status: "sent",
      subtotal: "19000", tax: "0", total: "19000", amountPaid: "0",
      lineItems: [{ description: "UI revisions & final design system", quantity: 1, unitPrice: 10000, amount: 10000 }, { description: "Developer handoff specs & asset export", quantity: 1, unitPrice: 9000, amount: 9000 }],
      dueOffset: 10, sentOffset: -4,
    },
    // Beacon & Co. — July retainer
    {
      client: "Beacon & Co.",
      invoiceNumber: "INV-1080", status: "paid",
      subtotal: "9500", tax: "0", total: "9500", amountPaid: "9500",
      lineItems: [{ description: "Monthly retainer — July 2026", quantity: 1, unitPrice: 9500, amount: 9500 }],
      dueOffset: -5, paidOffset: -5, sentOffset: -7, notes: "July retainer.",
    },
    // Beacon & Co. — August retainer
    {
      client: "Beacon & Co.",
      invoiceNumber: "INV-1088", status: "sent",
      subtotal: "9500", tax: "0", total: "9500", amountPaid: "0",
      lineItems: [{ description: "Monthly retainer — August 2026", quantity: 1, unitPrice: 9500, amount: 9500 }],
      dueOffset: 26, sentOffset: 1, notes: "August retainer.",
    },
    // Solace Wellness — Studio Launch Website
    {
      client: "Solace Wellness", project: "Studio Launch Website",
      invoiceNumber: "INV-2011", status: "paid",
      subtotal: "17000", tax: "0", total: "17000", amountPaid: "17000",
      lineItems: [{ description: "Homepage design & booking flow", quantity: 1, unitPrice: 9000, amount: 9000 }, { description: "Content strategy & copywriting", quantity: 1, unitPrice: 4000, amount: 4000 }, { description: "CMS setup & configuration", quantity: 1, unitPrice: 4000, amount: 4000 }],
      dueOffset: -90, paidOffset: -92, sentOffset: -95,
    },
    {
      client: "Solace Wellness", project: "Studio Launch Website",
      invoiceNumber: "INV-2029", status: "paid",
      subtotal: "17000", tax: "0", total: "17000", amountPaid: "17000",
      lineItems: [{ description: "Development & CMS integration", quantity: 1, unitPrice: 10000, amount: 10000 }, { description: "QA, performance & accessibility audit", quantity: 1, unitPrice: 4000, amount: 4000 }, { description: "Launch support & post-launch monitoring", quantity: 1, unitPrice: 3000, amount: 3000 }],
      dueOffset: -20, paidOffset: -22, sentOffset: -25,
    },
    // Solace Wellness — App Onboarding Flow
    {
      client: "Solace Wellness", project: "App Onboarding Flow",
      invoiceNumber: "INV-2034", status: "paid",
      subtotal: "13000", tax: "0", total: "13000", amountPaid: "13000",
      lineItems: [{ description: "Onboarding audit & drop-off analysis", quantity: 1, unitPrice: 4000, amount: 4000 }, { description: "Three onboarding flow concepts", quantity: 1, unitPrice: 5000, amount: 5000 }, { description: "Interactive prototype (Figma)", quantity: 1, unitPrice: 4000, amount: 4000 }],
      dueOffset: -28, paidOffset: -29, sentOffset: -32,
    },
    {
      client: "Solace Wellness", project: "App Onboarding Flow",
      invoiceNumber: "INV-2041", status: "sent",
      subtotal: "13000", tax: "0", total: "13000", amountPaid: "0",
      lineItems: [{ description: "Usability testing facilitation", quantity: 1, unitPrice: 5000, amount: 5000 }, { description: "Final production-ready specs & dev handoff", quantity: 1, unitPrice: 8000, amount: 8000 }],
      dueOffset: 8, sentOffset: -2,
    },
    // Northfield Realty Group
    {
      client: "Northfield Realty Group", project: "Listing Site Overhaul",
      invoiceNumber: "INV-3005", status: "paid",
      subtotal: "20000", tax: "0", total: "20000", amountPaid: "20000",
      lineItems: [{ description: "Discovery workshop & requirements", quantity: 1, unitPrice: 5000, amount: 5000 }, { description: "Wireframes — map search & listing detail", quantity: 1, unitPrice: 8000, amount: 8000 }, { description: "UI design system for listings", quantity: 1, unitPrice: 7000, amount: 7000 }],
      dueOffset: -70, paidOffset: -72, sentOffset: -75,
    },
    {
      client: "Northfield Realty Group", project: "Listing Site Overhaul",
      invoiceNumber: "INV-3019", status: "overdue",
      subtotal: "20000", tax: "0", total: "20000", amountPaid: "0",
      lineItems: [{ description: "Front-end development (listings grid, map, search)", quantity: 1, unitPrice: 20000, amount: 20000 }],
      dueOffset: -25, sentOffset: -55, notes: "30 days overdue. Second notice sent Jul 30.",
    },
    {
      client: "Northfield Realty Group",
      invoiceNumber: "INV-3041", status: "overdue",
      subtotal: "3800", tax: "0", total: "3800", amountPaid: "0",
      lineItems: [{ description: "Monthly retainer — July 2026", quantity: 1, unitPrice: 3800, amount: 3800 }],
      dueOffset: -8, sentOffset: -10, notes: "July retainer — overdue. Follow up by phone.",
    },
    // Kepler Robotics
    {
      client: "Kepler Robotics", project: "Technical Documentation Hub",
      invoiceNumber: "INV-4002", status: "paid",
      subtotal: "26000", tax: "0", total: "26000", amountPaid: "26000",
      lineItems: [{ description: "Content architecture & taxonomy design", quantity: 1, unitPrice: 10000, amount: 10000 }, { description: "Component library design (v1)", quantity: 1, unitPrice: 10000, amount: 10000 }, { description: "Engineering team workshops (×2)", quantity: 2, unitPrice: 3000, amount: 6000 }],
      dueOffset: -40, paidOffset: -41, sentOffset: -45,
    },
    {
      client: "Kepler Robotics", project: "Technical Documentation Hub",
      invoiceNumber: "INV-4018", status: "sent",
      subtotal: "26000", tax: "0", total: "26000", amountPaid: "0",
      lineItems: [{ description: "Doc hub component library build", quantity: 1, unitPrice: 15000, amount: 15000 }, { description: "Content migration (priority docs)", quantity: 1, unitPrice: 8000, amount: 8000 }, { description: "QA & accessibility review", quantity: 1, unitPrice: 3000, amount: 3000 }],
      dueOffset: 14, sentOffset: -1,
    },
    {
      client: "Kepler Robotics", project: "Brand Identity & Pitch System",
      invoiceNumber: "INV-4025", status: "paid",
      subtotal: "14000", tax: "0", total: "14000", amountPaid: "14000",
      lineItems: [{ description: "Brand discovery & moodboards", quantity: 1, unitPrice: 4000, amount: 4000 }, { description: "Three brand directions", quantity: 1, unitPrice: 6000, amount: 6000 }, { description: "Approved direction development", quantity: 1, unitPrice: 4000, amount: 4000 }],
      dueOffset: -35, paidOffset: -37, sentOffset: -40,
    },
    {
      client: "Kepler Robotics", project: "Brand Identity & Pitch System",
      invoiceNumber: "INV-4036", status: "sent",
      subtotal: "14000", tax: "0", total: "14000", amountPaid: "0",
      lineItems: [{ description: "Final brand identity system & files", quantity: 1, unitPrice: 8000, amount: 8000 }, { description: "Series B pitch deck system (modular)", quantity: 1, unitPrice: 6000, amount: 6000 }],
      dueOffset: 5, sentOffset: -6,
    },
    // Marrow Coffee Roasters
    {
      client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign",
      invoiceNumber: "INV-5003", status: "paid",
      subtotal: "5700", tax: "0", total: "5700", amountPaid: "5700",
      lineItems: [{ description: "Discovery deposit (20%) — packaging & brand redesign", quantity: 1, unitPrice: 5700, amount: 5700 }],
      dueOffset: -8, paidOffset: -7, sentOffset: -10, notes: "20% discovery deposit paid upfront.",
    },
    {
      client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign",
      invoiceNumber: "INV-5011", status: "draft",
      subtotal: "8550", tax: "0", total: "8550", amountPaid: "0",
      lineItems: [{ description: "30% milestone — creative direction approval", quantity: 1, unitPrice: 8550, amount: 8550 }],
      dueOffset: 30, notes: "30% milestone — due on creative direction approval.",
    },
  ];

  await db.insert(invoicesTable).values(
    invoiceSpecs.map((inv) => ({
      workspaceId: wsId,
      clientId: clientByName[inv.client]!.id,
      projectId: inv.project ? projectByName[inv.project]!.id : null,
      invoiceNumber: inv.invoiceNumber,
      status: inv.status,
      subtotal: inv.subtotal,
      tax: inv.tax,
      total: inv.total,
      amountPaid: inv.amountPaid,
      lineItems: JSON.stringify(inv.lineItems),
      dueDate: dateStr(daysFrom(NOW, inv.dueOffset)),
      paidDate: inv.paidOffset != null ? dateStr(daysFrom(NOW, inv.paidOffset)) : null,
      sentAt: inv.sentOffset != null ? daysFrom(NOW, inv.sentOffset) : null,
      notes: inv.notes ?? null,
    }))
  );

  // ─── DOCUMENTS ────────────────────────────────────────────────────────────
  console.log("Seeding documents...");
  const documentSpecs: {
    client: string;
    project?: string;
    title: string;
    type: string;
    url?: string;
    notes?: string;
    ageOffset: number;
  }[] = [
    { client: "Beacon & Co.", project: "Q3 Brand Refresh", title: "Master Services Agreement", type: "contract", url: "https://drive.example.com/beacon/msa.pdf", ageOffset: -420 },
    { client: "Beacon & Co.", project: "Q3 Brand Refresh", title: "Q3 Brand Refresh — Figma Workspace", type: "figma", url: "https://figma.com/file/beacon-brand-refresh", ageOffset: -55 },
    { client: "Beacon & Co.", project: "Investor Portal Redesign", title: "Portal Redesign — Figma Workspace", type: "figma", url: "https://figma.com/file/beacon-investor-portal", ageOffset: -50 },
    { client: "Beacon & Co.", title: "Q3 Invoice Packet (INV-1041, INV-1058)", type: "invoice", url: "https://drive.example.com/beacon/q3-invoices.pdf", ageOffset: -20 },
    { client: "Solace Wellness", project: "Studio Launch Website", title: "Studio Launch — Brand Assets Folder", type: "brand_assets", url: "https://drive.example.com/solace/brand-assets", ageOffset: -260 },
    { client: "Solace Wellness", project: "Studio Launch Website", title: "Site Content Google Doc", type: "google_drive", url: "https://docs.google.com/document/d/solace-content", ageOffset: -100 },
    { client: "Solace Wellness", project: "Studio Launch Website", title: "Launched Site — Live Link", type: "link", url: "https://solacewellness.co", ageOffset: -14 },
    { client: "Northfield Realty Group", title: "Signed Retainer Agreement", type: "contract", url: "https://drive.example.com/northfield/retainer.pdf", ageOffset: -190 },
    { client: "Northfield Realty Group", project: "Listing Site Overhaul", title: "Listing Site Wireframes — Figma", type: "figma", url: "https://figma.com/file/northfield-listings", ageOffset: -48 },
    { client: "Kepler Robotics", title: "Kepler MSA", type: "contract", url: "https://drive.example.com/kepler/msa.pdf", ageOffset: -95 },
    { client: "Kepler Robotics", project: "Technical Documentation Hub", title: "Docs Hub Architecture Spec", type: "design", url: "https://drive.example.com/kepler/architecture.pdf", ageOffset: -45 },
    { client: "Kepler Robotics", project: "Brand Identity & Pitch System", title: "Brand Identity Final Files (ZIP)", type: "brand_assets", url: "https://drive.example.com/kepler/brand-identity.zip", ageOffset: -9 },
    { client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", title: "Brand Questionnaire — Jules Fontaine", type: "google_drive", url: "https://docs.google.com/document/d/marrow-brand-q", ageOffset: -10 },
    { client: "Marrow Coffee Roasters", project: "Packaging & Brand Redesign", title: "Proposal — Packaging & Brand Redesign", type: "proposal", url: "https://drive.example.com/marrow/proposal.pdf", ageOffset: -12 },
  ];

  await db.insert(documentsTable).values(
    documentSpecs.map((d) => ({
      workspaceId: wsId,
      clientId: clientByName[d.client]!.id,
      projectId: d.project ? projectByName[d.project]!.id : null,
      title: d.title,
      type: d.type,
      url: d.url ?? null,
      notes: d.notes ?? null,
    }))
  );

  // ─── MEETINGS ─────────────────────────────────────────────────────────────
  console.log("Seeding meetings...");
  const meetingSpecs: {
    client: string;
    dateOffset: number;
    summary: string;
    actionItems?: string;
    nextOffset?: number;
  }[] = [
    { client: "Beacon & Co.", dateOffset: -10, summary: "Reviewed direction 4 refinements with Nora and Devon. Typography finalized; color palette approved with one tweak to the warm neutral.", actionItems: "Update neutral swatch and export updated deck template by EOD Friday.", nextOffset: 5 },
    { client: "Beacon & Co.", dateOffset: 5, summary: "Upcoming: present final brand guidelines + investor deck template." },
    { client: "Solace Wellness", dateOffset: -8, summary: "Prototype walkthrough with Marcus — approved overall structure. Requested intake form be reduced to 3 fields (name, email, goal).", actionItems: "Update prototype with simplified intake; share for final sign-off.", nextOffset: 6 },
    { client: "Solace Wellness", dateOffset: 6, summary: "Upcoming: final prototype review before dev handoff." },
    { client: "Northfield Realty Group", dateOffset: -35, summary: "Second status call on listing site. Elena confirmed content is delayed; MLS credentials still pending from internal IT.", actionItems: "Northfield IT to share MLS sandbox access by Aug 5. Follow up if no response." },
    { client: "Northfield Realty Group", dateOffset: -7, summary: "Recovery call — Elena apologized for delays. Committed to delivering photography and MLS credentials by Aug 12.", actionItems: "Book new kickoff for Aug 13 once credentials arrive. Send revised timeline." },
    { client: "Kepler Robotics", dateOffset: -7, summary: "Weekly technical sync with Priya and two firmware leads. Reviewed docs hub taxonomy; engineering team approved structure.", actionItems: "Sam to migrate first batch of firmware docs into the new hub by Aug 8.", nextOffset: 7 },
    { client: "Kepler Robotics", dateOffset: 7, summary: "Upcoming: weekly sync — docs hub pilot review with engineering." },
    { client: "Marrow Coffee Roasters", dateOffset: -10, summary: "Intro call and brand deep-dive with Jules. Explored packaging references and competitive examples. Very enthusiastic about bold, seasonal direction.", actionItems: "Send moodboard deck by Aug 12; schedule follow-up for Aug 14.", nextOffset: 9 },
    { client: "Marrow Coffee Roasters", dateOffset: 9, summary: "Upcoming: moodboard review and creative direction presentation." },
  ];

  await db.insert(meetingsTable).values(
    meetingSpecs.map((m) => ({
      workspaceId: wsId,
      clientId: clientByName[m.client]!.id,
      date: daysFrom(NOW, m.dateOffset),
      summary: m.summary,
      actionItems: m.actionItems ?? null,
      nextMeeting:
        m.nextOffset != null ? daysFrom(NOW, m.nextOffset) : null,
      attachments: null,
    }))
  );

  // ─── NOTES ────────────────────────────────────────────────────────────────
  console.log("Seeding notes...");
  const noteSpecs: {
    client?: string;
    project?: string;
    content: string;
    ageOffset: number;
  }[] = [
    { client: "Beacon & Co.", content: "Nora mentioned board presentation is Sep 1 — all brand guidelines must be final and in their hands by Aug 25 at the latest.", ageOffset: -10 },
    { client: "Beacon & Co.", project: "Investor Portal Redesign", content: "Devon is the day-to-day contact for the portal project but Nora makes all final approval decisions. Always CC both.", ageOffset: -14 },
    { client: "Solace Wellness", project: "App Onboarding Flow", content: "Marcus wants final say on all copy — route drafts directly to him, not the marketing coordinator. Response time is typically same-day.", ageOffset: -8 },
    { client: "Northfield Realty Group", content: "Three missed deadlines on content delivery. Consider proposing a revised contract amendment with a content-dependency clause to protect our timeline.", ageOffset: -4 },
    { client: "Kepler Robotics", project: "Technical Documentation Hub", content: "Engineering team uses Notion internally. The new docs hub must support MDX and match Notion's content taxonomy as closely as possible for smooth migration.", ageOffset: -9 },
    { client: "Kepler Robotics", project: "Brand Identity & Pitch System", content: "Priya's CEO wants the pitch deck brand to feel more premium and less 'startup-y'. Avoid gradients; lean into solid color blocks and strong type.", ageOffset: -20 },
    { client: "Marrow Coffee Roasters", content: "Jules mentioned wanting a limited-edition holiday packaging variant after the core redesign. Flag this as a potential upsell once the main project is underway.", ageOffset: -9 },
  ];

  await db.insert(notesTable).values(
    noteSpecs.map((n) => ({
      workspaceId: wsId,
      clientId: n.client ? clientByName[n.client]!.id : null,
      projectId: n.project ? projectByName[n.project]!.id : null,
      content: n.content,
      createdAt: daysFrom(NOW, n.ageOffset),
    }))
  );

  // ─── CAMPAIGNS ────────────────────────────────────────────────────────────
  console.log("Seeding campaigns...");

  const campaignSpecs = [
    {
      client: "Beacon & Co.",
      project: "Q3 Brand Refresh",
      name: "Q3 Investor Brand Campaign",
      type: "brand_awareness",
      goal: "Align Beacon's brand perception with the refreshed visual identity ahead of the Q3 investor materials release and board presentation.",
      budget: "22000",
      startDate: dateStr(daysFrom(NOW, -15)),
      endDate: dateStr(daysFrom(NOW, 35)),
      status: "active",
      performanceNotes: "Brand sentiment tracking live. Deck template in final review with Nora.",
    },
    {
      client: "Solace Wellness",
      project: "Studio Launch Website",
      name: "Studio Opening — Pre-Launch",
      type: "content_marketing",
      goal: "Build brand awareness and drive pre-launch bookings for the new River North studio through social and email.",
      budget: "8500",
      startDate: dateStr(daysFrom(NOW, -45)),
      endDate: dateStr(daysFrom(NOW, -10)),
      status: "completed",
      performanceNotes: "1,340 pre-launch signups. Email open rate 41%. Campaign wrapped at site launch.",
    },
    {
      client: "Kepler Robotics",
      project: "Brand Identity & Pitch System",
      name: "Kepler Series B Content Push",
      type: "email_marketing",
      goal: "Position Kepler as the category leader in industrial robotics ahead of Series B through targeted content and investor PR.",
      budget: "12000",
      startDate: dateStr(daysFrom(NOW, 10)),
      endDate: dateStr(daysFrom(NOW, 60)),
      status: "planning",
      performanceNotes: null,
    },
    {
      client: "Marrow Coffee Roasters",
      project: "Packaging & Brand Redesign",
      name: "New Packaging Collection Launch",
      type: "social_media",
      goal: "Announce the redesigned label system on Instagram and email with a limited-edition pre-order story.",
      budget: "5500",
      startDate: dateStr(daysFrom(NOW, 40)),
      endDate: dateStr(daysFrom(NOW, 80)),
      status: "planning",
      performanceNotes: null,
    },
  ] as const;

  await db.insert(campaignsTable).values(
    campaignSpecs.map((c) => ({
      workspaceId: wsId,
      clientId: clientByName[c.client]!.id,
      projectId: projectByName[c.project]!.id,
      name: c.name,
      type: c.type,
      goal: c.goal,
      budget: c.budget,
      startDate: c.startDate,
      endDate: c.endDate,
      status: c.status,
      performanceNotes: c.performanceNotes,
      results: null,
    }))
  );

  // ─── ACTIVITY FEED ────────────────────────────────────────────────────────
  // Types requested: client_added, task_completed, deliverable_approved, invoice_paid
  console.log("Seeding activity feed...");

  const activitySpecs: {
    type: string;
    entityType: string;
    description: string;
    client?: string;
    ageOffset: number;
  }[] = [
    // Recent — last 7 days
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-1080 ($9,500) paid by Beacon & Co. — July retainer received", client: "Beacon & Co.", ageOffset: -5 },
    { type: "task_completed", entityType: "task", description: 'Task completed: "Deliver high-fidelity mockups to Beacon & Co. stakeholders"', client: "Beacon & Co.", ageOffset: -6 },
    { type: "deliverable_approved", entityType: "deliverable", description: 'Deliverable approved: "Color & typography system guidelines" — Nora Whitfield', client: "Beacon & Co.", ageOffset: -12 },
    { type: "task_completed", entityType: "task", description: 'Task completed: "Design full identity system for Kepler Robotics"', client: "Kepler Robotics", ageOffset: -9 },
    { type: "deliverable_approved", entityType: "deliverable", description: 'Deliverable approved: "Brand identity system — final files" — Priya Raman', client: "Kepler Robotics", ageOffset: -7 },
    { type: "client_added", entityType: "client", description: 'New prospect added: "Marrow Coffee Roasters" — packaging & brand redesign', client: "Marrow Coffee Roasters", ageOffset: -12 },
    { type: "task_completed", entityType: "task", description: 'Task completed: "Intro call and brand questionnaire with Jules Fontaine"', client: "Marrow Coffee Roasters", ageOffset: -10 },
    { type: "payment_overdue", entityType: "payment", description: "Invoice INV-3041 ($3,800) overdue — Northfield Realty Group July retainer", client: "Northfield Realty Group", ageOffset: -1 },
    { type: "payment_overdue", entityType: "payment", description: "Invoice INV-3019 ($20,000) is 25 days overdue — Northfield Realty Group", client: "Northfield Realty Group", ageOffset: -3 },
    // Last 30 days
    { type: "deliverable_approved", entityType: "deliverable", description: 'Deliverable approved: "Onboarding audit report and recommendations" — Marcus Ibe', client: "Solace Wellness", ageOffset: -30 },
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-2034 ($13,000) paid — Solace Wellness App Onboarding milestone", client: "Solace Wellness", ageOffset: -29 },
    { type: "task_completed", entityType: "task", description: 'Task completed: "QA pass — accessibility, mobile, and performance" for Studio Launch Website', client: "Solace Wellness", ageOffset: -18 },
    { type: "deliverable_approved", entityType: "deliverable", description: 'Deliverable approved: "Launched production site — solacewellness.co is live"', client: "Solace Wellness", ageOffset: -14 },
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-2029 ($17,000) paid — Solace Wellness Studio Launch final milestone", client: "Solace Wellness", ageOffset: -22 },
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-4025 ($14,000) paid — Kepler Robotics Brand Identity milestone", client: "Kepler Robotics", ageOffset: -37 },
    { type: "task_completed", entityType: "task", description: 'Task completed: "Content architecture workshop with Kepler engineering leads"', client: "Kepler Robotics", ageOffset: -38 },
    { type: "deliverable_approved", entityType: "deliverable", description: 'Deliverable approved: "Wireframes — listing grid and map search" — Elena Vaccaro', client: "Northfield Realty Group", ageOffset: -45 },
    // Older history
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-4002 ($26,000) paid — Kepler Robotics Technical Documentation Hub deposit", client: "Kepler Robotics", ageOffset: -41 },
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-1058 ($15,000) paid — Beacon & Co. Brand Refresh milestone 2", client: "Beacon & Co.", ageOffset: -21 },
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-1041 ($15,000) paid — Beacon & Co. Brand Refresh milestone 1", client: "Beacon & Co.", ageOffset: -52 },
    { type: "task_completed", entityType: "task", description: 'Task completed: "Kick-off brand audit and competitor analysis" for Beacon & Co.', client: "Beacon & Co.", ageOffset: -58 },
    { type: "deliverable_approved", entityType: "deliverable", description: 'Deliverable approved: "Logo system exploration deck" — Nora Whitfield', client: "Beacon & Co.", ageOffset: -26 },
    { type: "invoice_paid", entityType: "payment", description: "Invoice INV-5003 ($5,700) paid — Marrow Coffee Roasters discovery deposit", client: "Marrow Coffee Roasters", ageOffset: -7 },
    // Client onboarding history
    { type: "client_added", entityType: "client", description: 'New client onboarded: "Beacon & Co." — long-term retainer agreed', client: "Beacon & Co.", ageOffset: -420 },
    { type: "client_added", entityType: "client", description: 'New client onboarded: "Solace Wellness" — studio rebrand & web project', client: "Solace Wellness", ageOffset: -260 },
    { type: "client_added", entityType: "client", description: 'New client onboarded: "Northfield Realty Group" — listing site overhaul', client: "Northfield Realty Group", ageOffset: -190 },
    { type: "client_added", entityType: "client", description: 'New client onboarded: "Kepler Robotics" — enterprise docs hub + brand identity', client: "Kepler Robotics", ageOffset: -95 },
  ];

  await db.insert(activityTable).values(
    activitySpecs.map((a) => ({
      workspaceId: wsId,
      type: a.type,
      entityType: a.entityType,
      entityId: null,
      description: a.description,
      clientId: a.client ? clientByName[a.client]!.id : null,
      createdAt: daysFrom(NOW, a.ageOffset),
    }))
  );

  // ─── TEAM MEMBERS ─────────────────────────────────────────────────────────
  console.log("Seeding team members...");
  const teamMembers = [
    { name: "Maya Chen",   email: "maya@velocitycreative.co",  role: "member" },
    { name: "Theo Brandt", email: "theo@velocitycreative.co",  role: "member" },
    { name: "Priya Nadar", email: "priya@velocitycreative.co", role: "member" },
    { name: "Sam Okoye",   email: "sam@velocitycreative.co",   role: "member" },
  ];

  for (const member of teamMembers) {
    const [existing] = await db
      .select({ id: usersTable.id })
      .from(usersTable)
      .where(eq(usersTable.email, member.email))
      .limit(1);
    if (!existing) {
      const passwordHash = bcrypt.hashSync("member123", 10);
      await db.insert(usersTable).values({
        name: member.name,
        email: member.email,
        passwordHash,
        role: member.role,
        workspaceId: wsId,
        isEmailVerified: true,
      });
    }
  }

  // ─── AGENCY SETTINGS ──────────────────────────────────────────────────────
  console.log("Updating agency settings...");
  await db
    .update(agencySettingsTable)
    .set({
      agencyName: "Velocity Creative Agency",
      agencyEmail: "hello@velocitycreative.co",
      supportEmail: "support@velocitycreative.co",
      website: "https://velocitycreative.co",
      businessType: "digital-agency",
      agencyType: "Brand, Web & Campaign",
      teamSize: "2-10",
      mainServices: "Brand Identity, Web Design, Digital Campaigns",
      activeClientCount: "5",
      defaultCurrency: "USD",
      invoicePrefix: "INV",
      paymentTermsDays: 30,
      onboardingCompleted: true,
    })
    .where(eq(agencySettingsTable.workspaceId, wsId));

  console.log("Seed complete ✓");

  // ─── ADMIN USER (idempotent) ───────────────────────────────────────────────
  console.log("Ensuring default admin user...");
  const [existingAdmin] = await db
    .select({ id: usersTable.id })
    .from(usersTable)
    .where(eq(usersTable.email, "admin@autflow.io"))
    .limit(1);

  if (!existingAdmin) {
    const passwordHash = bcrypt.hashSync("admin123", 12);
    await db.insert(usersTable).values({
      name: "Alex Rivera",
      email: "admin@autflow.io",
      passwordHash,
      role: "owner",
      workspaceId: wsId,
      isEmailVerified: true,
    });
    console.log("Created admin user: admin@autflow.io / admin123");
  } else {
    await db
      .update(usersTable)
      .set({ name: "Alex Rivera" })
      .where(eq(usersTable.email, "admin@autflow.io"));
    console.log("Admin user confirmed: admin@autflow.io / admin123");
  }
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(async () => {
    await pool.end();
  });
