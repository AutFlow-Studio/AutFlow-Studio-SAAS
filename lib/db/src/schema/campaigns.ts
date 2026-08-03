import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  numeric,
  date,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod/v4";
import { clientsTable } from "./clients";
import { projectsTable } from "./projects";

export const campaignsTable = pgTable("campaigns", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id"),
  clientId: integer("client_id").references(() => clientsTable.id, {
    onDelete: "set null",
  }),
  projectId: integer("project_id").references(() => projectsTable.id, {
    onDelete: "set null",
  }),
  name: text("name").notNull(),
  type: text("type").notNull().default("custom"),
  // seo | paid_ads | social_media | email_marketing | brand_awareness | lead_generation | custom
  goal: text("goal"),
  budget: numeric("budget", { precision: 15, scale: 2 }),
  startDate: date("start_date", { mode: "string" }),
  endDate: date("end_date", { mode: "string" }),
  status: text("status").notNull().default("planning"),
  // planning | active | paused | completed | cancelled
  performanceNotes: text("performance_notes"),
  results: text("results"),
  createdAt: timestamp("created_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export const insertCampaignSchema = createInsertSchema(campaignsTable).omit({
  id: true,
  workspaceId: true,
  createdAt: true,
  updatedAt: true,
});
export type InsertCampaign = z.infer<typeof insertCampaignSchema>;
export type Campaign = typeof campaignsTable.$inferSelect;
