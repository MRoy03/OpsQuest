-- ============================================================
-- OpsQuest Phase 2 — Supabase Schema
-- Run this in your Supabase SQL Editor AFTER supabase-infra-schema.sql
-- Safe to run multiple times (uses IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================

-- ─── 1. MISSING COLUMNS on infrastructure_devices ───────────────────────────
-- The base schema is missing several columns needed by Phase 8-15 features.

ALTER TABLE infrastructure_devices
  ADD COLUMN IF NOT EXISTS agent_id          text UNIQUE,
  ADD COLUMN IF NOT EXISTS enrollment_state  text DEFAULT 'unmanaged',  -- 'unmanaged' | 'managed' | 'retired'
  ADD COLUMN IF NOT EXISTS primary_user_upn  text,
  ADD COLUMN IF NOT EXISTS primary_user_display text,
  ADD COLUMN IF NOT EXISTS notes             text,
  ADD COLUMN IF NOT EXISTS tags              text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS update_ring_id    uuid,
  ADD COLUMN IF NOT EXISTS alerted_offline   timestamptz;

-- ─── 2. UPDATE RINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS update_rings (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name              text NOT NULL,
  description       text,
  color             text DEFAULT '#6366f1',
  quality_defer_days int DEFAULT 7,
  feature_defer_days int DEFAULT 30,
  blocked           boolean DEFAULT false,
  created_at        timestamptz DEFAULT now()
);

-- ─── 3. COMPLIANCE ───────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS compliance_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text DEFAULT 'General',
  description text,
  check_type  text NOT NULL,   -- 'software_present' | 'software_absent' | 'os_version' | 'disk_encrypt' | etc.
  check_value text,
  severity    text DEFAULT 'medium',
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS compliance_results (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL,
  rule_id     uuid REFERENCES compliance_rules(id) ON DELETE CASCADE,
  passed      boolean NOT NULL,
  detail      text,
  checked_at  timestamptz DEFAULT now()
);

-- ─── 4. SOFTWARE BLOCKLIST ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS software_blocklist (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  match_type  text DEFAULT 'contains',   -- 'contains' | 'exact' | 'regex'
  severity    text DEFAULT 'high',
  reason      text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── 5. APP CATALOG ──────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS app_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  winget_id   text UNIQUE NOT NULL,
  category    text DEFAULT 'Other',
  description text,
  emoji       text DEFAULT '📦',
  publisher   text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- ─── 6. DEPLOYMENT QUEUE ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS deployment_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      uuid REFERENCES app_catalog(id) ON DELETE CASCADE,
  agent_ids   text[] NOT NULL,
  action      text DEFAULT 'install',   -- 'install' | 'uninstall'
  status      text DEFAULT 'queued',    -- 'queued' | 'running' | 'done' | 'failed'
  started_at  timestamptz,
  finished_at timestamptz,
  results     jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);

-- ─── 7. INCIDENTS / NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  message     text,
  severity    text DEFAULT 'low',     -- 'low' | 'medium' | 'high' | 'critical'
  source      text,
  device_name text,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);

-- ─── 8. AUDIT LOG ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email         text,
  actor_upn           text,
  action              text NOT NULL,
  target_type         text,
  target_id           text,
  target_name         text,
  detail              jsonb DEFAULT '{}',
  created_at          timestamptz DEFAULT now()
);

-- ─── 9. HARDWARE HISTORY ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hardware_history (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  recorded_at   timestamptz DEFAULT now(),
  cpu_load      numeric,
  ram_used_gb   numeric,
  ram_total_gb  numeric,
  disk_snapshots jsonb DEFAULT '[]',
  net_stats     jsonb DEFAULT '[]'
);

-- ─── 10. SCHEDULED SCRIPTS ───────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS scheduled_scripts (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name          text NOT NULL,
  description   text,
  script_body   text NOT NULL,
  script_type   text DEFAULT 'powershell',  -- 'powershell' | 'batch'
  trigger_type  text DEFAULT 'manual',       -- 'manual' | 'daily' | 'weekly' | 'on_login'
  trigger_time  text,
  active        boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS script_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id   uuid REFERENCES scheduled_scripts(id) ON DELETE CASCADE,
  agent_id    text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(script_id, agent_id)
);

-- ─── 11. CONFIG PROFILES ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS config_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  settings    jsonb DEFAULT '[]',   -- array of { key, value, type, description }
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS profile_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid REFERENCES config_profiles(id) ON DELETE CASCADE,
  agent_id    text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  applied_at  timestamptz,
  UNIQUE(profile_id, agent_id)
);

-- ─── 12. PRINTERS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS printers (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  hostname      text,
  device_ip     text,
  printer_name  text NOT NULL,
  driver_name   text,
  port_name     text,
  status        text DEFAULT 'unknown',
  is_default    boolean DEFAULT false,
  is_shared     boolean DEFAULT false,
  last_seen     timestamptz DEFAULT now(),
  UNIQUE(agent_id, printer_name)
);

-- ─── 13. NETWORK CONNECTIONS (Phase A) ───────────────────────────────────────
-- DELETE+INSERT snapshot — agent replaces its own rows on each heartbeat
CREATE TABLE IF NOT EXISTS net_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  hostname      text,
  device_ip     text,
  local_ip      text NOT NULL,
  local_port    int,
  remote_ip     text,
  remote_port   int,
  state         text,                 -- 'Established' | 'Listen' | 'Bound' | 'TimeWait' | ...
  protocol_tcp  text DEFAULT 'TCP',   -- 'TCP' | 'UDP'
  app_protocol  text,                 -- 'HTTP' | 'HTTPS' | 'RDP' | 'SSH' | ...
  process_name  text,
  pid           int,
  risk_level    text DEFAULT 'low',   -- 'low' | 'medium' | 'high' | 'critical'
  risk_reason   text,
  captured_at   timestamptz DEFAULT now()
);

-- Patch pre-existing net_connections tables that may be missing columns
ALTER TABLE net_connections
  ADD COLUMN IF NOT EXISTS hostname      text,
  ADD COLUMN IF NOT EXISTS device_ip     text,
  ADD COLUMN IF NOT EXISTS remote_ip     text,
  ADD COLUMN IF NOT EXISTS remote_port   int,
  ADD COLUMN IF NOT EXISTS protocol_tcp  text DEFAULT 'TCP',
  ADD COLUMN IF NOT EXISTS app_protocol  text,
  ADD COLUMN IF NOT EXISTS process_name  text,
  ADD COLUMN IF NOT EXISTS pid           int,
  ADD COLUMN IF NOT EXISTS risk_level    text DEFAULT 'low',
  ADD COLUMN IF NOT EXISTS risk_reason   text,
  ADD COLUMN IF NOT EXISTS captured_at   timestamptz DEFAULT now();

CREATE INDEX IF NOT EXISTS idx_net_connections_agent  ON net_connections(agent_id);
CREATE INDEX IF NOT EXISTS idx_net_connections_risk   ON net_connections(risk_level);
CREATE INDEX IF NOT EXISTS idx_net_connections_state  ON net_connections(state);

-- ─── 14. DNS DOMAINS (Phase B) ────────────────────────────────────────────────
-- UPSERT merge — each unique (agent_id, name, record_type) is kept once
CREATE TABLE IF NOT EXISTS dns_domains (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  hostname      text,
  name          text NOT NULL,        -- domain name e.g. 'api.example.com'
  record_type   text DEFAULT 'A',     -- 'A' | 'CNAME' | 'MX' | 'TXT' | ...
  data          text,                 -- resolved IP or CNAME value
  ttl           int,
  first_seen    timestamptz DEFAULT now(),
  last_seen     timestamptz DEFAULT now(),
  suspicious    boolean DEFAULT false,
  UNIQUE(agent_id, name, record_type)
);

-- Patch pre-existing dns_domains tables that may be missing columns
ALTER TABLE dns_domains
  ADD COLUMN IF NOT EXISTS hostname    text,
  ADD COLUMN IF NOT EXISTS data        text,
  ADD COLUMN IF NOT EXISTS ttl         int,
  ADD COLUMN IF NOT EXISTS first_seen  timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS suspicious  boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dns_domains_agent      ON dns_domains(agent_id);
CREATE INDEX IF NOT EXISTS idx_dns_domains_suspicious ON dns_domains(suspicious);

-- ─── 15. USER ROLES & PERMISSIONS (Superadmin Panel) ────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  text UNIQUE NOT NULL,
  role        text NOT NULL DEFAULT 'user',   -- 'user' | 'admin'
  granted_by  text,
  granted_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_page_permissions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  text NOT NULL,
  page_path   text NOT NULL,
  granted_by  text,
  granted_at  timestamptz DEFAULT now(),
  UNIQUE(user_email, page_path)
);

-- ─── 16. USER SESSIONS (Live Session Tracking) ────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  text NOT NULL UNIQUE,
  last_seen   timestamptz DEFAULT now(),
  current_page text,
  user_agent  text,
  sign_in_at  timestamptz DEFAULT now()
);

-- ─── 17. CLEANUP RPC (used by agent every 24h) ───────────────────────────────
-- Removes stale agent data. Called by agent.exe via anon key.
-- Uses SECURITY DEFINER so anon key can trigger privileged DELETEs.
CREATE OR REPLACE FUNCTION cleanup_old_agent_data(p_agent_id text, cutoff_days int DEFAULT 30)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  DELETE FROM net_connections
  WHERE agent_id = p_agent_id
    AND captured_at < now() - (cutoff_days || ' days')::interval;

  DELETE FROM dns_domains
  WHERE agent_id = p_agent_id
    AND last_seen < now() - (cutoff_days || ' days')::interval;

  DELETE FROM hardware_history
  WHERE agent_id = p_agent_id
    AND recorded_at < now() - (cutoff_days || ' days')::interval;
END;
$$;

-- Grant execute to anon so agent can call it without service_role key
GRANT EXECUTE ON FUNCTION cleanup_old_agent_data(text, int) TO anon;

-- ─── 18. ROW LEVEL SECURITY ──────────────────────────────────────────────────
-- All new tables: authenticated users read, service_role writes (via API routes)

ALTER TABLE net_connections         ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_domains             ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles              ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_page_permissions   ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions           ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents               ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log               ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_history        ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules        ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_results      ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_blocklist      ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_catalog             ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_jobs         ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_rings            ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_scripts       ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_assignments      ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_profiles         ENABLE ROW LEVEL SECURITY;
ALTER TABLE profile_assignments     ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers                ENABLE ROW LEVEL SECURITY;

-- Authenticated users can read everything
CREATE POLICY "auth read net_connections"       ON net_connections         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dns_domains"           ON dns_domains             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read user_roles"            ON user_roles              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read page_permissions"      ON user_page_permissions   FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read user_sessions"         ON user_sessions           FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read incidents"             ON incidents               FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read audit_log"             ON audit_log               FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read hardware_history"      ON hardware_history        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read compliance_rules"      ON compliance_rules        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read compliance_results"    ON compliance_results      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read software_blocklist"    ON software_blocklist      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read app_catalog"           ON app_catalog             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read deployment_jobs"       ON deployment_jobs         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read update_rings"          ON update_rings            FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read scheduled_scripts"     ON scheduled_scripts       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read script_assignments"    ON script_assignments      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read config_profiles"       ON config_profiles         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read profile_assignments"   ON profile_assignments     FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read printers"              ON printers                FOR SELECT TO authenticated USING (true);

-- Agent (anon key) can write net_connections and dns_domains
CREATE POLICY "anon insert net_connections"     ON net_connections         FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon delete net_connections"     ON net_connections         FOR DELETE TO anon USING (true);
CREATE POLICY "anon upsert dns_domains"         ON dns_domains             FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update dns_domains"         ON dns_domains             FOR UPDATE TO anon USING (true);
CREATE POLICY "anon insert hardware_history"    ON hardware_history        FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert printers"            ON printers                FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update printers"            ON printers                FOR UPDATE TO anon USING (true);

-- Authenticated users can insert into sessions (heartbeat)
CREATE POLICY "auth upsert user_sessions"       ON user_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);
-- Allow anon insert for incidents (alert pipeline)
CREATE POLICY "anon insert incidents"           ON incidents               FOR INSERT TO anon WITH CHECK (true);
-- Allow authenticated to insert incidents (superadmin / server side)
CREATE POLICY "auth insert incidents"           ON incidents               FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth insert audit_log"           ON audit_log               FOR INSERT TO authenticated WITH CHECK (true);
