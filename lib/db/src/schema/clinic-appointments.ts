import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";

export const clinicAppointmentsTable = pgTable("clinic_appointments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  patientId: integer("patient_id").notNull(),
  date: date("date", { mode: "string" }).notNull(),
  time: text("time").notNull(),
  type: text("type").notNull().default("consultation"),
  status: text("status").notNull().default("scheduled"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ClinicAppointment = typeof clinicAppointmentsTable.$inferSelect;
export type InsertClinicAppointment = typeof clinicAppointmentsTable.$inferInsert;
