import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";

export const clinicFollowupsTable = pgTable("clinic_followups", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  patientId: integer("patient_id").notNull(),
  reason: text("reason").notNull(),
  dueDate: date("due_date", { mode: "string" }).notNull(),
  status: text("status").notNull().default("pending"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ClinicFollowup = typeof clinicFollowupsTable.$inferSelect;
export type InsertClinicFollowup = typeof clinicFollowupsTable.$inferInsert;
