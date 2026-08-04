import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

/**
 * Deliverable lifecycle statuses:
 *   draft → internal_review → sent → approved | changes_requested
 */
export const deliverablesTable = pgTable("deliverables", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation — backfilled by migration
  projectId: integer("project_id")
    .notNull()
    .references(() => projectsTable.id, { onDelete: "cascade" }),
  title: text("title").notNull(),
  // Status lifecycle: draft | internal_review | sent | approved | changes_requested
  // Legacy value "pending" is treated as "draft" by the UI
  status: text("status").notNull().default("draft"),
  deadline: date("deadline", { mode: "string" }),
  assignedTo: text("assigned_to"),       // legacy free-text, kept for compat
  assigneeId: integer("assignee_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  completionDate: date("completion_date", { mode: "string" }),
  notes: text("notes"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertDeliverableSchema = createInsertSchema(
  deliverablesTable,
).omit({ id: true, workspaceId: true, createdAt: true });
export type InsertDeliverable = z.infer<typeof insertDeliverableSchema>;
export type Deliverable = typeof deliverablesTable.$inferSelect;
