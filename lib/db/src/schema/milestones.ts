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

export const milestonesTable = pgTable("milestones", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "cascade",
  }),
  name: text("name").notNull(),
  description: text("description"),
  dueDate: date("due_date", { mode: "string" }),
  status: text("status").notNull().default("pending"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export const insertMilestoneSchema = createInsertSchema(milestonesTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertMilestone = z.infer<typeof insertMilestoneSchema>;
export type Milestone = typeof milestonesTable.$inferSelect;
