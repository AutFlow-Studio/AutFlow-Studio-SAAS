import { pgTable, text, serial, timestamp, integer, date, numeric } from "drizzle-orm/pg-core";

export const clinicTreatmentsTable = pgTable("clinic_treatments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  patientId: integer("patient_id").notNull(),
  name: text("name").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("planned"),
  notes: text("notes"),
  cost: numeric("cost", { precision: 15, scale: 2 }),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ClinicTreatment = typeof clinicTreatmentsTable.$inferSelect;
export type InsertClinicTreatment = typeof clinicTreatmentsTable.$inferInsert;
