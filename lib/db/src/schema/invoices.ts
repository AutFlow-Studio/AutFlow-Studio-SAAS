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

/**
 * Invoice entity — represents a formal invoice sent to a client.
 * The payments table records actual payment transactions against an invoice.
 *
 * Invoice lifecycle:
 *   draft → sent → paid | overdue | cancelled
 */
export const invoicesTable = pgTable("invoices", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation column
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }),
  invoiceNumber: text("invoice_number").notNull(),
  // Status: draft | sent | paid | overdue | cancelled
  status: text("status").notNull().default("draft"),
  subtotal: numeric("subtotal", { precision: 15, scale: 2 }).notNull(),
  tax: numeric("tax", { precision: 15, scale: 2 }),
  total: numeric("total", { precision: 15, scale: 2 }).notNull(),
  amountPaid: numeric("amount_paid", { precision: 15, scale: 2 })
    .notNull()
    .default("0"),
  // lineItems stored as JSON text: [{ description, quantity, unitPrice, amount }]
  lineItems: text("line_items"),
  dueDate: date("due_date", { mode: "string" }),
  paidDate: date("paid_date", { mode: "string" }),
  sentAt: timestamp("sent_at", { withTimezone: true }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertInvoiceSchema = createInsertSchema(invoicesTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertInvoice = z.infer<typeof insertInvoiceSchema>;
export type Invoice = typeof invoicesTable.$inferSelect;
