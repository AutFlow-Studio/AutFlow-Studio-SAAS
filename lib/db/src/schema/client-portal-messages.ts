import {
  pgTable,
  text,
  serial,
  timestamp,
  integer,
} from "drizzle-orm/pg-core";
import { clientsTable } from "./clients";

/**
 * Messages exchanged between agency team and client portal users.
 * These are NOT internal notes — only content explicitly sent
 * through the portal is stored here.
 */
export const clientPortalMessagesTable = pgTable("client_portal_messages", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  clientId: integer("client_id")
    .notNull()
    .references(() => clientsTable.id, { onDelete: "cascade" }),
  /** "agency" = sent by a team member, "client" = sent by client portal user */
  senderType: text("sender_type").notNull(), // "agency" | "client"
  senderName: text("sender_name").notNull(),
  message: text("message").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).notNull().defaultNow(),
});

export type ClientPortalMessage = typeof clientPortalMessagesTable.$inferSelect;
