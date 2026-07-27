/**
 * Definitive migration script — creates and evolves every table the app needs.
 *
 * Safe to run multiple times — all statements use CREATE TABLE IF NOT EXISTS /
 * ALTER TABLE ... ADD COLUMN IF NOT EXISTS / CREATE INDEX IF NOT EXISTS.
 *
 * Multi-tenant additions (idempotent):
 *   • workspaces table
 *   • email_verification_tokens table
 *   • workspace_id column on all business tables
 *   • is_email_verified / email_verified_at on users
 *   • business_type on agency_settings
 *   • Existing users are given a default workspace and marked verified
 *
 * Run order:
 *   pnpm --filter @workspace/scripts run migrate
 */
import { pool } from "@workspace/db";
import bcrypt from "bcryptjs";

async function migrate() {
  const client = await pool.connect();
  try {
    // ── Core business tables ──────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS clients (
        id               SERIAL PRIMARY KEY,
        company_name     TEXT NOT NULL,
        logo_url         TEXT,
        industry         TEXT,
        website          TEXT,
        email            TEXT,
        phone            TEXT,
        primary_contact  TEXT,
        secondary_contact TEXT,
        address          TEXT,
        timezone         TEXT,
        status           TEXT NOT NULL DEFAULT 'active',
        start_date       DATE,
        contract_value   NUMERIC(15,2),
        monthly_retainer NUMERIC(15,2),
        payment_method   TEXT,
        notes            TEXT,
        tags             TEXT[] NOT NULL DEFAULT '{}',
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS projects (
        id               SERIAL PRIMARY KEY,
        client_id        INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        name             TEXT NOT NULL,
        status           TEXT NOT NULL DEFAULT 'planning',
        priority         TEXT NOT NULL DEFAULT 'medium',
        progress         INTEGER NOT NULL DEFAULT 0,
        start_date       DATE,
        deadline         DATE,
        estimated_budget NUMERIC(15,2),
        actual_cost      NUMERIC(15,2),
        revenue          NUMERIC(15,2),
        description      TEXT,
        owner_notes      TEXT,
        created_at       TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at       TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS deliverables (
        id              SERIAL PRIMARY KEY,
        project_id      INTEGER NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
        title           TEXT NOT NULL,
        status          TEXT NOT NULL DEFAULT 'pending',
        deadline        DATE,
        assigned_to     TEXT,
        completion_date DATE,
        notes           TEXT,
        created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS payments (
        id                SERIAL PRIMARY KEY,
        client_id         INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        project_id        INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        invoice_number    TEXT NOT NULL,
        amount            NUMERIC(15,2) NOT NULL,
        status            TEXT NOT NULL DEFAULT 'pending',
        due_date          DATE,
        paid_date         DATE,
        payment_method    TEXT,
        remaining_balance NUMERIC(15,2),
        notes             TEXT,
        created_at        TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS documents (
        id         SERIAL PRIMARY KEY,
        client_id  INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        title      TEXT NOT NULL,
        type       TEXT NOT NULL DEFAULT 'other',
        url        TEXT,
        notes      TEXT,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notes (
        id         SERIAL PRIMARY KEY,
        client_id  INTEGER REFERENCES clients(id) ON DELETE CASCADE,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        content    TEXT NOT NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS meetings (
        id           SERIAL PRIMARY KEY,
        client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        date         TIMESTAMPTZ NOT NULL,
        summary      TEXT,
        action_items TEXT,
        next_meeting TIMESTAMPTZ,
        attachments  TEXT,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS tasks (
        id         SERIAL PRIMARY KEY,
        title      TEXT NOT NULL,
        priority   TEXT NOT NULL DEFAULT 'medium',
        status     TEXT NOT NULL DEFAULT 'todo',
        deadline   DATE,
        notes      TEXT,
        client_id  INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        project_id INTEGER REFERENCES projects(id) ON DELETE SET NULL,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS activity (
        id          SERIAL PRIMARY KEY,
        type        TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id   INTEGER,
        description TEXT NOT NULL,
        client_id   INTEGER REFERENCES clients(id) ON DELETE SET NULL,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS agency_settings (
        id                          SERIAL PRIMARY KEY,
        agency_name                 TEXT NOT NULL DEFAULT 'AutFlow Studio',
        agency_email                TEXT NOT NULL DEFAULT 'hello@autflowstudio.com',
        website                     TEXT,
        support_email               TEXT,
        logo_url                    TEXT,
        default_currency            TEXT NOT NULL DEFAULT 'USD',
        timezone                    TEXT NOT NULL DEFAULT 'UTC',
        invoice_prefix              TEXT NOT NULL DEFAULT 'INV',
        payment_terms_days          INTEGER NOT NULL DEFAULT 30,
        tax_rate                    NUMERIC(5,2) NOT NULL DEFAULT 0,
        notify_invoice_paid         BOOLEAN NOT NULL DEFAULT TRUE,
        notify_deadline_approaching BOOLEAN NOT NULL DEFAULT TRUE,
        notify_weekly_digest        BOOLEAN NOT NULL DEFAULT TRUE,
        updated_at                  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    await client.query(`
      CREATE TABLE IF NOT EXISTS notifications (
        id          SERIAL PRIMARY KEY,
        type        TEXT NOT NULL,
        title       TEXT NOT NULL,
        message     TEXT NOT NULL,
        entity_type TEXT NOT NULL,
        entity_id   INTEGER,
        href        TEXT,
        is_read     BOOLEAN NOT NULL DEFAULT FALSE,
        created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);

    // ── Auth tables ────────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id            SERIAL PRIMARY KEY,
        name          TEXT NOT NULL,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        role          TEXT NOT NULL DEFAULT 'member',
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )
    `);

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS avatar_url TEXT`);

    // ── Multi-tenant: workspaces ───────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS workspaces (
        id         SERIAL PRIMARY KEY,
        name       TEXT NOT NULL,
        owner_id   INTEGER NOT NULL,
        plan       TEXT NOT NULL DEFAULT 'free',
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_workspaces_owner_id ON workspaces (owner_id)`);

    // ── Multi-tenant: user columns ────────────────────────────────────────

    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS workspace_id INTEGER`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS is_email_verified BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at TIMESTAMPTZ`);

    // ── Multi-tenant: workspace_id on all business tables ─────────────────

    for (const table of [
      "clients", "projects", "tasks", "payments", "documents",
      "meetings", "notes", "activity", "notifications",
    ]) {
      await client.query(`ALTER TABLE ${table} ADD COLUMN IF NOT EXISTS workspace_id INTEGER`);
    }

    // agency_settings: workspace_id + onboarding_completed + business_type
    await client.query(`ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS workspace_id INTEGER`);
    await client.query(`ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS onboarding_completed BOOLEAN NOT NULL DEFAULT FALSE`);
    await client.query(`ALTER TABLE agency_settings ADD COLUMN IF NOT EXISTS business_type TEXT`);

    // ── Multi-tenant: email verification tokens ───────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS email_verification_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_token ON email_verification_tokens (token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_email_verification_tokens_user_id ON email_verification_tokens (user_id)`);

    // ── Performance indexes ───────────────────────────────────────────────

    await client.query(`CREATE INDEX IF NOT EXISTS idx_clients_workspace_id ON clients (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_projects_workspace_id ON projects (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_tasks_workspace_id ON tasks (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_payments_workspace_id ON payments (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_documents_workspace_id ON documents (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_meetings_workspace_id ON meetings (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notes_workspace_id ON notes (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_activity_workspace_id ON activity (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_notifications_workspace_id ON notifications (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_agency_settings_workspace_id ON agency_settings (workspace_id)`);

    // ── Password reset tokens ─────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS password_reset_tokens (
        id         SERIAL PRIMARY KEY,
        user_id    INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        token      TEXT NOT NULL UNIQUE,
        expires_at TIMESTAMPTZ NOT NULL,
        used_at    TIMESTAMPTZ,
        created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_token ON password_reset_tokens (token)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_password_reset_tokens_user_id ON password_reset_tokens (user_id)`);

    // ── Sessions ──────────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS sessions (
        sid    VARCHAR      NOT NULL COLLATE "default",
        sess   JSON         NOT NULL,
        expire TIMESTAMP(6) NOT NULL,
        CONSTRAINT sessions_pkey PRIMARY KEY (sid) NOT DEFERRABLE INITIALLY IMMEDIATE
      ) WITH (OIDS=FALSE)
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_sessions_expire ON sessions (expire)`);

    // ── Client Portal ─────────────────────────────────────────────────────

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_portal_users (
        id            SERIAL PRIMARY KEY,
        workspace_id  INTEGER NOT NULL,
        client_id     INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        email         TEXT NOT NULL UNIQUE,
        password_hash TEXT NOT NULL,
        name          TEXT NOT NULL,
        is_active     BOOLEAN NOT NULL DEFAULT TRUE,
        created_at    TIMESTAMPTZ NOT NULL DEFAULT NOW(),
        last_login_at TIMESTAMPTZ
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_portal_users_workspace ON client_portal_users (workspace_id)`);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_portal_users_client ON client_portal_users (client_id)`);

    await client.query(`
      CREATE TABLE IF NOT EXISTS client_portal_messages (
        id           SERIAL PRIMARY KEY,
        workspace_id INTEGER NOT NULL,
        client_id    INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
        sender_type  TEXT NOT NULL,
        sender_name  TEXT NOT NULL,
        message      TEXT NOT NULL,
        created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    await client.query(`CREATE INDEX IF NOT EXISTS idx_client_portal_messages_client ON client_portal_messages (client_id, workspace_id)`);

    await client.query(`ALTER TABLE documents ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN NOT NULL DEFAULT FALSE`);

    console.log("✓ All tables and columns ensured.");

    // ── Migrate existing users: create workspaces for any without one ─────

    const { rows: unlinkedUsers } = await client.query<{ id: number; name: string; email: string }>(
      `SELECT id, name, email FROM users WHERE workspace_id IS NULL ORDER BY id`
    );

    for (const user of unlinkedUsers) {
      const { rows: wsRows } = await client.query<{ id: number }>(
        `INSERT INTO workspaces (name, owner_id, plan) VALUES ($1, $2, 'free') RETURNING id`,
        [`${user.name}'s Workspace`, user.id]
      );
      const wsId = wsRows[0]!.id;

      await client.query(`UPDATE users SET workspace_id = $1 WHERE id = $2`, [wsId, user.id]);

      // Assign existing unlinked data to this workspace
      for (const table of ["clients", "projects", "tasks", "payments", "documents", "meetings", "notes", "activity", "notifications"]) {
        await client.query(`UPDATE ${table} SET workspace_id = $1 WHERE workspace_id IS NULL`, [wsId]);
      }
      await client.query(`UPDATE agency_settings SET workspace_id = $1 WHERE workspace_id IS NULL`, [wsId]);

      console.log(`✓ Workspace created for existing user: ${user.email} (workspace ${wsId})`);
    }

    // Mark all existing users as email-verified (they were already using the app)
    await client.query(`
      UPDATE users
      SET is_email_verified = TRUE, email_verified_at = NOW()
      WHERE is_email_verified = FALSE
    `);

    // ── Default admin user (only when no users exist at all) ──────────────

    const { rows } = await client.query<{ count: string }>(`SELECT COUNT(*)::text AS count FROM users`);
    const userCount = parseInt(rows[0]!.count, 10);

    if (userCount === 0) {
      const hash = await bcrypt.hash("admin123", 12);

      const { rows: wsRows } = await client.query<{ id: number }>(
        `INSERT INTO workspaces (name, owner_id, plan) VALUES ('My Workspace', 1, 'free') RETURNING id`
      );
      // Note: owner_id = 1 is a forward reference; we'll update after user insert
      const wsId = wsRows[0]!.id;

      const { rows: userRows } = await client.query<{ id: number }>(
        `INSERT INTO users (name, email, password_hash, role, workspace_id, is_email_verified, email_verified_at)
         VALUES ($1, $2, $3, $4, $5, TRUE, NOW())
         ON CONFLICT (email) DO NOTHING
         RETURNING id`,
        ["Admin", "admin@autflow.io", hash, "owner", wsId]
      );

      if (userRows[0]) {
        const userId = userRows[0].id;
        await client.query(`UPDATE workspaces SET owner_id = $1 WHERE id = $2`, [userId, wsId]);
        await client.query(
          `INSERT INTO agency_settings (workspace_id, agency_name, onboarding_completed)
           VALUES ($1, 'AutFlow Studio', FALSE)
           ON CONFLICT DO NOTHING`,
          [wsId]
        );
      }

      console.log("✓ Default admin user created (admin@autflow.io).");
    } else {
      console.log(`✓ ${userCount} user(s) already exist — skipping default admin.`);
    }

    console.log("✓ Migration complete.");
  } finally {
    client.release();
  }
  await pool.end();
}

migrate().catch((err) => {
  console.error("Migration failed:", err);
  process.exit(1);
});
