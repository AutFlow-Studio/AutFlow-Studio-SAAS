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
import { clientsTable } from "./clients";
import { projectsTable } from "./projects";
import { usersTable } from "./users";

export const tasksTable = pgTable("tasks", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"), // tenant isolation column
  title: text("title").notNull(),
  priority: text("priority").notNull().default("medium"), // low | medium | high | urgent
  status: text("status").notNull().default("todo"),       // todo | in_progress | blocked | done
  sortOrder: integer("sort_order").notNull().default(0),
  deadline: date("deadline", { mode: "string" }),
  notes: text("notes"),
  clientId: integer("client_id").references(() => clientsTable.id, {
    onDelete: "set null",
  }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }),
  assigneeId: integer("assignee_id").references(() => usersTable.id, {
    onDelete: "set null",
  }),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertTaskSchema = createInsertSchema(tasksTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasksTable.$inferSelect;
