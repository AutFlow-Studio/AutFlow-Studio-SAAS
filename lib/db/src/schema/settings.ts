import {
  pgTable,
  text,
  serial,
  timestamp,
  boolean,
  numeric,
  integer,
} from "drizzle-orm/pg-core";

export const agencySettingsTable = pgTable("agency_settings", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation column
  agencyName: text("agency_name").notNull().default("AutFlow Studio"),
  agencyEmail: text("agency_email").notNull().default("hello@autflowstudio.com"),
  website: text("website"),
  supportEmail: text("support_email"),
  logoUrl: text("logo_url"),
  businessType: text("business_type"), // always "digital-agency" for agency workspaces
  agencyType: text("agency_type"), // "marketing" | "web-development" | "design" | "ai-automation" | "branding"
  teamSize: text("team_size"), // "solo" | "2-5" | "6-10" | "11+"
  mainServices: text("main_services"), // JSON array of service strings
  activeClientCount: text("active_client_count"), // "0" | "1-5" | "6-15" | "16-30" | "30+"
  defaultCurrency: text("default_currency").notNull().default("USD"),
  timezone: text("timezone").notNull().default("UTC"),
  invoicePrefix: text("invoice_prefix").notNull().default("INV"),
  paymentTermsDays: integer("payment_terms_days").notNull().default(30),
  taxRate: numeric("tax_rate", { precision: 5, scale: 2 }).notNull().default("0"),
  notifyInvoicePaid: boolean("notify_invoice_paid").notNull().default(true),
  notifyDeadlineApproaching: boolean("notify_deadline_approaching").notNull().default(true),
  notifyWeeklyDigest: boolean("notify_weekly_digest").notNull().default(true),
  onboardingCompleted: boolean("onboarding_completed").notNull().default(false),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type AgencySettings = typeof agencySettingsTable.$inferSelect;
