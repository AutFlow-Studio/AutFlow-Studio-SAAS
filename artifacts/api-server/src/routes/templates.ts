// Business template seeder — applies structured sample data to a workspace so
// new users can start immediately with a professional, realistic dataset.
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
} from "@workspace/db";
import { requireAuth } from "../middleware/auth";
import { sql } from "drizzle-orm";

const router: IRouter = Router();

// ── Helpers ──────────────────────────────────────────────────────────────────

const NOW = new Date();

function daysFrom(base: Date, offset: number): Date {
  return new Date(base.getTime() + offset * 24 * 60 * 60 * 1000);
}
function dateStr(d: Date): string {
  return d.toISOString().split("T")[0]!;
}

// ── Template metadata (returned by GET /api/templates) ────────────────────────

export const TEMPLATE_META = [
  {
    id: "digital-agency",
    name: "Digital Agency",
    tagline: "Clients, projects & campaigns — ready on day one",
    description: "A full creative agency setup with retainer clients, active design & development projects, invoicing cadence, and team tasks.",
    icon: "Palette",
    color: "violet",
    includes: ["4 active clients with retainer & project billing", "5 projects across branding, web & campaigns", "Deliverables, tasks & payment schedules", "Meeting logs & team notes"],
    clientCount: 4,
    projectCount: 5,
  },
  {
    id: "consulting",
    name: "Consulting Business",
    tagline: "Engagements, reports & advisory — structured for impact",
    description: "Built for independent consultants and boutique firms: enterprise clients, strategic engagements, board-ready reports, and consulting invoices.",
    icon: "Briefcase",
    color: "blue",
    includes: ["4 enterprise clients with advisory retainers", "5 consulting engagements & strategy projects", "Reports, deliverables & meeting notes", "Invoice tracking & follow-up tasks"],
    clientCount: 4,
    projectCount: 5,
  },
  {
    id: "clinic",
    name: "Clinic / Healthcare",
    tagline: "Appointments, follow-ups & revenue — all in one place",
    description: "Designed for clinics, wellness centers, and private practices: patient/partner management, appointment scheduling, follow-up workflows, and revenue tracking.",
    icon: "Heart",
    color: "rose",
    includes: ["4 client partners & patient cohorts", "Appointment-based project workflow", "Follow-up tasks & care notes", "Session billing & payment tracking"],
    clientCount: 4,
    projectCount: 4,
  },
  {
    id: "freelancer",
    name: "Freelancer",
    tagline: "Project workflow, invoices & client comms — simplified",
    description: "Lean setup for solo freelancers: a small roster of active clients, project-by-project billing, task lists, and straightforward invoicing.",
    icon: "Laptop",
    color: "amber",
    includes: ["3 clients across design, web & content", "4 active freelance projects", "Task lists & deadline tracking", "Project invoices & payment history"],
    clientCount: 3,
    projectCount: 4,
  },
  {
    id: "generic",
    name: "Generic Business",
    tagline: "A balanced starting point for any service business",
    description: "A versatile template for service businesses of any kind: mixed-industry clients, varied project types, and a full suite of sample data to explore every feature.",
    icon: "Building2",
    color: "emerald",
    includes: ["4 clients across mixed industries", "5 projects of varied service types", "Full activity feed & document library", "Notifications, meetings & payment samples"],
    clientCount: 4,
    projectCount: 5,
  },
];

// ── Template data builders ────────────────────────────────────────────────────

async function applyDigitalAgency(wid: number) {
  // ── Clients ──
  const clientRows = await db.insert(clientsTable).values([
    {
      workspaceId: wid,
      companyName: "Vertex Digital",
      industry: "Technology",
      website: "https://vertexdigital.io",
      email: "hello@vertexdigital.io",
      phone: "+1 (415) 555-0201",
      primaryContact: "Sara Kim",
      secondaryContact: "Raj Anand",
      address: "1 Market Plaza, San Francisco, CA",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -180)),
      contractValue: "120000",
      monthlyRetainer: "8500",
      paymentMethod: "ACH",
      notes: "Seed-stage startup scaling fast. Monthly retainer for brand & digital. Sara approves all creative.",
      tags: ["retainer", "startup", "vip"],
    },
    {
      workspaceId: wid,
      companyName: "Lumen Commerce",
      industry: "E-commerce",
      website: "https://lumencommerce.co",
      email: "ops@lumencommerce.co",
      phone: "+1 (212) 555-0144",
      primaryContact: "Diego Reyes",
      secondaryContact: null,
      address: "350 Fifth Ave, New York, NY",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -90)),
      contractValue: "58000",
      monthlyRetainer: null,
      paymentMethod: "Credit Card",
      notes: "CRO + UX project. Diego moves fast and expects weekly progress updates.",
      tags: ["cro", "e-commerce"],
    },
    {
      workspaceId: wid,
      companyName: "Catalyst PR",
      industry: "Public Relations",
      website: "https://catalystpr.com",
      email: "studio@catalystpr.com",
      phone: "+1 (312) 555-0188",
      primaryContact: "Monica Aldridge",
      secondaryContact: "Ben Tran",
      address: "200 W Madison St, Chicago, IL",
      timezone: "America/Chicago",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -240)),
      contractValue: "72000",
      monthlyRetainer: "5500",
      paymentMethod: "ACH",
      notes: "Long-term relationship. Full website relaunch plus ongoing retainer for digital PR collateral.",
      tags: ["retainer", "long-term"],
    },
    {
      workspaceId: wid,
      companyName: "NexGen Studios",
      industry: "Entertainment",
      website: "https://nexgenstudios.com",
      email: "marketing@nexgenstudios.com",
      phone: "+1 (424) 555-0177",
      primaryContact: "Alex Torres",
      secondaryContact: null,
      address: "6255 Sunset Blvd, Los Angeles, CA",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -45)),
      contractValue: "35000",
      monthlyRetainer: null,
      paymentMethod: "Wire Transfer",
      notes: "Game studio launching a new title. Microsite + campaign assets. Hard deadline tied to launch date.",
      tags: ["campaign", "deadline-driven"],
    },
  ]).returning();

  const c = Object.fromEntries(clientRows.map((r) => [r.companyName, r]));

  // ── Projects ──
  const projectRows = await db.insert(projectsTable).values([
    {
      workspaceId: wid,
      clientId: c["Vertex Digital"]!.id,
      name: "Brand Identity System",
      status: "development",
      priority: "high",
      progress: 60,
      startDate: dateStr(daysFrom(NOW, -60)),
      deadline: dateStr(daysFrom(NOW, 30)),
      estimatedBudget: "48000",
      actualCost: "28800",
      revenue: "48000",
      description: "Full brand identity — logo system, color palette, typography, and guidelines PDF.",
    },
    {
      workspaceId: wid,
      clientId: c["Vertex Digital"]!.id,
      name: "Marketing Website Redesign",
      status: "planning",
      priority: "medium",
      progress: 10,
      startDate: dateStr(daysFrom(NOW, -10)),
      deadline: dateStr(daysFrom(NOW, 75)),
      estimatedBudget: "42000",
      actualCost: "3200",
      revenue: null,
      description: "Redesign and rebuild of vertexdigital.io on Webflow. Brand system gates this project.",
    },
    {
      workspaceId: wid,
      clientId: c["Lumen Commerce"]!.id,
      name: "CRO & UX Optimization Sprint",
      status: "development",
      priority: "urgent",
      progress: 75,
      startDate: dateStr(daysFrom(NOW, -45)),
      deadline: dateStr(daysFrom(NOW, 10)),
      estimatedBudget: "28000",
      actualCost: "20400",
      revenue: "28000",
      description: "Conversion rate optimization across checkout flow and product pages.",
    },
    {
      workspaceId: wid,
      clientId: c["Catalyst PR"]!.id,
      name: "PR Firm Website Relaunch",
      status: "review",
      priority: "high",
      progress: 88,
      startDate: dateStr(daysFrom(NOW, -90)),
      deadline: dateStr(daysFrom(NOW, 7)),
      estimatedBudget: "36000",
      actualCost: "31500",
      revenue: "36000",
      description: "Full site relaunch with case study CMS, team bios, and PR newsroom section.",
    },
    {
      workspaceId: wid,
      clientId: c["NexGen Studios"]!.id,
      name: "Game Launch Campaign Microsite",
      status: "design",
      priority: "urgent",
      progress: 40,
      startDate: dateStr(daysFrom(NOW, -20)),
      deadline: dateStr(daysFrom(NOW, 18)),
      estimatedBudget: "35000",
      actualCost: "13200",
      revenue: "35000",
      description: "High-impact microsite for game launch. Countdown, trailer embed, and Steam link.",
    },
  ]).returning();

  const p = Object.fromEntries(projectRows.map((r) => [r.name, r]));

  // ── Deliverables ──
  await db.insert(deliverablesTable).values([
    { projectId: p["Brand Identity System"]!.id, title: "Logo mark & wordmark exploration", status: "done", deadline: dateStr(daysFrom(NOW, -30)), assignedTo: "Maya Chen", completionDate: dateStr(daysFrom(NOW, -28)) },
    { projectId: p["Brand Identity System"]!.id, title: "Color palette & typography system", status: "done", deadline: dateStr(daysFrom(NOW, -10)), assignedTo: "Maya Chen", completionDate: dateStr(daysFrom(NOW, -9)) },
    { projectId: p["Brand Identity System"]!.id, title: "Brand guidelines PDF (v1 draft)", status: "in_progress", deadline: dateStr(daysFrom(NOW, 14)), assignedTo: "Theo Brandt" },
    { projectId: p["CRO & UX Optimization Sprint"]!.id, title: "Checkout flow audit & heatmap analysis", status: "done", deadline: dateStr(daysFrom(NOW, -20)), assignedTo: "Priya Nadar", completionDate: dateStr(daysFrom(NOW, -19)) },
    { projectId: p["CRO & UX Optimization Sprint"]!.id, title: "Redesigned checkout UI (Figma)", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), assignedTo: "Theo Brandt" },
    { projectId: p["PR Firm Website Relaunch"]!.id, title: "Final site build & QA pass", status: "review", deadline: dateStr(daysFrom(NOW, 4)), assignedTo: "Sam Okoye" },
    { projectId: p["Game Launch Campaign Microsite"]!.id, title: "Homepage hero concept", status: "in_progress", deadline: dateStr(daysFrom(NOW, 8)), assignedTo: "Maya Chen" },
  ]);

  // ── Payments ──
  await db.insert(paymentsTable).values([
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, projectId: p["Brand Identity System"]!.id, invoiceNumber: "INV-1001", amount: "24000", status: "paid", dueDate: dateStr(daysFrom(NOW, -40)), paidDate: dateStr(daysFrom(NOW, -41)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, projectId: p["Brand Identity System"]!.id, invoiceNumber: "INV-1002", amount: "24000", status: "pending", dueDate: dateStr(daysFrom(NOW, 14)), remainingBalance: "24000" },
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, invoiceNumber: "INV-1003", amount: "8500", status: "pending", dueDate: dateStr(daysFrom(NOW, 5)), paymentMethod: "ACH", remainingBalance: "8500" },
    { workspaceId: wid, clientId: c["Lumen Commerce"]!.id, projectId: p["CRO & UX Optimization Sprint"]!.id, invoiceNumber: "INV-2001", amount: "14000", status: "paid", dueDate: dateStr(daysFrom(NOW, -30)), paidDate: dateStr(daysFrom(NOW, -31)), paymentMethod: "Credit Card", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Lumen Commerce"]!.id, projectId: p["CRO & UX Optimization Sprint"]!.id, invoiceNumber: "INV-2002", amount: "14000", status: "pending", dueDate: dateStr(daysFrom(NOW, 8)), remainingBalance: "14000" },
    { workspaceId: wid, clientId: c["Catalyst PR"]!.id, projectId: p["PR Firm Website Relaunch"]!.id, invoiceNumber: "INV-3001", amount: "18000", status: "paid", dueDate: dateStr(daysFrom(NOW, -60)), paidDate: dateStr(daysFrom(NOW, -62)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Catalyst PR"]!.id, projectId: p["PR Firm Website Relaunch"]!.id, invoiceNumber: "INV-3002", amount: "18000", status: "pending", dueDate: dateStr(daysFrom(NOW, 6)), remainingBalance: "18000" },
    { workspaceId: wid, clientId: c["NexGen Studios"]!.id, projectId: p["Game Launch Campaign Microsite"]!.id, invoiceNumber: "INV-4001", amount: "17500", status: "paid", dueDate: dateStr(daysFrom(NOW, -15)), paidDate: dateStr(daysFrom(NOW, -14)), paymentMethod: "Wire Transfer", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["NexGen Studios"]!.id, projectId: p["Game Launch Campaign Microsite"]!.id, invoiceNumber: "INV-4002", amount: "17500", status: "pending", dueDate: dateStr(daysFrom(NOW, 16)), remainingBalance: "17500" },
  ]);

  // ── Documents ──
  await db.insert(documentsTable).values([
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, projectId: p["Brand Identity System"]!.id, title: "Brand Identity Figma File", type: "figma", url: "https://figma.com/file/vertex-brand-identity", notes: null },
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, title: "Master Services Agreement", type: "contract", url: "https://drive.example.com/vertex/msa.pdf", notes: null },
    { workspaceId: wid, clientId: c["Lumen Commerce"]!.id, projectId: p["CRO & UX Optimization Sprint"]!.id, title: "CRO Audit Report", type: "design", url: "https://drive.example.com/lumen/cro-audit.pdf", notes: null },
    { workspaceId: wid, clientId: c["Catalyst PR"]!.id, projectId: p["PR Firm Website Relaunch"]!.id, title: "Website Content Google Doc", type: "google_drive", url: "https://docs.google.com/document/d/catalyst-content", notes: "Final copy approved by Monica." },
    { workspaceId: wid, clientId: c["NexGen Studios"]!.id, projectId: p["Game Launch Campaign Microsite"]!.id, title: "Campaign Creative Brief", type: "proposal", url: "https://drive.example.com/nexgen/brief.pdf", notes: null },
  ]);

  // ── Meetings ──
  await db.insert(meetingsTable).values([
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, date: daysFrom(NOW, -7), summary: "Brand direction review — Sara approved directions 2 and 3, requested refinement on color temperature.", actionItems: "Refine warm palette variant; present final shortlist by Friday.", nextMeeting: daysFrom(NOW, 7) },
    { workspaceId: wid, clientId: c["Lumen Commerce"]!.id, date: daysFrom(NOW, -3), summary: "Checkout redesign walkthrough — Diego approved mobile layout; desktop nav needs adjustment.", actionItems: "Revise desktop nav spacing; update Figma prototype.", nextMeeting: daysFrom(NOW, 7) },
    { workspaceId: wid, clientId: c["Catalyst PR"]!.id, date: daysFrom(NOW, -5), summary: "Pre-launch QA review — site is 95% ready, Monica flagged two copy changes on team page.", actionItems: "Update team bios; run final cross-browser QA.", nextMeeting: daysFrom(NOW, 5) },
    { workspaceId: wid, clientId: c["NexGen Studios"]!.id, date: daysFrom(NOW, -2), summary: "Kickoff call — Alex shared game trailer and key messaging. Agreed on dark, cinematic visual direction.", actionItems: "Produce 3 hero concept directions for review.", nextMeeting: daysFrom(NOW, 8) },
  ]);

  // ── Notes ──
  await db.insert(notesTable).values([
    { workspaceId: wid, clientId: c["Vertex Digital"]!.id, content: "Sara's board presentation is August 15th — brand guidelines and deck template must be finalized by August 8th at the latest.", createdAt: daysFrom(NOW, -5) },
    { workspaceId: wid, clientId: c["Lumen Commerce"]!.id, projectId: p["CRO & UX Optimization Sprint"]!.id, content: "Heatmap data showed 68% of users drop at the shipping cost reveal. Transparency-first redesign is the right call.", createdAt: daysFrom(NOW, -20) },
    { workspaceId: wid, clientId: c["NexGen Studios"]!.id, content: "Alex mentioned the game title can be disclosed after NDAs are signed. Keep launch comms locked until then.", createdAt: daysFrom(NOW, -2) },
  ]);

  // ── Tasks ──
  await db.insert(tasksTable).values([
    { workspaceId: wid, title: "Finalize brand color palette (warm variant)", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 3)), clientId: c["Vertex Digital"]!.id, projectId: p["Brand Identity System"]!.id },
    { workspaceId: wid, title: "Export brand guidelines PDF draft for client review", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 14)), clientId: c["Vertex Digital"]!.id, projectId: p["Brand Identity System"]!.id },
    { workspaceId: wid, title: "Revise desktop nav spacing on checkout redesign", priority: "urgent", status: "in_progress", deadline: dateStr(daysFrom(NOW, 2)), clientId: c["Lumen Commerce"]!.id, projectId: p["CRO & UX Optimization Sprint"]!.id },
    { workspaceId: wid, title: "Fix team bios copy on Catalyst PR site", priority: "high", status: "todo", deadline: dateStr(daysFrom(NOW, 2)), clientId: c["Catalyst PR"]!.id, projectId: p["PR Firm Website Relaunch"]!.id },
    { workspaceId: wid, title: "Produce 3 hero concept directions for NexGen microsite", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), clientId: c["NexGen Studios"]!.id, projectId: p["Game Launch Campaign Microsite"]!.id },
    { workspaceId: wid, title: "Send Q3 retainer invoices (Vertex + Catalyst)", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 5)) },
    { workspaceId: wid, title: "Update agency capacity planner for Q4", priority: "low", status: "todo", deadline: dateStr(daysFrom(NOW, 14)) },
  ]);

  // ── Activity ──
  await db.insert(activityTable).values([
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Vertex Digital" onboarded', clientId: c["Vertex Digital"]!.id, createdAt: daysFrom(NOW, -180) },
    { workspaceId: wid, type: "project_created", entityType: "project", description: 'Project "Brand Identity System" kicked off', clientId: c["Vertex Digital"]!.id, createdAt: daysFrom(NOW, -60) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Payment of $24,000 received (INV-1001)", clientId: c["Vertex Digital"]!.id, createdAt: daysFrom(NOW, -41) },
    { workspaceId: wid, type: "project_created", entityType: "project", description: 'Project "CRO & UX Optimization Sprint" started', clientId: c["Lumen Commerce"]!.id, createdAt: daysFrom(NOW, -45) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Payment of $14,000 received (INV-2001)", clientId: c["Lumen Commerce"]!.id, createdAt: daysFrom(NOW, -31) },
    { workspaceId: wid, type: "project_updated", entityType: "project", description: 'Project "PR Firm Website Relaunch" moved to review', clientId: c["Catalyst PR"]!.id, createdAt: daysFrom(NOW, -3) },
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "NexGen Studios" onboarded', clientId: c["NexGen Studios"]!.id, createdAt: daysFrom(NOW, -45) },
    { workspaceId: wid, type: "project_created", entityType: "project", description: 'Project "Game Launch Campaign Microsite" kicked off', clientId: c["NexGen Studios"]!.id, createdAt: daysFrom(NOW, -20) },
  ]);
}

async function applyConsulting(wid: number) {
  const clientRows = await db.insert(clientsTable).values([
    {
      workspaceId: wid,
      companyName: "Meridian Capital Group",
      industry: "Financial Services",
      website: "https://meridiancapital.com",
      email: "strategy@meridiancapital.com",
      phone: "+1 (212) 555-0310",
      primaryContact: "Victoria Chen",
      secondaryContact: "James Harlow",
      address: "1 World Trade Center, New York, NY",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -200)),
      contractValue: "240000",
      monthlyRetainer: "18000",
      paymentMethod: "Wire Transfer",
      notes: "Strategic advisory retainer. Quarterly board presentations required. Victoria is the main decision-maker.",
      tags: ["retainer", "vip", "advisory"],
    },
    {
      workspaceId: wid,
      companyName: "Fortis Manufacturing",
      industry: "Manufacturing",
      website: "https://fortismfg.com",
      email: "coo@fortismfg.com",
      phone: "+1 (313) 555-0244",
      primaryContact: "Robert Kusiek",
      secondaryContact: "Dana Prewitt",
      address: "700 Industrial Pkwy, Detroit, MI",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -120)),
      contractValue: "185000",
      monthlyRetainer: null,
      paymentMethod: "ACH",
      notes: "Operational efficiency program. Robert is hands-on and expects weekly written status updates.",
      tags: ["operations", "enterprise"],
    },
    {
      workspaceId: wid,
      companyName: "Apex Pharmaceuticals",
      industry: "Healthcare & Life Sciences",
      website: "https://apexpharma.com",
      email: "compliance@apexpharma.com",
      phone: "+1 (617) 555-0189",
      primaryContact: "Dr. Susan Albright",
      secondaryContact: "Marc Delacroix",
      address: "200 Longwood Ave, Boston, MA",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -80)),
      contractValue: "95000",
      monthlyRetainer: null,
      paymentMethod: "ACH",
      notes: "Regulatory compliance framework review ahead of FDA audit. Hard deadline — audit is in 10 weeks.",
      tags: ["compliance", "deadline-driven"],
    },
    {
      workspaceId: wid,
      companyName: "Thornwood Retail Group",
      industry: "Retail",
      website: "https://thornwoodretail.com",
      email: "strategy@thornwoodretail.com",
      phone: "+1 (404) 555-0166",
      primaryContact: "Henry Park",
      secondaryContact: null,
      address: "1201 Peachtree St, Atlanta, GA",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -30)),
      contractValue: "72000",
      monthlyRetainer: null,
      paymentMethod: "Check",
      notes: "Digital transformation roadmap for their 80-store retail chain. Early stage — still in discovery.",
      tags: ["digital-transformation"],
    },
  ]).returning();

  const c = Object.fromEntries(clientRows.map((r) => [r.companyName, r]));

  const projectRows = await db.insert(projectsTable).values([
    {
      workspaceId: wid,
      clientId: c["Meridian Capital Group"]!.id,
      name: "Strategic Growth Advisory Q3",
      status: "development",
      priority: "high",
      progress: 55,
      startDate: dateStr(daysFrom(NOW, -60)),
      deadline: dateStr(daysFrom(NOW, 45)),
      estimatedBudget: "72000",
      actualCost: "36500",
      revenue: "72000",
      description: "Quarterly strategic advisory engagement. Includes market analysis, competitor benchmarking, and board-ready recommendations.",
    },
    {
      workspaceId: wid,
      clientId: c["Meridian Capital Group"]!.id,
      name: "Board Presentation — Q3 Report",
      status: "design",
      priority: "urgent",
      progress: 35,
      startDate: dateStr(daysFrom(NOW, -14)),
      deadline: dateStr(daysFrom(NOW, 12)),
      estimatedBudget: "18000",
      actualCost: "5400",
      revenue: "18000",
      description: "Executive-ready board presentation deck with financials, strategic KPIs, and recommendations.",
    },
    {
      workspaceId: wid,
      clientId: c["Fortis Manufacturing"]!.id,
      name: "Operations Excellence Program",
      status: "development",
      priority: "high",
      progress: 70,
      startDate: dateStr(daysFrom(NOW, -90)),
      deadline: dateStr(daysFrom(NOW, 25)),
      estimatedBudget: "110000",
      actualCost: "74800",
      revenue: "110000",
      description: "End-to-end operational efficiency review across 3 manufacturing plants. Process mapping, waste identification, and improvement roadmap.",
    },
    {
      workspaceId: wid,
      clientId: c["Apex Pharmaceuticals"]!.id,
      name: "FDA Compliance Framework Review",
      status: "review",
      priority: "urgent",
      progress: 90,
      startDate: dateStr(daysFrom(NOW, -70)),
      deadline: dateStr(daysFrom(NOW, 8)),
      estimatedBudget: "95000",
      actualCost: "87500",
      revenue: "95000",
      description: "Full compliance framework audit and gap analysis ahead of scheduled FDA inspection.",
    },
    {
      workspaceId: wid,
      clientId: c["Thornwood Retail Group"]!.id,
      name: "Digital Transformation Roadmap",
      status: "planning",
      priority: "medium",
      progress: 15,
      startDate: dateStr(daysFrom(NOW, -20)),
      deadline: dateStr(daysFrom(NOW, 80)),
      estimatedBudget: "72000",
      actualCost: "8200",
      revenue: null,
      description: "Discovery and roadmap for digital modernization across store operations, e-commerce, and customer data.",
    },
  ]).returning();

  const p = Object.fromEntries(projectRows.map((r) => [r.name, r]));

  await db.insert(deliverablesTable).values([
    { projectId: p["Strategic Growth Advisory Q3"]!.id, title: "Market landscape analysis", status: "done", deadline: dateStr(daysFrom(NOW, -30)), assignedTo: "You", completionDate: dateStr(daysFrom(NOW, -29)) },
    { projectId: p["Strategic Growth Advisory Q3"]!.id, title: "Competitor benchmarking report", status: "in_progress", deadline: dateStr(daysFrom(NOW, 10)), assignedTo: "You" },
    { projectId: p["Board Presentation — Q3 Report"]!.id, title: "Executive deck draft (v1)", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), assignedTo: "You" },
    { projectId: p["Operations Excellence Program"]!.id, title: "Plant 1 process mapping", status: "done", deadline: dateStr(daysFrom(NOW, -40)), assignedTo: "You", completionDate: dateStr(daysFrom(NOW, -38)) },
    { projectId: p["Operations Excellence Program"]!.id, title: "Improvement roadmap & ROI model", status: "in_progress", deadline: dateStr(daysFrom(NOW, 15)), assignedTo: "You" },
    { projectId: p["FDA Compliance Framework Review"]!.id, title: "Gap analysis report (final)", status: "review", deadline: dateStr(daysFrom(NOW, 4)), assignedTo: "You" },
    { projectId: p["Digital Transformation Roadmap"]!.id, title: "Discovery interviews — store managers", status: "in_progress", deadline: dateStr(daysFrom(NOW, 20)), assignedTo: "You" },
  ]);

  await db.insert(paymentsTable).values([
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, projectId: p["Strategic Growth Advisory Q3"]!.id, invoiceNumber: "INV-1001", amount: "36000", status: "paid", dueDate: dateStr(daysFrom(NOW, -45)), paidDate: dateStr(daysFrom(NOW, -44)), paymentMethod: "Wire Transfer", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, projectId: p["Strategic Growth Advisory Q3"]!.id, invoiceNumber: "INV-1002", amount: "36000", status: "pending", dueDate: dateStr(daysFrom(NOW, 20)), remainingBalance: "36000" },
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, invoiceNumber: "INV-1003", amount: "18000", status: "pending", dueDate: dateStr(daysFrom(NOW, 5)), paymentMethod: "Wire Transfer", remainingBalance: "18000" },
    { workspaceId: wid, clientId: c["Fortis Manufacturing"]!.id, projectId: p["Operations Excellence Program"]!.id, invoiceNumber: "INV-2001", amount: "55000", status: "paid", dueDate: dateStr(daysFrom(NOW, -50)), paidDate: dateStr(daysFrom(NOW, -52)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Fortis Manufacturing"]!.id, projectId: p["Operations Excellence Program"]!.id, invoiceNumber: "INV-2002", amount: "55000", status: "pending", dueDate: dateStr(daysFrom(NOW, 20)), remainingBalance: "55000" },
    { workspaceId: wid, clientId: c["Apex Pharmaceuticals"]!.id, projectId: p["FDA Compliance Framework Review"]!.id, invoiceNumber: "INV-3001", amount: "47500", status: "paid", dueDate: dateStr(daysFrom(NOW, -35)), paidDate: dateStr(daysFrom(NOW, -36)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Apex Pharmaceuticals"]!.id, projectId: p["FDA Compliance Framework Review"]!.id, invoiceNumber: "INV-3002", amount: "47500", status: "pending", dueDate: dateStr(daysFrom(NOW, 7)), remainingBalance: "47500" },
  ]);

  await db.insert(documentsTable).values([
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, projectId: p["Strategic Growth Advisory Q3"]!.id, title: "Market Landscape Analysis Report", type: "design", url: "https://drive.example.com/meridian/market-analysis.pdf", notes: "Approved by Victoria — cleared to share with board." },
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, title: "Advisory Services Agreement", type: "contract", url: "https://drive.example.com/meridian/agreement.pdf", notes: null },
    { workspaceId: wid, clientId: c["Fortis Manufacturing"]!.id, projectId: p["Operations Excellence Program"]!.id, title: "Plant 1 Process Maps (Visio)", type: "design", url: "https://drive.example.com/fortis/plant1-maps.pdf", notes: null },
    { workspaceId: wid, clientId: c["Apex Pharmaceuticals"]!.id, projectId: p["FDA Compliance Framework Review"]!.id, title: "FDA Compliance Gap Analysis Draft", type: "design", url: "https://drive.example.com/apex/compliance-draft.pdf", notes: "Under NDA. Do not distribute externally." },
    { workspaceId: wid, clientId: c["Thornwood Retail Group"]!.id, title: "Project Proposal & SOW", type: "proposal", url: "https://drive.example.com/thornwood/proposal.pdf", notes: null },
  ]);

  await db.insert(meetingsTable).values([
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, date: daysFrom(NOW, -7), summary: "Q3 strategy review — Victoria confirmed priority on Southeast Asia expansion. Board deck needs a dedicated section.", actionItems: "Add SEA market slide; reframe competitive moat section.", nextMeeting: daysFrom(NOW, 12) },
    { workspaceId: wid, clientId: c["Fortis Manufacturing"]!.id, date: daysFrom(NOW, -5), summary: "Plant 2 and Plant 3 walkthroughs complete. Key bottleneck identified: shift handover process causing 18% throughput loss.", actionItems: "Model ROI of standardized handover protocol.", nextMeeting: daysFrom(NOW, 7) },
    { workspaceId: wid, clientId: c["Apex Pharmaceuticals"]!.id, date: daysFrom(NOW, -3), summary: "Final compliance review walk-through with Dr. Albright. Two open items in QC documentation require remediation before audit.", actionItems: "Draft remediation plan for QC items; schedule follow-up for sign-off.", nextMeeting: daysFrom(NOW, 6) },
    { workspaceId: wid, clientId: c["Thornwood Retail Group"]!.id, date: daysFrom(NOW, -10), summary: "Discovery kickoff — interviewed 4 store managers and 2 regional directors. E-commerce integration and inventory visibility are top pain points.", actionItems: "Synthesize interview findings; create priority matrix.", nextMeeting: daysFrom(NOW, 10) },
  ]);

  await db.insert(notesTable).values([
    { workspaceId: wid, clientId: c["Meridian Capital Group"]!.id, content: "Victoria's board meeting is September 12th. She needs the final deck 5 business days before — no exceptions.", createdAt: daysFrom(NOW, -7) },
    { workspaceId: wid, clientId: c["Fortis Manufacturing"]!.id, content: "Robert prefers written weekly updates every Friday by 5 PM EST. He does not read slide decks — use plain-text executive summaries.", createdAt: daysFrom(NOW, -30) },
    { workspaceId: wid, clientId: c["Apex Pharmaceuticals"]!.id, content: "FDA audit window is 10 weeks out. Gap analysis must be final and remediated before then. No slippage tolerated.", createdAt: daysFrom(NOW, -14) },
  ]);

  await db.insert(tasksTable).values([
    { workspaceId: wid, title: "Complete competitor benchmarking report", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 10)), clientId: c["Meridian Capital Group"]!.id, projectId: p["Strategic Growth Advisory Q3"]!.id },
    { workspaceId: wid, title: "Draft Q3 board presentation deck (v1)", priority: "urgent", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), clientId: c["Meridian Capital Group"]!.id, projectId: p["Board Presentation — Q3 Report"]!.id },
    { workspaceId: wid, title: "Model ROI for standardized shift handover", priority: "high", status: "todo", deadline: dateStr(daysFrom(NOW, 7)), clientId: c["Fortis Manufacturing"]!.id, projectId: p["Operations Excellence Program"]!.id },
    { workspaceId: wid, title: "Draft QC documentation remediation plan", priority: "urgent", status: "todo", deadline: dateStr(daysFrom(NOW, 4)), clientId: c["Apex Pharmaceuticals"]!.id, projectId: p["FDA Compliance Framework Review"]!.id },
    { workspaceId: wid, title: "Synthesize Thornwood discovery interviews", priority: "medium", status: "in_progress", deadline: dateStr(daysFrom(NOW, 8)), clientId: c["Thornwood Retail Group"]!.id, projectId: p["Digital Transformation Roadmap"]!.id },
    { workspaceId: wid, title: "Send monthly retainer invoice to Meridian", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 3)) },
  ]);

  await db.insert(activityTable).values([
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Meridian Capital Group" onboarded', clientId: c["Meridian Capital Group"]!.id, createdAt: daysFrom(NOW, -200) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Retainer payment of $36,000 received (INV-1001)", clientId: c["Meridian Capital Group"]!.id, createdAt: daysFrom(NOW, -44) },
    { workspaceId: wid, type: "project_created", entityType: "project", description: 'Engagement "Operations Excellence Program" started', clientId: c["Fortis Manufacturing"]!.id, createdAt: daysFrom(NOW, -90) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Payment of $55,000 received (INV-2001)", clientId: c["Fortis Manufacturing"]!.id, createdAt: daysFrom(NOW, -52) },
    { workspaceId: wid, type: "project_updated", entityType: "project", description: '"FDA Compliance Framework Review" moved to review stage', clientId: c["Apex Pharmaceuticals"]!.id, createdAt: daysFrom(NOW, -3) },
    { workspaceId: wid, type: "meeting_logged", entityType: "meeting", description: "Logged meeting: Thornwood discovery kickoff", clientId: c["Thornwood Retail Group"]!.id, createdAt: daysFrom(NOW, -10) },
  ]);
}

async function applyClinic(wid: number) {
  const clientRows = await db.insert(clientsTable).values([
    {
      workspaceId: wid,
      companyName: "Sunrise Family Health Network",
      industry: "Healthcare",
      website: "https://sunrisefamilyhealth.com",
      email: "admin@sunrisefamilyhealth.com",
      phone: "+1 (602) 555-0321",
      primaryContact: "Dr. Rachel Moore",
      secondaryContact: "Jennifer Lau (Office Mgr)",
      address: "3200 N Central Ave, Phoenix, AZ",
      timezone: "America/Phoenix",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -365)),
      contractValue: "180000",
      monthlyRetainer: "15000",
      paymentMethod: "ACH",
      notes: "Multi-physician family practice. Annual wellness programs + ongoing chronic care management. Monthly billing.",
      tags: ["retainer", "long-term", "high-volume"],
    },
    {
      workspaceId: wid,
      companyName: "Harbor Pediatric Group",
      industry: "Healthcare",
      website: "https://harborpediatrics.com",
      email: "billing@harborpediatrics.com",
      phone: "+1 (619) 555-0244",
      primaryContact: "Dr. Kevin Strand",
      secondaryContact: null,
      address: "800 Harbor Drive, San Diego, CA",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -180)),
      contractValue: "92000",
      monthlyRetainer: "7500",
      paymentMethod: "ACH",
      notes: "Pediatric group with 3 physicians. Monthly wellness consultations + development assessments.",
      tags: ["retainer", "pediatrics"],
    },
    {
      workspaceId: wid,
      companyName: "Wellspring Recovery Center",
      industry: "Behavioral Health",
      website: "https://wellspringrecovery.org",
      email: "intake@wellspringrecovery.org",
      phone: "+1 (720) 555-0177",
      primaryContact: "Sarah Novak (Clinical Dir)",
      secondaryContact: "Mike Torres (Admin)",
      address: "1500 Larimer St, Denver, CO",
      timezone: "America/Denver",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -90)),
      contractValue: "64000",
      monthlyRetainer: null,
      paymentMethod: "ACH",
      notes: "Recovery center running 90-day programs. Session-based billing. Follow-up care is critical to outcomes.",
      tags: ["behavioral-health", "program-based"],
    },
    {
      workspaceId: wid,
      companyName: "Elite Sports Medicine Clinic",
      industry: "Sports Medicine",
      website: "https://elitesportsmedicine.com",
      email: "clinic@elitesportsmedicine.com",
      phone: "+1 (310) 555-0199",
      primaryContact: "Dr. James Okoro",
      secondaryContact: null,
      address: "9000 Wilshire Blvd, Beverly Hills, CA",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -50)),
      contractValue: "48000",
      monthlyRetainer: null,
      paymentMethod: "Credit Card",
      notes: "Sports medicine practice serving professional athletes. Per-session billing. Priority scheduling for game-day injuries.",
      tags: ["sports-medicine", "high-priority"],
    },
  ]).returning();

  const c = Object.fromEntries(clientRows.map((r) => [r.companyName, r]));

  const projectRows = await db.insert(projectsTable).values([
    {
      workspaceId: wid,
      clientId: c["Sunrise Family Health Network"]!.id,
      name: "Annual Wellness Program — Cohort A",
      status: "development",
      priority: "high",
      progress: 65,
      startDate: dateStr(daysFrom(NOW, -120)),
      deadline: dateStr(daysFrom(NOW, 60)),
      estimatedBudget: "90000",
      actualCost: "54000",
      revenue: "90000",
      description: "Annual wellness program covering preventive screenings, lifestyle consultations, and chronic disease management for 120 enrolled patients.",
    },
    {
      workspaceId: wid,
      clientId: c["Harbor Pediatric Group"]!.id,
      name: "Pediatric Development Assessment Program",
      status: "development",
      priority: "medium",
      progress: 50,
      startDate: dateStr(daysFrom(NOW, -60)),
      deadline: dateStr(daysFrom(NOW, 90)),
      estimatedBudget: "45000",
      actualCost: "21000",
      revenue: "45000",
      description: "Structured developmental assessment program for children aged 2–12. Includes milestone tracking and parent coaching sessions.",
    },
    {
      workspaceId: wid,
      clientId: c["Wellspring Recovery Center"]!.id,
      name: "90-Day Recovery Program — Cohort Summer",
      status: "review",
      priority: "high",
      progress: 82,
      startDate: dateStr(daysFrom(NOW, -70)),
      deadline: dateStr(daysFrom(NOW, 15)),
      estimatedBudget: "64000",
      actualCost: "52500",
      revenue: "64000",
      description: "Structured 90-day recovery program including individual therapy, group sessions, and aftercare planning.",
    },
    {
      workspaceId: wid,
      clientId: c["Elite Sports Medicine Clinic"]!.id,
      name: "Athlete Rehabilitation & Performance Program",
      status: "design",
      priority: "high",
      progress: 30,
      startDate: dateStr(daysFrom(NOW, -25)),
      deadline: dateStr(daysFrom(NOW, 50)),
      estimatedBudget: "48000",
      actualCost: "12000",
      revenue: "48000",
      description: "Individualized rehabilitation and performance optimization programs for 8 professional athletes across 3 sports.",
    },
  ]).returning();

  const p = Object.fromEntries(projectRows.map((r) => [r.name, r]));

  await db.insert(deliverablesTable).values([
    { projectId: p["Annual Wellness Program — Cohort A"]!.id, title: "Mid-program health screening (all patients)", status: "done", deadline: dateStr(daysFrom(NOW, -20)), assignedTo: "Clinical Team", completionDate: dateStr(daysFrom(NOW, -18)) },
    { projectId: p["Annual Wellness Program — Cohort A"]!.id, title: "Chronic care follow-up round (Q3)", status: "in_progress", deadline: dateStr(daysFrom(NOW, 14)), assignedTo: "Dr. Moore" },
    { projectId: p["90-Day Recovery Program — Cohort Summer"]!.id, title: "Aftercare plan preparation (all patients)", status: "in_progress", deadline: dateStr(daysFrom(NOW, 8)), assignedTo: "Sarah Novak" },
    { projectId: p["90-Day Recovery Program — Cohort Summer"]!.id, title: "Program completion assessment", status: "review", deadline: dateStr(daysFrom(NOW, 12)), assignedTo: "Clinical Team" },
    { projectId: p["Athlete Rehabilitation & Performance Program"]!.id, title: "Individual athlete assessment & baseline testing", status: "in_progress", deadline: dateStr(daysFrom(NOW, 10)), assignedTo: "Dr. Okoro" },
  ]);

  await db.insert(paymentsTable).values([
    { workspaceId: wid, clientId: c["Sunrise Family Health Network"]!.id, projectId: p["Annual Wellness Program — Cohort A"]!.id, invoiceNumber: "INV-1001", amount: "45000", status: "paid", dueDate: dateStr(daysFrom(NOW, -80)), paidDate: dateStr(daysFrom(NOW, -82)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Sunrise Family Health Network"]!.id, projectId: p["Annual Wellness Program — Cohort A"]!.id, invoiceNumber: "INV-1002", amount: "45000", status: "pending", dueDate: dateStr(daysFrom(NOW, 20)), remainingBalance: "45000" },
    { workspaceId: wid, clientId: c["Sunrise Family Health Network"]!.id, invoiceNumber: "INV-1003", amount: "15000", status: "pending", dueDate: dateStr(daysFrom(NOW, 5)), paymentMethod: "ACH", remainingBalance: "15000" },
    { workspaceId: wid, clientId: c["Harbor Pediatric Group"]!.id, projectId: p["Pediatric Development Assessment Program"]!.id, invoiceNumber: "INV-2001", amount: "22500", status: "paid", dueDate: dateStr(daysFrom(NOW, -30)), paidDate: dateStr(daysFrom(NOW, -32)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Harbor Pediatric Group"]!.id, invoiceNumber: "INV-2002", amount: "7500", status: "pending", dueDate: dateStr(daysFrom(NOW, 7)), remainingBalance: "7500" },
    { workspaceId: wid, clientId: c["Wellspring Recovery Center"]!.id, projectId: p["90-Day Recovery Program — Cohort Summer"]!.id, invoiceNumber: "INV-3001", amount: "32000", status: "paid", dueDate: dateStr(daysFrom(NOW, -40)), paidDate: dateStr(daysFrom(NOW, -41)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Wellspring Recovery Center"]!.id, projectId: p["90-Day Recovery Program — Cohort Summer"]!.id, invoiceNumber: "INV-3002", amount: "32000", status: "pending", dueDate: dateStr(daysFrom(NOW, 13)), remainingBalance: "32000" },
    { workspaceId: wid, clientId: c["Elite Sports Medicine Clinic"]!.id, projectId: p["Athlete Rehabilitation & Performance Program"]!.id, invoiceNumber: "INV-4001", amount: "12000", status: "paid", dueDate: dateStr(daysFrom(NOW, -15)), paidDate: dateStr(daysFrom(NOW, -14)), paymentMethod: "Credit Card", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Elite Sports Medicine Clinic"]!.id, projectId: p["Athlete Rehabilitation & Performance Program"]!.id, invoiceNumber: "INV-4002", amount: "18000", status: "pending", dueDate: dateStr(daysFrom(NOW, 20)), remainingBalance: "18000" },
  ]);

  await db.insert(meetingsTable).values([
    { workspaceId: wid, clientId: c["Sunrise Family Health Network"]!.id, date: daysFrom(NOW, -5), summary: "Mid-program review with Dr. Moore — 87% patient compliance with wellness plan. 12 patients flagged for additional follow-up.", actionItems: "Schedule follow-up appointments for flagged patients; update care notes.", nextMeeting: daysFrom(NOW, 25) },
    { workspaceId: wid, clientId: c["Harbor Pediatric Group"]!.id, date: daysFrom(NOW, -3), summary: "Monthly check-in with Dr. Strand — new cohort of 18 children starting assessment program. Intake forms need digital upgrade.", actionItems: "Digitize intake forms; set assessment calendar for new cohort.", nextMeeting: daysFrom(NOW, 28) },
    { workspaceId: wid, clientId: c["Wellspring Recovery Center"]!.id, date: daysFrom(NOW, -4), summary: "Program close-out planning with Sarah Novak — 24 of 28 patients completing on schedule. 4 patients need extended aftercare.", actionItems: "Prepare individualized aftercare plans for 4 extended-care patients.", nextMeeting: daysFrom(NOW, 10) },
    { workspaceId: wid, clientId: c["Elite Sports Medicine Clinic"]!.id, date: daysFrom(NOW, -2), summary: "Athlete intake assessments complete — 3 athletes require MRI before program design can be finalized.", actionItems: "Coordinate MRI scheduling; proceed with 5 athletes whose baselines are clear.", nextMeeting: daysFrom(NOW, 12) },
    { workspaceId: wid, clientId: c["Sunrise Family Health Network"]!.id, date: daysFrom(NOW, 25), summary: "Upcoming: Q3 wellness program review and Q4 planning session." },
  ]);

  await db.insert(notesTable).values([
    { workspaceId: wid, clientId: c["Sunrise Family Health Network"]!.id, content: "Jennifer (office manager) handles all scheduling and billing correspondence. Dr. Moore reviews clinical decisions only — do not CC her on admin emails.", createdAt: daysFrom(NOW, -60) },
    { workspaceId: wid, clientId: c["Wellspring Recovery Center"]!.id, content: "Patient confidentiality is paramount — all communications must be de-identified. Use patient ID codes (not names) in all shared documents.", createdAt: daysFrom(NOW, -30) },
    { workspaceId: wid, clientId: c["Elite Sports Medicine Clinic"]!.id, content: "Priority scheduling protocol: game-day injuries get same-day slots. Always confirm with Dr. Okoro directly for emergency appointments.", createdAt: daysFrom(NOW, -10) },
  ]);

  await db.insert(tasksTable).values([
    { workspaceId: wid, title: "Schedule follow-up appointments for 12 flagged Sunrise patients", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 3)), clientId: c["Sunrise Family Health Network"]!.id, projectId: p["Annual Wellness Program — Cohort A"]!.id },
    { workspaceId: wid, title: "Digitize pediatric intake forms (Harbor)", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 10)), clientId: c["Harbor Pediatric Group"]!.id, projectId: p["Pediatric Development Assessment Program"]!.id },
    { workspaceId: wid, title: "Prepare aftercare plans for 4 extended-care patients (Wellspring)", priority: "urgent", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), clientId: c["Wellspring Recovery Center"]!.id, projectId: p["90-Day Recovery Program — Cohort Summer"]!.id },
    { workspaceId: wid, title: "Coordinate MRI scheduling for 3 Elite athletes", priority: "high", status: "todo", deadline: dateStr(daysFrom(NOW, 4)), clientId: c["Elite Sports Medicine Clinic"]!.id, projectId: p["Athlete Rehabilitation & Performance Program"]!.id },
    { workspaceId: wid, title: "Send monthly retainer invoices (Sunrise + Harbor)", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 5)) },
    { workspaceId: wid, title: "Update Q3 patient outcomes report", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 14)) },
  ]);

  await db.insert(activityTable).values([
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Sunrise Family Health Network" onboarded', clientId: c["Sunrise Family Health Network"]!.id, createdAt: daysFrom(NOW, -365) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Wellness program payment of $45,000 received (INV-1001)", clientId: c["Sunrise Family Health Network"]!.id, createdAt: daysFrom(NOW, -82) },
    { workspaceId: wid, type: "meeting_logged", entityType: "meeting", description: "Mid-program review with Sunrise Family Health", clientId: c["Sunrise Family Health Network"]!.id, createdAt: daysFrom(NOW, -5) },
    { workspaceId: wid, type: "project_updated", entityType: "project", description: '"90-Day Recovery Program" moved to review stage', clientId: c["Wellspring Recovery Center"]!.id, createdAt: daysFrom(NOW, -4) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Recovery program payment of $32,000 received (INV-3001)", clientId: c["Wellspring Recovery Center"]!.id, createdAt: daysFrom(NOW, -41) },
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Elite Sports Medicine Clinic" onboarded', clientId: c["Elite Sports Medicine Clinic"]!.id, createdAt: daysFrom(NOW, -50) },
  ]);
}

async function applyFreelancer(wid: number) {
  const clientRows = await db.insert(clientsTable).values([
    {
      workspaceId: wid,
      companyName: "Bloom Bakery",
      industry: "Food & Beverage",
      website: "https://bloombakery.com",
      email: "owner@bloombakery.com",
      phone: "+1 (503) 555-0421",
      primaryContact: "Claire Dubois",
      secondaryContact: null,
      address: "44 NW 23rd Ave, Portland, OR",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -60)),
      contractValue: "8500",
      monthlyRetainer: null,
      paymentMethod: "Credit Card",
      notes: "Small business owner, quick to respond. Wants a clean, warm website for her artisan bakery. Very visual.",
      tags: ["small-business", "design"],
    },
    {
      workspaceId: wid,
      companyName: "Ridge Architecture Studio",
      industry: "Architecture",
      website: "https://ridgearchitecture.com",
      email: "studio@ridgearchitecture.com",
      phone: "+1 (206) 555-0388",
      primaryContact: "Marcus Lund",
      secondaryContact: null,
      address: "1100 Western Ave, Seattle, WA",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -120)),
      contractValue: "14000",
      monthlyRetainer: null,
      paymentMethod: "ACH",
      notes: "Portfolio site rebuild + brand identity. Marcus is detail-oriented and will request multiple revision rounds.",
      tags: ["portfolio", "brand"],
    },
    {
      workspaceId: wid,
      companyName: "Cascade Events Co.",
      industry: "Events & Entertainment",
      website: "https://cascadeevents.co",
      email: "team@cascadeevents.co",
      phone: "+1 (415) 555-0266",
      primaryContact: "Tanya Rhodes",
      secondaryContact: "Ben Archer",
      address: "655 Mission St, San Francisco, CA",
      timezone: "America/Los_Angeles",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -30)),
      contractValue: "6500",
      monthlyRetainer: null,
      paymentMethod: "Credit Card",
      notes: "Event company needs brand assets for a new service line. Quick turnaround, clear brief. Good client.",
      tags: ["brand-assets", "fast-turnaround"],
    },
  ]).returning();

  const c = Object.fromEntries(clientRows.map((r) => [r.companyName, r]));

  const projectRows = await db.insert(projectsTable).values([
    {
      workspaceId: wid,
      clientId: c["Bloom Bakery"]!.id,
      name: "Bakery Website Design & Build",
      status: "development",
      priority: "high",
      progress: 65,
      startDate: dateStr(daysFrom(NOW, -45)),
      deadline: dateStr(daysFrom(NOW, 20)),
      estimatedBudget: "8500",
      actualCost: "5100",
      revenue: "8500",
      description: "5-page website on Squarespace — Home, Menu, About, Catering, and Contact. Mobile-first design.",
    },
    {
      workspaceId: wid,
      clientId: c["Ridge Architecture Studio"]!.id,
      name: "Portfolio Site Redesign",
      status: "review",
      priority: "medium",
      progress: 85,
      startDate: dateStr(daysFrom(NOW, -90)),
      deadline: dateStr(daysFrom(NOW, 10)),
      estimatedBudget: "10000",
      actualCost: "8200",
      revenue: "10000",
      description: "Full portfolio site rebuild on Webflow. Project gallery with filterable case studies, contact form, and press section.",
    },
    {
      workspaceId: wid,
      clientId: c["Ridge Architecture Studio"]!.id,
      name: "Brand Identity Refresh",
      status: "planning",
      priority: "low",
      progress: 5,
      startDate: dateStr(daysFrom(NOW, 5)),
      deadline: dateStr(daysFrom(NOW, 60)),
      estimatedBudget: "4000",
      actualCost: "0",
      revenue: null,
      description: "Logo refresh, updated business card, and one-page brand guide. Starts after portfolio site is launched.",
    },
    {
      workspaceId: wid,
      clientId: c["Cascade Events Co."]!.id,
      name: "Brand Assets — New Service Line",
      status: "design",
      priority: "high",
      progress: 45,
      startDate: dateStr(daysFrom(NOW, -20)),
      deadline: dateStr(daysFrom(NOW, 14)),
      estimatedBudget: "6500",
      actualCost: "2600",
      revenue: "6500",
      description: "Logo, color palette, social media templates, and one-page PDF capabilities deck for Cascade's new corporate events service.",
    },
  ]).returning();

  const p = Object.fromEntries(projectRows.map((r) => [r.name, r]));

  await db.insert(deliverablesTable).values([
    { projectId: p["Bakery Website Design & Build"]!.id, title: "Homepage & Menu page design (Figma)", status: "done", deadline: dateStr(daysFrom(NOW, -15)), assignedTo: "You", completionDate: dateStr(daysFrom(NOW, -14)) },
    { projectId: p["Bakery Website Design & Build"]!.id, title: "Squarespace build — all pages", status: "in_progress", deadline: dateStr(daysFrom(NOW, 10)), assignedTo: "You" },
    { projectId: p["Portfolio Site Redesign"]!.id, title: "Webflow build — project gallery", status: "done", deadline: dateStr(daysFrom(NOW, -20)), assignedTo: "You", completionDate: dateStr(daysFrom(NOW, -18)) },
    { projectId: p["Portfolio Site Redesign"]!.id, title: "Client review & final revisions", status: "review", deadline: dateStr(daysFrom(NOW, 7)), assignedTo: "You" },
    { projectId: p["Brand Assets — New Service Line"]!.id, title: "Logo concepts (3 directions)", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), assignedTo: "You" },
    { projectId: p["Brand Assets — New Service Line"]!.id, title: "Social media template set", status: "pending", deadline: dateStr(daysFrom(NOW, 12)), assignedTo: "You" },
  ]);

  await db.insert(paymentsTable).values([
    { workspaceId: wid, clientId: c["Bloom Bakery"]!.id, projectId: p["Bakery Website Design & Build"]!.id, invoiceNumber: "INV-1001", amount: "4250", status: "paid", dueDate: dateStr(daysFrom(NOW, -40)), paidDate: dateStr(daysFrom(NOW, -40)), paymentMethod: "Credit Card", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Bloom Bakery"]!.id, projectId: p["Bakery Website Design & Build"]!.id, invoiceNumber: "INV-1002", amount: "4250", status: "pending", dueDate: dateStr(daysFrom(NOW, 18)), remainingBalance: "4250" },
    { workspaceId: wid, clientId: c["Ridge Architecture Studio"]!.id, projectId: p["Portfolio Site Redesign"]!.id, invoiceNumber: "INV-2001", amount: "5000", status: "paid", dueDate: dateStr(daysFrom(NOW, -60)), paidDate: dateStr(daysFrom(NOW, -60)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Ridge Architecture Studio"]!.id, projectId: p["Portfolio Site Redesign"]!.id, invoiceNumber: "INV-2002", amount: "5000", status: "pending", dueDate: dateStr(daysFrom(NOW, 8)), remainingBalance: "5000" },
    { workspaceId: wid, clientId: c["Cascade Events Co."]!.id, projectId: p["Brand Assets — New Service Line"]!.id, invoiceNumber: "INV-3001", amount: "3250", status: "paid", dueDate: dateStr(daysFrom(NOW, -15)), paidDate: dateStr(daysFrom(NOW, -15)), paymentMethod: "Credit Card", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Cascade Events Co."]!.id, projectId: p["Brand Assets — New Service Line"]!.id, invoiceNumber: "INV-3002", amount: "3250", status: "pending", dueDate: dateStr(daysFrom(NOW, 12)), remainingBalance: "3250" },
  ]);

  await db.insert(documentsTable).values([
    { workspaceId: wid, clientId: c["Bloom Bakery"]!.id, projectId: p["Bakery Website Design & Build"]!.id, title: "Website Design Mockups (Figma)", type: "figma", url: "https://figma.com/file/bloom-bakery-website", notes: "Client approved homepage on Jul 12." },
    { workspaceId: wid, clientId: c["Ridge Architecture Studio"]!.id, projectId: p["Portfolio Site Redesign"]!.id, title: "Project Photography Assets", type: "google_drive", url: "https://drive.google.com/drive/ridge-photos", notes: "High-res images from Marcus." },
    { workspaceId: wid, clientId: c["Cascade Events Co."]!.id, title: "Brand Brief & Project Scope", type: "proposal", url: "https://drive.example.com/cascade/brief.pdf", notes: null },
  ]);

  await db.insert(meetingsTable).values([
    { workspaceId: wid, clientId: c["Bloom Bakery"]!.id, date: daysFrom(NOW, -5), summary: "Progress check — Claire loves the menu page layout. Wants the color palette to feel warmer. Approved font choices.", actionItems: "Warm up color palette; apply to remaining pages.", nextMeeting: daysFrom(NOW, 14) },
    { workspaceId: wid, clientId: c["Ridge Architecture Studio"]!.id, date: daysFrom(NOW, -4), summary: "Gallery review — Marcus approved the filterable project grid. Requested two additional case study pages.", actionItems: "Build 2 additional case study pages; send review link.", nextMeeting: daysFrom(NOW, 7) },
    { workspaceId: wid, clientId: c["Cascade Events Co."]!.id, date: daysFrom(NOW, -8), summary: "Kickoff — Tanya shared brand references and competitor examples. Modern, upscale direction confirmed.", actionItems: "Produce 3 logo directions; present by end of week.", nextMeeting: daysFrom(NOW, 6) },
  ]);

  await db.insert(notesTable).values([
    { workspaceId: wid, clientId: c["Bloom Bakery"]!.id, content: "Claire prefers Slack messages to email. She's usually available 9am–2pm PST. Quick to approve once she sees visuals.", createdAt: daysFrom(NOW, -20) },
    { workspaceId: wid, clientId: c["Ridge Architecture Studio"]!.id, content: "Marcus will request at least 3 rounds of revisions — scope it into the contract from the start. He's worth it; always pays on time.", createdAt: daysFrom(NOW, -60) },
    { workspaceId: wid, clientId: c["Cascade Events Co."]!.id, content: "Hard deadline: brand assets needed for their trade show on the 15th. No wiggle room — plan accordingly.", createdAt: daysFrom(NOW, -8) },
  ]);

  await db.insert(tasksTable).values([
    { workspaceId: wid, title: "Warm up color palette and apply to Bloom Bakery site", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 3)), clientId: c["Bloom Bakery"]!.id, projectId: p["Bakery Website Design & Build"]!.id },
    { workspaceId: wid, title: "Build 2 additional case study pages for Ridge", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 5)), clientId: c["Ridge Architecture Studio"]!.id, projectId: p["Portfolio Site Redesign"]!.id },
    { workspaceId: wid, title: "Produce 3 logo concepts for Cascade Events", priority: "urgent", status: "in_progress", deadline: dateStr(daysFrom(NOW, 4)), clientId: c["Cascade Events Co."]!.id, projectId: p["Brand Assets — New Service Line"]!.id },
    { workspaceId: wid, title: "Send final balance invoice to Bloom on launch day", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 20)) },
    { workspaceId: wid, title: "Follow up with Ridge on outstanding balance (INV-2002)", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 8)) },
    { workspaceId: wid, title: "Prepare project scope doc for Ridge brand refresh", priority: "low", status: "todo", deadline: dateStr(daysFrom(NOW, 14)) },
  ]);

  await db.insert(activityTable).values([
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Bloom Bakery" onboarded', clientId: c["Bloom Bakery"]!.id, createdAt: daysFrom(NOW, -60) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Deposit of $4,250 received (INV-1001)", clientId: c["Bloom Bakery"]!.id, createdAt: daysFrom(NOW, -40) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Portfolio project deposit of $5,000 received (INV-2001)", clientId: c["Ridge Architecture Studio"]!.id, createdAt: daysFrom(NOW, -60) },
    { workspaceId: wid, type: "project_updated", entityType: "project", description: '"Portfolio Site Redesign" moved to review stage', clientId: c["Ridge Architecture Studio"]!.id, createdAt: daysFrom(NOW, -2) },
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Cascade Events Co." onboarded', clientId: c["Cascade Events Co."]!.id, createdAt: daysFrom(NOW, -30) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Brand project deposit of $3,250 received (INV-3001)", clientId: c["Cascade Events Co."]!.id, createdAt: daysFrom(NOW, -15) },
  ]);
}

async function applyGeneric(wid: number) {
  const clientRows = await db.insert(clientsTable).values([
    {
      workspaceId: wid,
      companyName: "Halcyon Property Group",
      industry: "Real Estate",
      website: "https://halcyonproperty.com",
      email: "hello@halcyonproperty.com",
      phone: "+1 (305) 555-0501",
      primaryContact: "Sandra Vega",
      secondaryContact: "Tom Bellamy",
      address: "1221 Brickell Ave, Miami, FL",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -200)),
      contractValue: "95000",
      monthlyRetainer: "7000",
      paymentMethod: "ACH",
      notes: "Growing property group expanding into commercial real estate. Retainer covers ongoing digital and marketing services.",
      tags: ["retainer", "real-estate"],
    },
    {
      workspaceId: wid,
      companyName: "Prism Education Group",
      industry: "Education",
      website: "https://prismeducation.com",
      email: "partnerships@prismedu.com",
      phone: "+1 (617) 555-0422",
      primaryContact: "Elaine Foster",
      secondaryContact: null,
      address: "77 Franklin St, Boston, MA",
      timezone: "America/New_York",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -130)),
      contractValue: "62000",
      monthlyRetainer: null,
      paymentMethod: "ACH",
      notes: "EdTech company launching online course platform. Elaine is the main stakeholder — very organized, always responsive.",
      tags: ["edtech", "product-launch"],
    },
    {
      workspaceId: wid,
      companyName: "Sequoia Logistics",
      industry: "Logistics & Supply Chain",
      website: "https://sequoialogistics.com",
      email: "ops@sequoialogistics.com",
      phone: "+1 (214) 555-0388",
      primaryContact: "Derek Ng",
      secondaryContact: "Paula Chen",
      address: "400 South Lamar Blvd, Dallas, TX",
      timezone: "America/Chicago",
      status: "active",
      startDate: dateStr(daysFrom(NOW, -80)),
      contractValue: "48000",
      monthlyRetainer: null,
      paymentMethod: "Wire Transfer",
      notes: "Process optimization and digital tool implementation for their 3PL operation. Derek is pragmatic — wants results, not presentations.",
      tags: ["logistics", "ops"],
    },
    {
      workspaceId: wid,
      companyName: "Mosaic Hospitality",
      industry: "Hospitality",
      website: "https://mosaichospitality.com",
      email: "team@mosaichospitality.com",
      phone: "+1 (702) 555-0311",
      primaryContact: "Lia Nakamura",
      secondaryContact: null,
      address: "3600 Las Vegas Blvd, Las Vegas, NV",
      timezone: "America/Los_Angeles",
      status: "inactive",
      startDate: dateStr(daysFrom(NOW, -300)),
      contractValue: "41000",
      monthlyRetainer: null,
      paymentMethod: "Credit Card",
      notes: "Project wrapped after hotel renovation marketing campaign. Happy client — open to future work in Q1.",
      tags: ["completed", "hospitality"],
    },
  ]).returning();

  const c = Object.fromEntries(clientRows.map((r) => [r.companyName, r]));

  const projectRows = await db.insert(projectsTable).values([
    {
      workspaceId: wid,
      clientId: c["Halcyon Property Group"]!.id,
      name: "Commercial Real Estate Landing Pages",
      status: "development",
      priority: "high",
      progress: 60,
      startDate: dateStr(daysFrom(NOW, -50)),
      deadline: dateStr(daysFrom(NOW, 25)),
      estimatedBudget: "32000",
      actualCost: "18500",
      revenue: "32000",
      description: "Series of landing pages for 4 new commercial properties, each with virtual tour embed and inquiry form.",
    },
    {
      workspaceId: wid,
      clientId: c["Halcyon Property Group"]!.id,
      name: "Q3 Marketing Retainer",
      status: "development",
      priority: "medium",
      progress: 50,
      startDate: dateStr(daysFrom(NOW, -90)),
      deadline: dateStr(daysFrom(NOW, 0)),
      estimatedBudget: "21000",
      actualCost: "12000",
      revenue: "21000",
      description: "Ongoing marketing retainer — monthly content, social media management, and email newsletters.",
    },
    {
      workspaceId: wid,
      clientId: c["Prism Education Group"]!.id,
      name: "Online Learning Platform Launch",
      status: "review",
      priority: "urgent",
      progress: 88,
      startDate: dateStr(daysFrom(NOW, -100)),
      deadline: dateStr(daysFrom(NOW, 6)),
      estimatedBudget: "62000",
      actualCost: "54500",
      revenue: "62000",
      description: "Full go-to-market strategy and digital launch for Prism's online learning platform — course site, email campaign, and PR.",
    },
    {
      workspaceId: wid,
      clientId: c["Sequoia Logistics"]!.id,
      name: "Operations Process Optimization",
      status: "design",
      priority: "medium",
      progress: 35,
      startDate: dateStr(daysFrom(NOW, -30)),
      deadline: dateStr(daysFrom(NOW, 55)),
      estimatedBudget: "48000",
      actualCost: "15000",
      revenue: "48000",
      description: "Process audit and digital tool implementation across receiving, dispatch, and exception management workflows.",
    },
    {
      workspaceId: wid,
      clientId: c["Mosaic Hospitality"]!.id,
      name: "Hotel Renovation Campaign",
      status: "delivered",
      priority: "medium",
      progress: 100,
      startDate: dateStr(daysFrom(NOW, -300)),
      deadline: dateStr(daysFrom(NOW, -120)),
      estimatedBudget: "41000",
      actualCost: "39200",
      revenue: "41000",
      description: "Full marketing campaign for the Mosaic Palms hotel renovation — landing page, email series, and social content. Delivered and wrapped.",
    },
  ]).returning();

  const p = Object.fromEntries(projectRows.map((r) => [r.name, r]));

  await db.insert(deliverablesTable).values([
    { projectId: p["Commercial Real Estate Landing Pages"]!.id, title: "Property 1 & 2 page designs", status: "done", deadline: dateStr(daysFrom(NOW, -15)), assignedTo: "Design Team", completionDate: dateStr(daysFrom(NOW, -13)) },
    { projectId: p["Commercial Real Estate Landing Pages"]!.id, title: "Property 3 & 4 page designs + builds", status: "in_progress", deadline: dateStr(daysFrom(NOW, 15)), assignedTo: "Design Team" },
    { projectId: p["Online Learning Platform Launch"]!.id, title: "Course site final QA", status: "review", deadline: dateStr(daysFrom(NOW, 3)), assignedTo: "Dev Team" },
    { projectId: p["Online Learning Platform Launch"]!.id, title: "Launch email sequence (5 emails)", status: "done", deadline: dateStr(daysFrom(NOW, -10)), assignedTo: "Content Team", completionDate: dateStr(daysFrom(NOW, -9)) },
    { projectId: p["Operations Process Optimization"]!.id, title: "As-is process documentation", status: "in_progress", deadline: dateStr(daysFrom(NOW, 20)), assignedTo: "You" },
    { projectId: p["Hotel Renovation Campaign"]!.id, title: "Final campaign report", status: "done", deadline: dateStr(daysFrom(NOW, -120)), assignedTo: "You", completionDate: dateStr(daysFrom(NOW, -119)) },
  ]);

  await db.insert(paymentsTable).values([
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, projectId: p["Commercial Real Estate Landing Pages"]!.id, invoiceNumber: "INV-1001", amount: "16000", status: "paid", dueDate: dateStr(daysFrom(NOW, -30)), paidDate: dateStr(daysFrom(NOW, -31)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, projectId: p["Commercial Real Estate Landing Pages"]!.id, invoiceNumber: "INV-1002", amount: "16000", status: "pending", dueDate: dateStr(daysFrom(NOW, 22)), remainingBalance: "16000" },
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, invoiceNumber: "INV-1003", amount: "7000", status: "pending", dueDate: dateStr(daysFrom(NOW, 4)), paymentMethod: "ACH", remainingBalance: "7000" },
    { workspaceId: wid, clientId: c["Prism Education Group"]!.id, projectId: p["Online Learning Platform Launch"]!.id, invoiceNumber: "INV-2001", amount: "31000", status: "paid", dueDate: dateStr(daysFrom(NOW, -60)), paidDate: dateStr(daysFrom(NOW, -62)), paymentMethod: "ACH", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Prism Education Group"]!.id, projectId: p["Online Learning Platform Launch"]!.id, invoiceNumber: "INV-2002", amount: "31000", status: "pending", dueDate: dateStr(daysFrom(NOW, 5)), remainingBalance: "31000" },
    { workspaceId: wid, clientId: c["Sequoia Logistics"]!.id, projectId: p["Operations Process Optimization"]!.id, invoiceNumber: "INV-3001", amount: "24000", status: "paid", dueDate: dateStr(daysFrom(NOW, -20)), paidDate: dateStr(daysFrom(NOW, -19)), paymentMethod: "Wire Transfer", remainingBalance: "0" },
    { workspaceId: wid, clientId: c["Sequoia Logistics"]!.id, projectId: p["Operations Process Optimization"]!.id, invoiceNumber: "INV-3002", amount: "24000", status: "pending", dueDate: dateStr(daysFrom(NOW, 30)), remainingBalance: "24000" },
    { workspaceId: wid, clientId: c["Mosaic Hospitality"]!.id, projectId: p["Hotel Renovation Campaign"]!.id, invoiceNumber: "INV-4001", amount: "41000", status: "paid", dueDate: dateStr(daysFrom(NOW, -125)), paidDate: dateStr(daysFrom(NOW, -126)), paymentMethod: "Credit Card", remainingBalance: "0" },
  ]);

  await db.insert(documentsTable).values([
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, projectId: p["Commercial Real Estate Landing Pages"]!.id, title: "Property Photography Assets", type: "google_drive", url: "https://drive.google.com/drive/halcyon-photos", notes: null },
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, title: "Retainer Services Agreement", type: "contract", url: "https://drive.example.com/halcyon/agreement.pdf", notes: null },
    { workspaceId: wid, clientId: c["Prism Education Group"]!.id, projectId: p["Online Learning Platform Launch"]!.id, title: "Launch Strategy Doc (Google Doc)", type: "google_drive", url: "https://docs.google.com/document/d/prism-launch", notes: "Final version approved by Elaine." },
    { workspaceId: wid, clientId: c["Sequoia Logistics"]!.id, title: "Project Scope & SOW", type: "proposal", url: "https://drive.example.com/sequoia/sow.pdf", notes: null },
    { workspaceId: wid, clientId: c["Mosaic Hospitality"]!.id, projectId: p["Hotel Renovation Campaign"]!.id, title: "Campaign Performance Report", type: "design", url: "https://drive.example.com/mosaic/campaign-report.pdf", notes: "Shared with Lia after project close." },
  ]);

  await db.insert(meetingsTable).values([
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, date: daysFrom(NOW, -4), summary: "Property 3 & 4 creative review with Sandra — she approved the layout direction, wants hero images from the new photography shoot.", actionItems: "Await photography assets; integrate into designs once received.", nextMeeting: daysFrom(NOW, 18) },
    { workspaceId: wid, clientId: c["Prism Education Group"]!.id, date: daysFrom(NOW, -2), summary: "Pre-launch review with Elaine — platform is 95% ready. Two UX bugs flagged in mobile checkout. Email sequence approved.", actionItems: "Fix 2 mobile bugs; confirm launch date with dev team.", nextMeeting: daysFrom(NOW, 5) },
    { workspaceId: wid, clientId: c["Sequoia Logistics"]!.id, date: daysFrom(NOW, -7), summary: "Receiving workflow walkthrough with Derek — identified 4 manual handoff points that slow exception resolution.", actionItems: "Document exception workflow; propose digital triage tool.", nextMeeting: daysFrom(NOW, 14) },
  ]);

  await db.insert(notesTable).values([
    { workspaceId: wid, clientId: c["Halcyon Property Group"]!.id, content: "Sandra is very visual — always send design previews before meetings, not just written updates. She decides faster with visuals.", createdAt: daysFrom(NOW, -60) },
    { workspaceId: wid, clientId: c["Prism Education Group"]!.id, content: "Elaine flagged: launch is tied to their investor update call on the 20th. Missing this date is not an option.", createdAt: daysFrom(NOW, -5) },
    { workspaceId: wid, clientId: c["Mosaic Hospitality"]!.id, content: "Lia mentioned they're planning a second property opening in Q1 — reach out in November to propose a new campaign.", createdAt: daysFrom(NOW, -120) },
  ]);

  await db.insert(tasksTable).values([
    { workspaceId: wid, title: "Await Halcyon property photography; update pages when received", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 12)), clientId: c["Halcyon Property Group"]!.id, projectId: p["Commercial Real Estate Landing Pages"]!.id },
    { workspaceId: wid, title: "Fix 2 mobile bugs on Prism course checkout", priority: "urgent", status: "in_progress", deadline: dateStr(daysFrom(NOW, 2)), clientId: c["Prism Education Group"]!.id, projectId: p["Online Learning Platform Launch"]!.id },
    { workspaceId: wid, title: "Document Sequoia exception workflow & propose digital triage tool", priority: "high", status: "in_progress", deadline: dateStr(daysFrom(NOW, 10)), clientId: c["Sequoia Logistics"]!.id, projectId: p["Operations Process Optimization"]!.id },
    { workspaceId: wid, title: "Send Halcyon monthly retainer invoice (INV-1003)", priority: "medium", status: "todo", deadline: dateStr(daysFrom(NOW, 4)) },
    { workspaceId: wid, title: "Follow up with Prism on launch payment (INV-2002)", priority: "high", status: "todo", deadline: dateStr(daysFrom(NOW, 5)) },
    { workspaceId: wid, title: "Set calendar reminder to re-engage Mosaic in November", priority: "low", status: "todo", deadline: dateStr(daysFrom(NOW, 30)) },
  ]);

  await db.insert(activityTable).values([
    { workspaceId: wid, type: "client_created", entityType: "client", description: 'Client "Halcyon Property Group" onboarded', clientId: c["Halcyon Property Group"]!.id, createdAt: daysFrom(NOW, -200) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Payment of $16,000 received (INV-1001)", clientId: c["Halcyon Property Group"]!.id, createdAt: daysFrom(NOW, -31) },
    { workspaceId: wid, type: "project_updated", entityType: "project", description: '"Online Learning Platform Launch" moved to review stage', clientId: c["Prism Education Group"]!.id, createdAt: daysFrom(NOW, -3) },
    { workspaceId: wid, type: "payment_received", entityType: "payment", description: "Platform launch payment of $31,000 received (INV-2001)", clientId: c["Prism Education Group"]!.id, createdAt: daysFrom(NOW, -62) },
    { workspaceId: wid, type: "project_created", entityType: "project", description: 'Project "Operations Process Optimization" started', clientId: c["Sequoia Logistics"]!.id, createdAt: daysFrom(NOW, -30) },
    { workspaceId: wid, type: "project_delivered", entityType: "project", description: '"Hotel Renovation Campaign" delivered and wrapped', clientId: c["Mosaic Hospitality"]!.id, createdAt: daysFrom(NOW, -120) },
  ]);
}

// ── Template dispatcher ────────────────────────────────────────────────────────

async function applyTemplate(templateId: string, wid: number): Promise<void> {
  // Clear any existing workspace data first (separate statements — Drizzle does not support multi-statement SQL)
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

  switch (templateId) {
    case "digital-agency":  return applyDigitalAgency(wid);
    case "consulting":      return applyConsulting(wid);
    case "clinic":          return applyClinic(wid);
    case "freelancer":      return applyFreelancer(wid);
    case "generic":         return applyGeneric(wid);
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
