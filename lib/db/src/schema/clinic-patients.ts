import { pgTable, text, serial, timestamp, integer, date } from "drizzle-orm/pg-core";

export const clinicPatientsTable = pgTable("clinic_patients", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  name: text("name").notNull(),
  phone: text("phone"),
  email: text("email"),
  dateOfBirth: date("date_of_birth", { mode: "string" }),
  gender: text("gender"),
  address: text("address"),
  status: text("status").notNull().default("active"),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).notNull().defaultNow().$onUpdate(() => new Date()),
});

export type ClinicPatient = typeof clinicPatientsTable.$inferSelect;
export type InsertClinicPatient = typeof clinicPatientsTable.$inferInsert;
