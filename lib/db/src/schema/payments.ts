import {
  pgTable,
  text,
  serial,
  timestamp,
  numeric,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { projectsTable } from "./projects";
import { invoicesTable } from "./invoices";

export const paymentsTable = pgTable("payments", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation column
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }),
  // Link to a formal invoice record (nullable for legacy payments created before invoices table)
  invoiceId: integer("invoice_id").references(() => invoicesTable.id, {
    onDelete: "set null",
  }),
  invoiceNumber: text("invoice_number").notNull(),
  amount: numeric("amount", { precision: 15, scale: 2 }).notNull(),
  status: text("status").notNull().default("pending"),
  dueDate: date("due_date", { mode: "string" }),
  paidDate: date("paid_date", { mode: "string" }),
  paymentMethod: text("payment_method"),
  remainingBalance: numeric("remaining_balance", { precision: 15, scale: 2 }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertPaymentSchema = createInsertSchema(paymentsTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
});
export type InsertPayment = z.infer<typeof insertPaymentSchema>;
export type Payment = typeof paymentsTable.$inferSelect;
