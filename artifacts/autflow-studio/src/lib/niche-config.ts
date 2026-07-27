/**
 * Niche configuration system.
 * Maps a workspace's businessType to UI terminology, empty-state copy,
 * and key feature labels so the app feels industry-specific without
 * requiring separate database schemas.
 */

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
  /** Label shown in the sidebar nav */
  navClientLabel: string;
  /** Label shown in the sidebar nav */
  navProjectLabel: string;
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
  /** Colour accent used on niche-specific UI accents */
  accentColor: string;
  /** Short descriptor shown in onboarding */
  onboardingTagline: string;
  /** First steps shown in the empty dashboard */
  firstSteps: { icon: string; title: string; description: string; href: string }[];
}

const AGENCY_CONFIG: NicheConfig = {
  id: "digital-agency",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Project",
  projectTermPlural: "Projects",
  navClientLabel: "Clients",
  navProjectLabel: "Projects",
  dashboardTitle: "Executive Command Center",
  dashboardDescription: "Your agency at a glance",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Track retainer clients, project-based accounts, and all their contacts in one place.",
  emptyProjectHeadline: "Start your first project",
  emptyProjectBody: "Create projects for branding, web, campaigns, or any deliverable-driven work.",
  accentColor: "violet",
  onboardingTagline: "Clients, projects & campaigns — ready on day one",
  firstSteps: [
    { icon: "Users", title: "Add a client", description: "Create your first client account with contact details and billing info.", href: "/clients" },
    { icon: "Briefcase", title: "Create a project", description: "Link a project to a client, set a budget and deadline.", href: "/projects" },
    { icon: "CreditCard", title: "Send an invoice", description: "Track payments, retainers, and outstanding balances.", href: "/payments" },
  ],
};

const CONSULTING_CONFIG: NicheConfig = {
  id: "consulting",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Engagement",
  projectTermPlural: "Engagements",
  navClientLabel: "Clients",
  navProjectLabel: "Engagements",
  dashboardTitle: "Consulting Command Center",
  dashboardDescription: "Your practice at a glance",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Track enterprise clients, advisory relationships, and key stakeholder contacts.",
  emptyProjectHeadline: "Start your first engagement",
  emptyProjectBody: "Create engagements for strategy projects, reports, or advisory retainers.",
  accentColor: "blue",
  onboardingTagline: "Engagements, reports & advisory — structured for impact",
  firstSteps: [
    { icon: "Users", title: "Add a client", description: "Record the client, their key contacts, and contract value.", href: "/clients" },
    { icon: "Briefcase", title: "Create an engagement", description: "Define scope, timeline, and deliverables for your first project.", href: "/projects" },
    { icon: "FileText", title: "Log a meeting", description: "Record meeting notes and action items after each session.", href: "/meetings" },
  ],
};

const CLINIC_CONFIG: NicheConfig = {
  id: "clinic",
  clientTerm: "Client / Patient",
  clientTermPlural: "Clients & Patients",
  projectTerm: "Care Program",
  projectTermPlural: "Care Programs",
  navClientLabel: "Clients & Patients",
  navProjectLabel: "Care Programs",
  dashboardTitle: "Practice Command Center",
  dashboardDescription: "Your clinic at a glance",
  emptyClientHeadline: "Add your first client or patient",
  emptyClientBody: "Track client organisations, patient cohorts, appointment contacts, and billing relationships.",
  emptyProjectHeadline: "Create your first care program",
  emptyProjectBody: "Structure wellness programs, treatment programs, or recurring care plans with milestones and billing.",
  accentColor: "rose",
  onboardingTagline: "Appointments, follow-ups & revenue — all in one place",
  firstSteps: [
    { icon: "Heart", title: "Add a client or patient", description: "Record client organisations or individual patient contacts.", href: "/clients" },
    { icon: "Briefcase", title: "Set up a care program", description: "Create a structured program with sessions, deliverables, and billing.", href: "/projects" },
    { icon: "Calendar", title: "Log an appointment", description: "Track session notes, action items, and follow-up dates.", href: "/meetings" },
  ],
};

const FREELANCER_CONFIG: NicheConfig = {
  id: "freelancer",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Project",
  projectTermPlural: "Projects",
  navClientLabel: "Clients",
  navProjectLabel: "Projects",
  dashboardTitle: "Freelance Command Center",
  dashboardDescription: "Your freelance business at a glance",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Keep your client roster organised with contacts, project history, and payment records.",
  emptyProjectHeadline: "Create your first project",
  emptyProjectBody: "Track project scope, milestones, invoices, and deadlines for each client.",
  accentColor: "amber",
  onboardingTagline: "Project workflow, invoices & client comms — simplified",
  firstSteps: [
    { icon: "Users", title: "Add a client", description: "Create your first client record with contact and billing details.", href: "/clients" },
    { icon: "Briefcase", title: "Create a project", description: "Define scope, rate, and deadline for the work.", href: "/projects" },
    { icon: "CreditCard", title: "Issue an invoice", description: "Track deposits, milestones, and final payments.", href: "/payments" },
  ],
};

const GENERIC_CONFIG: NicheConfig = {
  id: "generic",
  clientTerm: "Client",
  clientTermPlural: "Clients",
  projectTerm: "Project",
  projectTermPlural: "Projects",
  navClientLabel: "Clients",
  navProjectLabel: "Projects",
  dashboardTitle: "Business Command Center",
  dashboardDescription: "Your business at a glance",
  emptyClientHeadline: "Add your first client",
  emptyClientBody: "Manage client accounts, contacts, and billing relationships across all your service lines.",
  emptyProjectHeadline: "Create your first project",
  emptyProjectBody: "Track any service, engagement, or deliverable-based work with full billing and task management.",
  accentColor: "emerald",
  onboardingTagline: "A balanced starting point for any service business",
  firstSteps: [
    { icon: "Users", title: "Add a client", description: "Create your first client with contact info and billing details.", href: "/clients" },
    { icon: "Briefcase", title: "Create a project", description: "Link a project to a client and set a budget and deadline.", href: "/projects" },
    { icon: "CreditCard", title: "Track payments", description: "Issue invoices and monitor outstanding balances.", href: "/payments" },
  ],
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
