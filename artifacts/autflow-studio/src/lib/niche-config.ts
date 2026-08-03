/**
 * Niche configuration system.
 * Maps a workspace's businessType to UI terminology, navigation, empty-state copy,
 * and AI context so the app feels purpose-built for each industry.
 *
 * To add a new industry: create a new config object and add it to NICHE_MAP.
 * No other file needs to change.
 */

/** Nav item keys — must match the keys in BASE_NAV_ITEMS in layout.tsx */
export type NavItemKey =
  | "dashboard"
  | "clients"
  | "projects"
  | "campaigns"
  | "deliverables"
  | "tasks"
  | "meetings"
  | "calendar"
  | "payments"
  | "documents"
  | "reports"
  | "team"
  | "ai-assistant";

export interface NicheConfig {
  id: string | null;
  /** Singular label for a "client" record */
  clientTerm: string;
  /** Plural label for "client" records */
  clientTermPlural: string;
  /** Singular label for a "project" record */
  projectTerm: string;
  /** Plural label for "project" records */
  projectTermPlural: string;
  /** Singular label for a "meeting" record */
  meetingTerm: string;
  /** Plural label for "meeting" records */
  meetingTermPlural: string;
  /** Singular label for a "payment" record */
  paymentTerm: string;
  /** Plural label for "payment" records */
  paymentTermPlural: string;
  /** Ordered list of nav item keys to show in the sidebar */
  navItems: NavItemKey[];
  /** Dashboard page heading */
  dashboardTitle: string;
  /** Dashboard page sub-description */
  dashboardDescription: string;
  /** Empty-state headline on the clients list */
  emptyClientHeadline: string;
  /** Empty-state body on the clients list */
  emptyClientBody: string;
  /** Empty-state headline on the projects list */
  emptyProjectHeadline: string;
  /** Empty-state body on the projects list */
  emptyProjectBody: string;
  /** Empty-state headline on the campaigns list */
  emptyCampaignHeadline: string;
  /** Empty-state body on the campaigns list */
  emptyCampaignBody: string;
  /** Empty-state headline on the deliverables list */
  emptyDeliverableHeadline: string;
  /** Empty-state body on the deliverables list */
  emptyDeliverableBody: string;
  /** Colour accent used on niche-specific UI accents */
  accentColor: string;
  /** Short descriptor shown in onboarding */
  onboardingTagline: string;
  /** First steps shown in the empty dashboard */
  firstSteps: { icon: string; title: string; description: string; href: string }[];
  /**
   * Industry context injected into the AI system prompt.
   * Tells the AI which workspace type it's operating in, what terminology to use,
   * and which modules are active.
   */
  aiIndustryContext: string;
}

const AGENCY_CONFIG: NicheConfig = {
  id: "digital-agency",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Project",
  projectTermPlural: "Projects",
  meetingTerm: "Meeting",
  meetingTermPlural: "Meetings",
  paymentTerm: "Invoice",
  paymentTermPlural: "Invoices",
  navItems: [
    "dashboard",
    "clients",
    "projects",
    "campaigns",
    "deliverables",
    "tasks",
    "payments",
    "team",
    "calendar",
    "documents",
    "reports",
    "ai-assistant",
  ],
  dashboardTitle: "Agency Command Center",
  dashboardDescription: "Your agency at a glance — clients, revenue, campaigns, and deadlines",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Add your first client and start building long-term relationships. Track retainers, projects, campaigns, and invoices all in one place.",
  emptyProjectHeadline: "Create your first project",
  emptyProjectBody: "Create your first project and organize delivery from day one. Link it to a client, set a budget, and track every deliverable.",
  emptyCampaignHeadline: "Launch your first campaign",
  emptyCampaignBody: "Track SEO, paid ads, social media, and every other campaign you run for clients — goals, budgets, and results in one place.",
  emptyDeliverableHeadline: "No deliverables yet",
  emptyDeliverableBody: "Deliverables appear here when added to projects. Track websites, brand identities, ad creatives, and more — with owner, due date, and approval status.",
  accentColor: "violet",
  onboardingTagline: "Clients, projects & campaigns — built for agencies that deliver",
  firstSteps: [
    { icon: "Users", title: "Add your first client", description: "Create a client account with contact details, industry, and contract value.", href: "/clients" },
    { icon: "Briefcase", title: "Create a project", description: "Link a project to a client, assign a budget, deadline, and team owner.", href: "/projects" },
    { icon: "Megaphone", title: "Start a campaign", description: "Track an SEO, paid ads, or social media campaign with goals and performance notes.", href: "/campaigns" },
    { icon: "CreditCard", title: "Send an invoice", description: "Track retainers, milestone invoices, and outstanding balances.", href: "/payments" },
  ],
  aiIndustryContext: `This is a DIGITAL AGENCY workspace — an agency operating system for marketing, branding, web design, automation, and growth agencies.
Active modules: Clients, Projects, Campaigns, Deliverables, Tasks, Invoices, Team, Calendar, Documents, Reports.
Terminology: "Clients" (not customers/patients), "Projects" (branding, web, campaigns, automation work), "Campaigns" (SEO, paid ads, social media, email marketing, brand awareness, lead generation), "Deliverables" (websites, landing pages, logos, ad creatives, reports, video), "Invoices" (not payments/billing), "Team" (designers, developers, copywriters, media buyers, strategists).
Agency-specific intelligence:
- Client Health: factor in project delays, unpaid invoices, communication, and contract value. Flag clients as Healthy / Needs Attention / At Risk.
- Workload: identify overloaded team members and upcoming bottlenecks.
- Revenue: track monthly revenue, outstanding invoices, and profit estimates.
- Deadlines: surface projects near deadline, deliverables pending approval, and campaigns launching soon.
Key questions to answer: Which clients need attention this week? Which invoices are overdue? Which projects are behind schedule? What's the team workload? Which deliverables are waiting for approval? Which campaigns are underperforming? What's this month's revenue? Which clients are at risk of churning?`,
};

const CONSULTING_CONFIG: NicheConfig = {
  id: "consulting",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Engagement",
  projectTermPlural: "Engagements",
  meetingTerm: "Meeting",
  meetingTermPlural: "Meetings",
  paymentTerm: "Invoice",
  paymentTermPlural: "Invoices",
  navItems: ["dashboard", "clients", "projects", "meetings", "tasks", "payments", "documents", "reports", "calendar"],
  dashboardTitle: "Consulting Command Center",
  dashboardDescription: "Your practice at a glance",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Track enterprise clients, advisory relationships, and key stakeholder contacts.",
  emptyProjectHeadline: "Start your first engagement",
  emptyProjectBody: "Create engagements for strategy projects, reports, or advisory retainers.",
  emptyCampaignHeadline: "No campaigns yet",
  emptyCampaignBody: "Track client-facing campaigns and initiatives here.",
  emptyDeliverableHeadline: "No deliverables yet",
  emptyDeliverableBody: "Add deliverables to your engagements to track reports, presentations, and outputs.",
  accentColor: "blue",
  onboardingTagline: "Engagements, reports & advisory — structured for impact",
  firstSteps: [
    { icon: "Users", title: "Add a client", description: "Record the client, their key contacts, and contract value.", href: "/clients" },
    { icon: "Briefcase", title: "Create an engagement", description: "Define scope, timeline, and deliverables for your first project.", href: "/projects" },
    { icon: "FileText", title: "Log a meeting", description: "Record meeting notes and action items after each session.", href: "/meetings" },
  ],
  aiIndustryContext: `This is a CONSULTING BUSINESS workspace.
Active modules: Clients, Engagements, Meetings, Reports, Tasks, Documents, Invoices.
Use this terminology: "Clients", "Engagements" (not projects — these are consulting mandates, strategy work, advisory retainers), "Meetings" (client sessions, workshops, reviews), "Invoices".
Key questions to answer: What are the active engagements? Which clients have upcoming meetings? Are any reports overdue? What's the pending invoice value?`,
};

const CLINIC_CONFIG: NicheConfig = {
  id: "clinic",
  clientTerm: "Patient",
  clientTermPlural: "Patients",
  projectTerm: "Care Program",
  projectTermPlural: "Care Programs",
  meetingTerm: "Appointment",
  meetingTermPlural: "Appointments",
  paymentTerm: "Billing",
  paymentTermPlural: "Billing",
  navItems: ["dashboard", "clients", "meetings", "tasks", "payments", "documents", "calendar"],
  dashboardTitle: "Practice Command Center",
  dashboardDescription: "Your clinic at a glance",
  emptyClientHeadline: "Add your first patient",
  emptyClientBody: "Track patients, appointment contacts, and billing relationships in one place.",
  emptyProjectHeadline: "Create your first care program",
  emptyProjectBody: "Structure wellness programs, treatment plans, or recurring care with milestones and billing.",
  emptyCampaignHeadline: "No campaigns yet",
  emptyCampaignBody: "Track outreach or awareness campaigns here.",
  emptyDeliverableHeadline: "No deliverables yet",
  emptyDeliverableBody: "Add program deliverables and milestones here.",
  accentColor: "rose",
  onboardingTagline: "Appointments, follow-ups & revenue — all in one place",
  firstSteps: [
    { icon: "Heart", title: "Add a patient", description: "Record patient contact details and medical history notes.", href: "/clients" },
    { icon: "Calendar", title: "Book an appointment", description: "Track session notes, action items, and follow-up dates.", href: "/meetings" },
    { icon: "CreditCard", title: "Record billing", description: "Track treatment fees, outstanding balances, and payments.", href: "/payments" },
  ],
  aiIndustryContext: `This is a CLINIC / HEALTHCARE PRACTICE workspace.
Active modules: Patients, Appointments, Tasks, Billing, Documents, Calendar.
Use this terminology: "Patients" (not clients/customers), "Appointments" (not meetings/projects), "Billing" (not invoices/payments), "Follow-ups" (not tasks).
Key questions to answer: Which patients have appointments today or tomorrow? Who needs a follow-up? What are overdue billing amounts? Which patients haven't been seen recently?`,
};

const FREELANCER_CONFIG: NicheConfig = {
  id: "freelancer",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Project",
  projectTermPlural: "Projects",
  meetingTerm: "Meeting",
  meetingTermPlural: "Meetings",
  paymentTerm: "Invoice",
  paymentTermPlural: "Invoices",
  navItems: ["dashboard", "clients", "projects", "tasks", "payments", "documents", "calendar"],
  dashboardTitle: "Freelance Command Center",
  dashboardDescription: "Your freelance business at a glance",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Keep your client roster organised with contacts, project history, and payment records.",
  emptyProjectHeadline: "Create your first project",
  emptyProjectBody: "Track project scope, milestones, invoices, and deadlines for each client.",
  emptyCampaignHeadline: "No campaigns yet",
  emptyCampaignBody: "Track client campaigns and marketing work here.",
  emptyDeliverableHeadline: "No deliverables yet",
  emptyDeliverableBody: "Add deliverables to your projects to track design assets, code, and content.",
  accentColor: "amber",
  onboardingTagline: "Project workflow, invoices & client comms — simplified",
  firstSteps: [
    { icon: "Users", title: "Add a client", description: "Create your first client record with contact and billing details.", href: "/clients" },
    { icon: "Briefcase", title: "Create a project", description: "Define scope, rate, and deadline for the work.", href: "/projects" },
    { icon: "CreditCard", title: "Issue an invoice", description: "Track deposits, milestones, and final payments.", href: "/payments" },
  ],
  aiIndustryContext: `This is a FREELANCER workspace.
Active modules: Clients, Projects, Tasks, Invoices, Documents, Calendar.
Use this terminology: "Clients", "Projects" (freelance contracts, engagements, gigs), "Invoices" (not payments/billing), "Tasks".
Key questions to answer: How much did I earn this month? Which invoices are outstanding? What are my current projects and their deadlines? Which clients owe me money?`,
};

const GENERIC_CONFIG: NicheConfig = {
  id: "generic",
  clientTerm: "Customer",
  clientTermPlural: "Customers",
  projectTerm: "Project",
  projectTermPlural: "Projects",
  meetingTerm: "Meeting",
  meetingTermPlural: "Meetings",
  paymentTerm: "Invoice",
  paymentTermPlural: "Invoices",
  navItems: ["dashboard", "clients", "projects", "tasks", "documents", "calendar", "payments"],
  dashboardTitle: "Business Command Center",
  dashboardDescription: "Your business at a glance",
  emptyClientHeadline: "Add your first customer",
  emptyClientBody: "Manage customer accounts, contacts, and billing relationships across all your service lines.",
  emptyProjectHeadline: "Create your first project",
  emptyProjectBody: "Track any service, engagement, or deliverable-based work with full billing and task management.",
  emptyCampaignHeadline: "No campaigns yet",
  emptyCampaignBody: "Track marketing campaigns and initiatives here.",
  emptyDeliverableHeadline: "No deliverables yet",
  emptyDeliverableBody: "Add deliverables to your projects to track outputs and approvals.",
  accentColor: "emerald",
  onboardingTagline: "A balanced starting point for any service business",
  firstSteps: [
    { icon: "Users", title: "Add a customer", description: "Create your first customer with contact info and billing details.", href: "/clients" },
    { icon: "Briefcase", title: "Create a project", description: "Link a project to a customer and set a budget and deadline.", href: "/projects" },
    { icon: "CreditCard", title: "Track payments", description: "Issue invoices and monitor outstanding balances.", href: "/payments" },
  ],
  aiIndustryContext: `This is a GENERAL BUSINESS workspace.
Active modules: Customers, Projects, Tasks, Documents, Calendar, Invoices.
Use this terminology: "Customers" (not clients/patients), "Projects", "Invoices", "Tasks".
Key questions to answer: What's the current revenue? How many active customers? What projects are in progress? What invoices are outstanding?`,
};

const DEFAULT_CONFIG: NicheConfig = AGENCY_CONFIG;

const NICHE_MAP: Record<string, NicheConfig> = {
  "digital-agency": AGENCY_CONFIG,
  "agency": AGENCY_CONFIG,
  "consulting": CONSULTING_CONFIG,
  "clinic": CLINIC_CONFIG,
  "freelancer": FREELANCER_CONFIG,
  "generic": GENERIC_CONFIG,
  "service_business": GENERIC_CONFIG,
  "other": GENERIC_CONFIG,
};

/**
 * Returns the niche config for a given businessType string.
 * Falls back to the agency (default) config when the type is null/unknown.
 */
export function getNicheConfig(businessType: string | null | undefined): NicheConfig {
  if (!businessType) return DEFAULT_CONFIG;
  return NICHE_MAP[businessType] ?? DEFAULT_CONFIG;
}

export type { NicheConfig as NicheConfigType };
