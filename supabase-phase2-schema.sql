-- ============================================================
-- OpsQuest Phase 2 — Complete Supabase Schema
-- Run in Supabase SQL Editor AFTER supabase-infra-schema.sql
-- Fully idempotent: safe to re-run (IF NOT EXISTS / ADD COLUMN IF NOT EXISTS)
-- ============================================================


-- ─── 1. PATCH infrastructure_devices (missing columns) ───────────────────────
ALTER TABLE infrastructure_devices
  ADD COLUMN IF NOT EXISTS agent_id             text UNIQUE,
  ADD COLUMN IF NOT EXISTS enrollment_state     text DEFAULT 'unmanaged',
  ADD COLUMN IF NOT EXISTS primary_user_upn     text,
  ADD COLUMN IF NOT EXISTS primary_user_display text,
  ADD COLUMN IF NOT EXISTS notes                text,
  ADD COLUMN IF NOT EXISTS tags                 text[] DEFAULT '{}',
  ADD COLUMN IF NOT EXISTS update_ring_id       uuid,
  ADD COLUMN IF NOT EXISTS alerted_offline      timestamptz,
  ADD COLUMN IF NOT EXISTS hw_uuid              text,
  ADD COLUMN IF NOT EXISTS security_posture     jsonb DEFAULT '{}';


-- ─── 2. AGENT COMMANDS ───────────────────────────────────────────────────────
-- Central command queue: dashboard writes, agent polls and executes
CREATE TABLE IF NOT EXISTS agent_commands (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  command_type  text NOT NULL,   -- 'run_script'|'restart_device'|'capture_screen'|'lock_screen'|...
  payload       jsonb DEFAULT '{}',
  status        text DEFAULT 'pending',  -- 'pending'|'running'|'done'|'error'
  result        text,
  label         text,
  created_at    timestamptz DEFAULT now(),
  updated_at    timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_agent_commands_agent   ON agent_commands(agent_id);
CREATE INDEX IF NOT EXISTS idx_agent_commands_status  ON agent_commands(status);
CREATE INDEX IF NOT EXISTS idx_agent_commands_created ON agent_commands(created_at DESC);


-- ─── 3. SCREENSHOTS ──────────────────────────────────────────────────────────
-- screencap.exe uploads PNG to Supabase Storage and writes a row here
-- Column names MUST match what screencap.js inserts exactly
CREATE TABLE IF NOT EXISTS screenshots (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  device_name   text,            -- os.hostname() from screencap.js
  storage_path  text NOT NULL,   -- path in the 'screenshots' storage bucket
  public_url    text,            -- full public URL returned by storage upload
  width         int,
  height        int,
  file_size_kb  int,             -- file size in kilobytes
  taken_at      timestamptz DEFAULT now()
);
-- Patch any pre-existing screenshots tables that may have wrong columns
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS device_name  text;
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS public_url   text;
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS file_size_kb int;
ALTER TABLE screenshots ADD COLUMN IF NOT EXISTS taken_at     timestamptz DEFAULT now();
CREATE INDEX IF NOT EXISTS idx_screenshots_agent   ON screenshots(agent_id);
CREATE INDEX IF NOT EXISTS idx_screenshots_created ON screenshots(taken_at DESC);


-- ─── 4. APP ACTIVITY ─────────────────────────────────────────────────────────
-- Per-app usage stats, aggregated daily by the agent
CREATE TABLE IF NOT EXISTS app_activity (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       text NOT NULL,
  app_name       text NOT NULL,
  date           date NOT NULL,
  usage_seconds  int DEFAULT 0,
  active_seconds int DEFAULT 0,
  category       text DEFAULT 'background',
  last_active    timestamptz,
  instances      int DEFAULT 1,
  memory_mb      numeric DEFAULT 0,
  UNIQUE(agent_id, app_name, date)
);
CREATE INDEX IF NOT EXISTS idx_app_activity_agent ON app_activity(agent_id);
CREATE INDEX IF NOT EXISTS idx_app_activity_date  ON app_activity(date DESC);


-- ─── 5. EVENT LOGS ───────────────────────────────────────────────────────────
-- Windows Security/System/Application event log entries from managed devices
CREATE TABLE IF NOT EXISTS event_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL,
  event_time  timestamptz NOT NULL,
  level       text,             -- 'Error'|'Warning'|'Information'|'Critical'
  log_name    text,             -- 'System'|'Security'|'Application'
  source      text,
  event_id    int,
  message     text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_event_logs_agent   ON event_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_event_logs_time    ON event_logs(event_time DESC);
CREATE INDEX IF NOT EXISTS idx_event_logs_level   ON event_logs(level);


-- ─── 6. FIREWALL EVENTS ──────────────────────────────────────────────────────
-- Windows Security Event Log firewall entries (agent writes event_id, message)
DROP TABLE IF EXISTS firewall_events CASCADE;
CREATE TABLE firewall_events (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL,
  event_id    int,
  event_time  timestamptz,
  level       text,
  message     text,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_firewall_events_agent ON firewall_events(agent_id);
CREATE INDEX IF NOT EXISTS idx_firewall_events_time  ON firewall_events(event_time DESC);


-- ─── 7. HARDWARE HISTORY ─────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS hardware_history (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id       text NOT NULL,
  recorded_at    timestamptz DEFAULT now(),
  cpu_load       numeric,
  ram_used_gb    numeric,
  ram_total_gb   numeric,
  disk_snapshots jsonb DEFAULT '[]',
  net_stats      jsonb DEFAULT '[]'
);
CREATE INDEX IF NOT EXISTS idx_hw_history_agent ON hardware_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_hw_history_time  ON hardware_history(recorded_at DESC);


-- ─── 8. INCIDENTS / NOTIFICATIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS incidents (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title       text NOT NULL,
  message     text,
  severity    text DEFAULT 'low',
  source      text,
  device_name text,
  read        boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);


-- ─── 9. AUDIT LOG ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS audit_log (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  actor_email  text,
  actor_upn    text,
  action       text NOT NULL,
  target_type  text,
  target_id    text,
  target_name  text,
  detail       jsonb DEFAULT '{}',
  created_at   timestamptz DEFAULT now()
);


-- ─── 10. UPDATE RINGS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS update_rings (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name               text NOT NULL,
  description        text,
  color              text DEFAULT '#6366f1',
  quality_defer_days int DEFAULT 7,
  feature_defer_days int DEFAULT 30,
  blocked            boolean DEFAULT false,
  created_at         timestamptz DEFAULT now()
);


-- ─── 11. COMPLIANCE ──────────────────────────────────────────────────────────
-- compliance_policies: what the evaluate route actually reads (not compliance_rules)
CREATE TABLE IF NOT EXISTS compliance_policies (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  rule_key    text NOT NULL UNIQUE,   -- must match evaluateRule() switch cases
  category    text DEFAULT 'Security',
  description text,
  severity    text DEFAULT 'medium',
  enabled     boolean DEFAULT true,
  threshold   jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);
-- Patch pre-existing compliance_policies tables that may be missing columns
ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS category    text DEFAULT 'Security';
ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS description text;
ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS threshold   jsonb DEFAULT '{}';
ALTER TABLE compliance_policies ADD COLUMN IF NOT EXISTS enabled     boolean DEFAULT true;

-- Seed default policies (idempotent)
INSERT INTO compliance_policies (name, rule_key, category, description, severity) VALUES
  ('BitLocker C: Drive',        'bitlocker_c_drive',    'Security',    'C: drive must be BitLocker-encrypted',           'critical'),
  ('TPM Ready',                 'tpm_ready',            'Security',    'Trusted Platform Module must be present & ready', 'high'),
  ('Defender Real-time',        'defender_realtime',    'Antivirus',   'Windows Defender real-time protection must be on', 'critical'),
  ('Firewall All Profiles',     'firewall_all_profiles','Network',     'All Windows Firewall profiles must be enabled',   'high'),
  ('Windows Activated',         'windows_activated',    'Licensing',   'Windows must be activated',                      'medium'),
  ('Disk Usage C: < 90%',       'disk_usage_c',         'Capacity',    'C: drive must be below 90% full',                'medium'),
  ('Device Online',             'device_online',        'Availability','Device must have checked in within 20 minutes',  'low'),
  ('Uptime < 30 days',          'long_uptime',          'Maintenance', 'Device should be restarted at least monthly',    'low')
ON CONFLICT (rule_key) DO NOTHING;

-- compliance_rules kept for backwards-compat (legacy, not used by evaluate route)
CREATE TABLE IF NOT EXISTS compliance_rules (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  category    text DEFAULT 'General',
  description text,
  check_type  text NOT NULL,
  check_value text,
  severity    text DEFAULT 'medium',
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

-- compliance_results: matches the evaluate route's upsert columns exactly
DROP TABLE IF EXISTS compliance_results CASCADE;
CREATE TABLE compliance_results (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  device_id    text NOT NULL,
  device_name  text,
  policy_id    uuid,
  policy_name  text,
  rule_key     text NOT NULL,
  status       text NOT NULL,    -- 'pass'|'fail'|'unknown'
  detail       text,
  severity     text,
  evaluated_at timestamptz DEFAULT now(),
  UNIQUE(device_id, rule_key)
);
CREATE INDEX IF NOT EXISTS idx_compliance_device ON compliance_results(device_id);


-- ─── 12. SOFTWARE BLOCKLIST ──────────────────────────────────────────────────
-- Column names match the blocklist API route and agent
DROP TABLE IF EXISTS software_blocklist CASCADE;
CREATE TABLE software_blocklist (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name_pattern  text NOT NULL,   -- pattern to match against installed app names
  match_type    text DEFAULT 'contains',
  severity      text DEFAULT 'high',
  reason        text,
  enabled       boolean DEFAULT true,
  created_at    timestamptz DEFAULT now()
);


-- ─── 13. APP CATALOG ─────────────────────────────────────────────────────────
-- Column names match the catalog API route (icon_emoji, not emoji)
DROP TABLE IF EXISTS app_catalog CASCADE;
CREATE TABLE app_catalog (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  winget_id   text UNIQUE NOT NULL,
  category    text DEFAULT 'Other',
  description text,
  icon_emoji  text DEFAULT '📦',
  publisher   text,
  active      boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE IF NOT EXISTS deployment_jobs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  app_id      uuid REFERENCES app_catalog(id) ON DELETE CASCADE,
  agent_ids   text[] NOT NULL,
  action      text DEFAULT 'install',
  status      text DEFAULT 'queued',
  started_at  timestamptz,
  finished_at timestamptz,
  results     jsonb DEFAULT '{}',
  created_at  timestamptz DEFAULT now()
);


-- ─── 14. SCHEDULED SCRIPTS ───────────────────────────────────────────────────
-- Column names match scheduled-scripts API route and agent
DROP TABLE IF EXISTS script_assignments CASCADE;
DROP TABLE IF EXISTS script_device_assignments CASCADE;
DROP TABLE IF EXISTS scheduled_scripts CASCADE;
CREATE TABLE scheduled_scripts (
  id             uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name           text NOT NULL,
  description    text,
  script_content text NOT NULL,
  extension      text DEFAULT 'ps1',    -- 'ps1'|'bat'
  interval_hours int DEFAULT 24,
  trigger_type   text DEFAULT 'manual', -- 'manual'|'daily'|'weekly'|'on_login'
  enabled        boolean DEFAULT true,
  created_at     timestamptz DEFAULT now()
);

CREATE TABLE script_device_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id   uuid REFERENCES scheduled_scripts(id) ON DELETE CASCADE,
  agent_id    text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  UNIQUE(script_id, agent_id)
);


-- Script execution logs (agent writes after each script run)
CREATE TABLE IF NOT EXISTS script_run_logs (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  script_id   uuid REFERENCES scheduled_scripts(id) ON DELETE SET NULL,
  agent_id    text NOT NULL,
  started_at  timestamptz NOT NULL,
  duration_ms int,
  exit_code   int,
  output      text,
  success     boolean DEFAULT false,
  created_at  timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_script_run_logs_script ON script_run_logs(script_id);
CREATE INDEX IF NOT EXISTS idx_script_run_logs_agent  ON script_run_logs(agent_id);
CREATE INDEX IF NOT EXISTS idx_script_run_logs_time   ON script_run_logs(started_at DESC);


-- ─── 15. CONFIG PROFILES ─────────────────────────────────────────────────────
-- Separate settings table (matched to profiles API route)
DROP TABLE IF EXISTS profile_assignments CASCADE;
DROP TABLE IF EXISTS device_profile_assignments CASCADE;
DROP TABLE IF EXISTS config_profile_settings CASCADE;
DROP TABLE IF EXISTS config_profiles CASCADE;
CREATE TABLE config_profiles (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name        text NOT NULL,
  description text,
  enabled     boolean DEFAULT true,
  created_at  timestamptz DEFAULT now()
);

CREATE TABLE config_profile_settings (
  id         uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id uuid REFERENCES config_profiles(id) ON DELETE CASCADE,
  type       text NOT NULL,
  settings   jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE device_profile_assignments (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  profile_id  uuid REFERENCES config_profiles(id) ON DELETE CASCADE,
  agent_id    text NOT NULL,
  assigned_at timestamptz DEFAULT now(),
  applied_at  timestamptz,
  UNIQUE(profile_id, agent_id)
);


-- ─── 16. PRINTERS ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS printers (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id     text NOT NULL,
  hostname     text,
  device_ip    text,
  printer_name text NOT NULL,
  driver_name  text,
  port_name    text,
  status       text DEFAULT 'unknown',
  is_default   boolean DEFAULT false,
  is_shared    boolean DEFAULT false,
  last_seen    timestamptz DEFAULT now(),
  UNIQUE(agent_id, printer_name)
);


-- ─── 17. NETWORK CONNECTIONS ─────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS net_connections (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id      text NOT NULL,
  hostname      text,
  device_ip     text,
  local_ip      text NOT NULL,
  local_port    int,
  remote_ip     text,
  remote_port   int,
  state         text,
  protocol_tcp  text DEFAULT 'TCP',
  app_protocol  text,
  process_name  text,
  pid           int,
  risk_level    text DEFAULT 'low',
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


-- ─── 18. DNS DOMAINS ─────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS dns_domains (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id    text NOT NULL,
  hostname    text,
  name        text NOT NULL,
  record_type text DEFAULT 'A',
  data        text,
  ttl         int,
  first_seen  timestamptz DEFAULT now(),
  last_seen   timestamptz DEFAULT now(),
  suspicious  boolean DEFAULT false,
  UNIQUE(agent_id, name, record_type)
);

-- Patch pre-existing dns_domains tables
ALTER TABLE dns_domains
  ADD COLUMN IF NOT EXISTS hostname    text,
  ADD COLUMN IF NOT EXISTS data        text,
  ADD COLUMN IF NOT EXISTS ttl         int,
  ADD COLUMN IF NOT EXISTS first_seen  timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS last_seen   timestamptz DEFAULT now(),
  ADD COLUMN IF NOT EXISTS suspicious  boolean DEFAULT false;

CREATE INDEX IF NOT EXISTS idx_dns_domains_agent      ON dns_domains(agent_id);
CREATE INDEX IF NOT EXISTS idx_dns_domains_suspicious ON dns_domains(suspicious);


-- ─── 19. USER ROLES & PERMISSIONS ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_roles (
  id          uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  text UNIQUE NOT NULL,
  role        text NOT NULL DEFAULT 'user',
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


-- ─── 20. USER SESSIONS ───────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS user_sessions (
  id           uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email   text NOT NULL UNIQUE,
  last_seen    timestamptz DEFAULT now(),
  current_page text,
  user_agent   text,
  sign_in_at   timestamptz DEFAULT now()
);


-- ─── 21. CLEANUP RPC ─────────────────────────────────────────────────────────
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

  DELETE FROM event_logs
  WHERE agent_id = p_agent_id
    AND event_time < now() - (cutoff_days || ' days')::interval;
END;
$$;
GRANT EXECUTE ON FUNCTION cleanup_old_agent_data(text, int) TO anon;


-- ─── 22. ROW LEVEL SECURITY ──────────────────────────────────────────────────

ALTER TABLE agent_commands           ENABLE ROW LEVEL SECURITY;
ALTER TABLE screenshots               ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_activity              ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_logs                ENABLE ROW LEVEL SECURITY;
ALTER TABLE firewall_events           ENABLE ROW LEVEL SECURITY;
ALTER TABLE hardware_history          ENABLE ROW LEVEL SECURITY;
ALTER TABLE incidents                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE audit_log                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE update_rings              ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_policies       ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_rules          ENABLE ROW LEVEL SECURITY;
ALTER TABLE compliance_results        ENABLE ROW LEVEL SECURITY;
ALTER TABLE software_blocklist        ENABLE ROW LEVEL SECURITY;
ALTER TABLE app_catalog               ENABLE ROW LEVEL SECURITY;
ALTER TABLE deployment_jobs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE scheduled_scripts         ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_device_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE script_run_logs           ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_profiles           ENABLE ROW LEVEL SECURITY;
ALTER TABLE config_profile_settings   ENABLE ROW LEVEL SECURITY;
ALTER TABLE device_profile_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE printers                  ENABLE ROW LEVEL SECURITY;
ALTER TABLE net_connections           ENABLE ROW LEVEL SECURITY;
ALTER TABLE dns_domains               ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_roles                ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_page_permissions     ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_sessions             ENABLE ROW LEVEL SECURITY;

-- Drop all policies before recreating (makes this section fully idempotent)
DROP POLICY IF EXISTS "auth read agent_commands"         ON agent_commands;
DROP POLICY IF EXISTS "auth read screenshots"             ON screenshots;
DROP POLICY IF EXISTS "auth read app_activity"            ON app_activity;
DROP POLICY IF EXISTS "auth read event_logs"              ON event_logs;
DROP POLICY IF EXISTS "auth read firewall_events"         ON firewall_events;
DROP POLICY IF EXISTS "auth read hardware_history"        ON hardware_history;
DROP POLICY IF EXISTS "auth read incidents"               ON incidents;
DROP POLICY IF EXISTS "auth read audit_log"               ON audit_log;
DROP POLICY IF EXISTS "auth read update_rings"            ON update_rings;
DROP POLICY IF EXISTS "auth read compliance_policies"     ON compliance_policies;
DROP POLICY IF EXISTS "auth read compliance_rules"        ON compliance_rules;
DROP POLICY IF EXISTS "auth read compliance_results"      ON compliance_results;
DROP POLICY IF EXISTS "auth read software_blocklist"      ON software_blocklist;
DROP POLICY IF EXISTS "auth read app_catalog"             ON app_catalog;
DROP POLICY IF EXISTS "auth read deployment_jobs"         ON deployment_jobs;
DROP POLICY IF EXISTS "auth read scheduled_scripts"       ON scheduled_scripts;
DROP POLICY IF EXISTS "auth read script_assignments"      ON script_device_assignments;
DROP POLICY IF EXISTS "auth read script_run_logs"         ON script_run_logs;
DROP POLICY IF EXISTS "anon insert script_run_logs"       ON script_run_logs;
DROP POLICY IF EXISTS "auth read config_profiles"         ON config_profiles;
DROP POLICY IF EXISTS "auth read profile_settings"        ON config_profile_settings;
DROP POLICY IF EXISTS "auth read device_prof_assignments" ON device_profile_assignments;
DROP POLICY IF EXISTS "auth read printers"                ON printers;
DROP POLICY IF EXISTS "auth read net_connections"         ON net_connections;
DROP POLICY IF EXISTS "auth read dns_domains"             ON dns_domains;
DROP POLICY IF EXISTS "auth read user_roles"              ON user_roles;
DROP POLICY IF EXISTS "auth read page_permissions"        ON user_page_permissions;
DROP POLICY IF EXISTS "auth read user_sessions"           ON user_sessions;
DROP POLICY IF EXISTS "anon poll agent_commands"          ON agent_commands;
DROP POLICY IF EXISTS "anon update agent_commands"        ON agent_commands;
DROP POLICY IF EXISTS "anon insert event_logs"            ON event_logs;
DROP POLICY IF EXISTS "anon insert firewall_events"       ON firewall_events;
DROP POLICY IF EXISTS "anon insert hardware_history"      ON hardware_history;
DROP POLICY IF EXISTS "anon insert app_activity"          ON app_activity;
DROP POLICY IF EXISTS "anon update app_activity"          ON app_activity;
DROP POLICY IF EXISTS "anon insert screenshots"           ON screenshots;
DROP POLICY IF EXISTS "anon insert net_connections"       ON net_connections;
DROP POLICY IF EXISTS "anon delete net_connections"       ON net_connections;
DROP POLICY IF EXISTS "anon insert dns_domains"           ON dns_domains;
DROP POLICY IF EXISTS "anon update dns_domains"           ON dns_domains;
DROP POLICY IF EXISTS "anon insert printers"              ON printers;
DROP POLICY IF EXISTS "anon update printers"              ON printers;
DROP POLICY IF EXISTS "anon insert incidents"             ON incidents;
DROP POLICY IF EXISTS "auth all agent_commands"           ON agent_commands;
DROP POLICY IF EXISTS "auth insert audit_log"             ON audit_log;
DROP POLICY IF EXISTS "auth insert incidents"             ON incidents;
DROP POLICY IF EXISTS "auth all user_sessions"            ON user_sessions;

-- Authenticated read-all policies
CREATE POLICY "auth read agent_commands"          ON agent_commands          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read screenshots"              ON screenshots              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read app_activity"             ON app_activity             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read event_logs"               ON event_logs               FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read firewall_events"          ON firewall_events          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read hardware_history"         ON hardware_history         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read incidents"                ON incidents                FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read audit_log"                ON audit_log                FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read update_rings"             ON update_rings             FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read compliance_policies"      ON compliance_policies      FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read compliance_rules"         ON compliance_rules         FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read compliance_results"       ON compliance_results       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read software_blocklist"       ON software_blocklist       FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read app_catalog"              ON app_catalog              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read deployment_jobs"          ON deployment_jobs          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read scheduled_scripts"        ON scheduled_scripts        FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read script_assignments"       ON script_device_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read script_run_logs"          ON script_run_logs           FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read config_profiles"          ON config_profiles          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read profile_settings"         ON config_profile_settings  FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read device_prof_assignments"  ON device_profile_assignments FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read printers"                 ON printers                 FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read net_connections"          ON net_connections          FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read dns_domains"              ON dns_domains              FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read user_roles"               ON user_roles               FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read page_permissions"         ON user_page_permissions    FOR SELECT TO authenticated USING (true);
CREATE POLICY "auth read user_sessions"            ON user_sessions            FOR SELECT TO authenticated USING (true);

-- Agent (anon key) write policies
CREATE POLICY "anon poll agent_commands"           ON agent_commands FOR SELECT TO anon USING (true);
CREATE POLICY "anon update agent_commands"         ON agent_commands FOR UPDATE TO anon USING (true);
CREATE POLICY "anon insert event_logs"             ON event_logs              FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert firewall_events"        ON firewall_events         FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert hardware_history"       ON hardware_history        FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert app_activity"           ON app_activity            FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update app_activity"           ON app_activity            FOR UPDATE TO anon USING (true);
CREATE POLICY "anon insert screenshots"            ON screenshots             FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert net_connections"        ON net_connections         FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon delete net_connections"        ON net_connections         FOR DELETE TO anon USING (true);
CREATE POLICY "anon insert dns_domains"            ON dns_domains             FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update dns_domains"            ON dns_domains             FOR UPDATE TO anon USING (true);
CREATE POLICY "anon insert printers"               ON printers                FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon update printers"               ON printers                FOR UPDATE TO anon USING (true);
CREATE POLICY "anon insert incidents"              ON incidents               FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "anon insert script_run_logs"        ON script_run_logs         FOR INSERT TO anon WITH CHECK (true);

-- Authenticated write policies
CREATE POLICY "auth all agent_commands"            ON agent_commands FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth insert audit_log"              ON audit_log               FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth insert incidents"              ON incidents               FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "auth all user_sessions"             ON user_sessions FOR ALL TO authenticated USING (true) WITH CHECK (true);


-- ─── 23. SUPABASE STORAGE BUCKET + POLICIES ─────────────────────────────────
-- Creates the screenshots bucket and all three storage policies via SQL.
-- Run this in the same SQL editor run — no dashboard UI needed.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'screenshots',
  'screenshots',
  false,
  10485760,                              -- 10 MB
  ARRAY['image/png', 'image/jpeg']
)
ON CONFLICT (id) DO UPDATE SET
  file_size_limit    = EXCLUDED.file_size_limit,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Drop first so this section is idempotent
DROP POLICY IF EXISTS "anon upload screenshots"  ON storage.objects;
DROP POLICY IF EXISTS "auth view screenshots"    ON storage.objects;
DROP POLICY IF EXISTS "auth delete screenshots"  ON storage.objects;

-- agent (anon key) can upload captures
CREATE POLICY "anon upload screenshots"
  ON storage.objects FOR INSERT TO anon
  WITH CHECK (bucket_id = 'screenshots');

-- authenticated dashboard users can view screenshots
CREATE POLICY "auth view screenshots"
  ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'screenshots');

-- authenticated dashboard users can delete screenshots
CREATE POLICY "auth delete screenshots"
  ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'screenshots');
