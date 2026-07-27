-- Client portal users (separate from team users)
CREATE TABLE IF NOT EXISTS client_portal_users (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_login_at TIMESTAMPTZ
);

-- Portal messages (agency ↔ client communication)
CREATE TABLE IF NOT EXISTS client_portal_messages (
  id SERIAL PRIMARY KEY,
  workspace_id INTEGER NOT NULL,
  client_id INTEGER NOT NULL REFERENCES clients(id) ON DELETE CASCADE,
  sender_type TEXT NOT NULL,
  sender_name TEXT NOT NULL,
  message TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Allow sharing documents with client portal
ALTER TABLE documents
  ADD COLUMN IF NOT EXISTS shared_with_client BOOLEAN NOT NULL DEFAULT false;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_client_portal_users_workspace ON client_portal_users(workspace_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_users_client ON client_portal_users(client_id);
CREATE INDEX IF NOT EXISTS idx_client_portal_messages_client ON client_portal_messages(client_id, workspace_id);
