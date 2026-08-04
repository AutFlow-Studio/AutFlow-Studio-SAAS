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

/**
 * Project lifecycle statuses:
 *   planning → in_progress → client_review ↔ revision → completed | archived
 */
export const projectsTable = pgTable("projects", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation column
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  name: text("name").notNull(),
  // Status: planning | in_progress | client_review | revision | completed | archived
  status: text("status").notNull().default("planning"),
  priority: text("priority").notNull().default("medium"), // low | medium | high | urgent
  progress: integer("progress").notNull().default(0),     // 0–100
  startDate: date("start_date", { mode: "string" }),
  deadline: date("deadline", { mode: "string" }),
  estimatedBudget: numeric("estimated_budget", { precision: 15, scale: 2 }),
  actualCost: numeric("actual_cost", { precision: 15, scale: 2 }),
  revenue: numeric("revenue", { precision: 15, scale: 2 }),
  description: text("description"),
  ownerNotes: text("owner_notes"),
  // Blockers free-text — surfaces in health calculation and AI context
  blockers: text("blockers"),
  // Date when the project entered client_review; used for client wait-time health metric
  clientWaitingSince: date("client_waiting_since", { mode: "string" }),
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

export const insertProjectSchema = createInsertSchema(projectsTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertProject = z.infer<typeof insertProjectSchema>;
export type Project = typeof projectsTable.$inferSelect;
