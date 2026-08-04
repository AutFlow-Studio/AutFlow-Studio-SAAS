import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  date,
  integer,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";

/**
 * Client lifecycle statuses (lifecycleStatus):
 *   lead → prospect → active | at_risk → completed | archived
 *
 * The legacy `status` column (active | inactive) is kept for backward compat.
 */
export const clientsTable = pgTable("clients", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation column
  companyName: text("company_name").notNull(),
  logoUrl: text("logo_url"),
  industry: text("industry"),
  website: text("website"),
  email: text("email"),
  phone: text("phone"),
  primaryContact: text("primary_contact"),
  secondaryContact: text("secondary_contact"),
  address: text("address"),
  timezone: text("timezone"),
  // Legacy operational status (active | inactive) — kept for compat
  status: text("status").notNull().default("active"),
  // Full agency lifecycle: lead | prospect | active | at_risk | completed | archived
  lifecycleStatus: text("lifecycle_status").notNull().default("active"),
  startDate: date("start_date", { mode: "string" }),
  contractValue: numeric("contract_value", { precision: 15, scale: 2 }),
  monthlyRetainer: numeric("monthly_retainer", { precision: 15, scale: 2 }),
  paymentMethod: text("payment_method"),
  notes: text("notes"),
  tags: text("tags").array().notNull().default([]),
  // Computed health score (0–100); updated by health calculation job / AI
  healthScore: integer("health_score"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertClientSchema = createInsertSchema(clientsTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertClient = z.infer<typeof insertClientSchema>;
export type Client = typeof clientsTable.$inferSelect;
