import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
  boolean,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

export const clientPortalUsersTable = pgTable("client_portal_users", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  name: text("name").notNull(),
  isActive: boolean("is_active").notNull().default(true),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
  lastLoginAt: timestamp("last_login_at", { withTimezone: true }),
});

export type ClientPortalUser = typeof clientPortalUsersTable.$inferSelect;
export type PublicClientPortalUser = Omit<ClientPortalUser, "passwordHash">;
