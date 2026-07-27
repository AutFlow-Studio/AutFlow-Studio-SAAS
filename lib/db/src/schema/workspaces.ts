import { pgTable, text, serial, timestamp, integer } from "drizzle-orm/pg-core";

export const workspacesTable = pgTable("workspaces", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  // FK to users.id — not declared as a Drizzle reference to avoid circular deps
  // with users.workspaceId. Enforced via migration SQL.
  ownerId: integer("owner_id").notNull(),
  plan: text("plan").notNull().default("free"), // "free" | "pro" | "enterprise"
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow()
    .$onUpdate(() => new Date()),
});

export type Workspace = typeof workspacesTable.$inferSelect;
