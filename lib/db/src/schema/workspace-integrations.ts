import { pgTable, serial, integer, text, timestamp } from "drizzle-orm/pg-core";

/**
 * Stores encrypted API keys for third-party integrations, scoped per workspace.
 * Keys are encrypted at rest using AES-256-GCM (see api-server/lib/encryption.ts).
 * The plaintext key is NEVER returned to the browser.
 *
 * Supported providers: openai, resend, anthropic, gemini, grok, …
 * Add new providers by inserting rows — no schema change required.
 */
export const workspaceIntegrationsTable = pgTable("workspace_integrations", {
  id: serial("id").primaryKey(),
  workspaceId: integer("workspace_id").notNull(),
  /** Provider slug: 'openai' | 'resend' | 'anthropic' | 'gemini' | … */
  provider: text("provider").notNull(),
  /** AES-256-GCM encrypted key: `${iv_hex}:${authTag_hex}:${ciphertext_hex}` */
  encryptedKey: text("encrypted_key").notNull(),
  configuredAt: timestamp("configured_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp("updated_at", { withTimezone: true })
    .notNull()
    .defaultNow(),
});

export type WorkspaceIntegration =
  typeof workspaceIntegrationsTable.$inferSelect;
