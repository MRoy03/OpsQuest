-- ─── Tickets Table ────────────────────────────────────────────────────────────
-- Run this in your Supabase SQL Editor to enable real ticket persistence.
-- Safe to re-run (IF NOT EXISTS / idempotent).

CREATE TABLE IF NOT EXISTS tickets (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  description     text        DEFAULT '',
  priority        text        NOT NULL DEFAULT 'medium'
                              CHECK (priority IN ('critical','high','medium','low')),
  status          text        NOT NULL DEFAULT 'open'
                              CHECK (status IN ('open','in_progress','resolved','closed')),
  category        text        DEFAULT 'software',
  user_email      text        NOT NULL,
  user_name       text,
  assigned_to     text,
  solutions_tried text[]      DEFAULT '{}',
  system_info     text,
  created_at      timestamptz DEFAULT now(),
  updated_at      timestamptz DEFAULT now()
);

-- ─── Patch existing table (safe if columns already exist) ────────────────────
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_email      text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS user_name       text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS assigned_to     text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS solutions_tried text[]      DEFAULT '{}';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS system_info     text;
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS description     text        DEFAULT '';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS priority        text        DEFAULT 'medium';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS status          text        DEFAULT 'open';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS category        text        DEFAULT 'software';
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS created_at      timestamptz DEFAULT now();
ALTER TABLE tickets ADD COLUMN IF NOT EXISTS updated_at      timestamptz DEFAULT now();

-- Backfill user_email for any rows that have a null value (prevents NOT NULL issues)
UPDATE tickets SET user_email = 'unknown@company.com' WHERE user_email IS NULL;

-- ─── Indexes ──────────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_tickets_status     ON tickets(status);
CREATE INDEX IF NOT EXISTS idx_tickets_priority   ON tickets(priority);
CREATE INDEX IF NOT EXISTS idx_tickets_user_email ON tickets(user_email);
CREATE INDEX IF NOT EXISTS idx_tickets_created_at ON tickets(created_at DESC);

-- ─── Auto-update updated_at ──────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION tickets_set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS tickets_updated_at ON tickets;
CREATE TRIGGER tickets_updated_at
  BEFORE UPDATE ON tickets
  FOR EACH ROW EXECUTE FUNCTION tickets_set_updated_at();

-- ─── Row Level Security ───────────────────────────────────────────────────────
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read tickets (scoping is done at API layer)
DROP POLICY IF EXISTS "auth read tickets" ON tickets;
CREATE POLICY "auth read tickets"
  ON tickets FOR SELECT TO authenticated
  USING (true);

-- Authenticated users can insert their own tickets
DROP POLICY IF EXISTS "auth insert tickets" ON tickets;
CREATE POLICY "auth insert tickets"
  ON tickets FOR INSERT TO authenticated
  WITH CHECK (true);

-- Authenticated users can update tickets
DROP POLICY IF EXISTS "auth update tickets" ON tickets;
CREATE POLICY "auth update tickets"
  ON tickets FOR UPDATE TO authenticated
  USING (true);

-- Service role (API) can do everything
DROP POLICY IF EXISTS "service all tickets" ON tickets;
CREATE POLICY "service all tickets"
  ON tickets FOR ALL TO service_role
  USING (true) WITH CHECK (true);
