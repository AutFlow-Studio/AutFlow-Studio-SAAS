import { pgTable, text, serial, timestamp, integer, date, numeric } from "drizzle-orm/pg-core";

export const clinicBillingTable = pgTable("clinic_billing", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  patientId: integer("patient_id").notNull(),
  description: text("description").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date", { mode: "string" }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ClinicBilling = typeof clinicBillingTable.$inferSelect;
export type InsertClinicBilling = typeof clinicBillingTable.$inferInsert;
