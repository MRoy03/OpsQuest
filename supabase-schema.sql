-- OpsQuest Database Schema
-- Run this in the Supabase SQL Editor (supabase.com → Project → SQL Editor)

-- ============================================================
-- TABLES
-- ============================================================

-- Users
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  email TEXT UNIQUE NOT NULL,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin', 'it_master')),
  xp INTEGER NOT NULL DEFAULT 0,
  level INTEGER NOT NULL DEFAULT 1,
  badge TEXT DEFAULT '🔰',
  tickets_resolved INTEGER DEFAULT 0,
  solutions_added INTEGER DEFAULT 0,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Solutions (Knowledge Base)
CREATE TABLE solutions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  steps JSONB NOT NULL DEFAULT '[]',
  tags TEXT[] DEFAULT '{}',
  category TEXT NOT NULL CHECK (category IN ('network', 'hardware', 'software', 'cloud', 'security')),
  success_rate NUMERIC(5,2) DEFAULT 0,
  usage_count INTEGER DEFAULT 0,
  added_by UUID REFERENCES users(id),
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Tickets
CREATE TABLE tickets (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  description TEXT,
  priority TEXT NOT NULL DEFAULT 'medium' CHECK (priority IN ('critical', 'high', 'medium', 'low')),
  status TEXT NOT NULL DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'resolved', 'closed')),
  category TEXT,
  user_id UUID REFERENCES users(id),
  assigned_to UUID REFERENCES users(id),
  solutions_tried UUID[] DEFAULT '{}',
  system_info JSONB,
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now(),
  resolved_at TIMESTAMPTZ
);

-- System Nodes (Infrastructure)
CREATE TABLE system_nodes (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT UNIQUE NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('server', 'network', 'workstation', 'storage', 'cloud')),
  status TEXT DEFAULT 'healthy' CHECK (status IN ('healthy', 'warning', 'critical', 'offline')),
  ip_address TEXT,
  location TEXT,
  tags TEXT[] DEFAULT '{}',
  is_monitored BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Node Metrics (time-series snapshots)
CREATE TABLE node_metrics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES system_nodes(id) ON DELETE CASCADE,
  cpu NUMERIC(5,2),
  memory NUMERIC(5,2),
  disk NUMERIC(5,2),
  network_in BIGINT,
  network_out BIGINT,
  uptime_seconds BIGINT,
  recorded_at TIMESTAMPTZ DEFAULT now()
);

-- Alerts
CREATE TABLE alerts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  node_id UUID REFERENCES system_nodes(id),
  message TEXT NOT NULL,
  severity TEXT NOT NULL CHECK (severity IN ('info', 'warning', 'critical')),
  acknowledged BOOLEAN DEFAULT false,
  acknowledged_by UUID REFERENCES users(id),
  acknowledged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- Solution Usage (tracks which solutions were used and their outcome)
CREATE TABLE solution_usage (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  solution_id UUID REFERENCES solutions(id),
  user_id UUID REFERENCES users(id),
  ticket_id UUID REFERENCES tickets(id),
  outcome TEXT CHECK (outcome IN ('fixed', 'partial', 'failed', 'pending')),
  used_at TIMESTAMPTZ DEFAULT now()
);

-- XP Events (audit trail for gamification)
CREATE TABLE xp_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  action TEXT NOT NULL,
  xp_gained INTEGER NOT NULL,
  reference_id UUID,
  reference_type TEXT,
  created_at TIMESTAMPTZ DEFAULT now()
);

-- ============================================================
-- INDEXES
-- ============================================================
CREATE INDEX idx_tickets_status ON tickets(status);
CREATE INDEX idx_tickets_priority ON tickets(priority);
CREATE INDEX idx_tickets_user_id ON tickets(user_id);
CREATE INDEX idx_solutions_category ON solutions(category);
CREATE INDEX idx_node_metrics_node_id ON node_metrics(node_id);
CREATE INDEX idx_node_metrics_recorded_at ON node_metrics(recorded_at DESC);
CREATE INDEX idx_alerts_acknowledged ON alerts(acknowledged);
CREATE INDEX idx_xp_events_user_id ON xp_events(user_id);

-- ============================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================
ALTER TABLE users ENABLE ROW LEVEL SECURITY;
ALTER TABLE tickets ENABLE ROW LEVEL SECURITY;
ALTER TABLE solutions ENABLE ROW LEVEL SECURITY;
ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;
ALTER TABLE xp_events ENABLE ROW LEVEL SECURITY;

-- Public read access to solutions
CREATE POLICY "Solutions are readable by all authenticated users"
  ON solutions FOR SELECT TO authenticated USING (is_active = true);

-- Users can read their own data
CREATE POLICY "Users can view own profile"
  ON users FOR SELECT TO authenticated USING (auth.uid() = id);

-- Admins can do everything (example — customize per your auth setup)
CREATE POLICY "Admins have full access to tickets"
  ON tickets FOR ALL TO authenticated
  USING (true) WITH CHECK (true);

-- ============================================================
-- FUNCTIONS
-- ============================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_tickets_updated_at BEFORE UPDATE ON tickets FOR EACH ROW EXECUTE FUNCTION update_updated_at();
CREATE TRIGGER trg_solutions_updated_at BEFORE UPDATE ON solutions FOR EACH ROW EXECUTE FUNCTION update_updated_at();

-- Recalculate success rate after solution_usage insert
CREATE OR REPLACE FUNCTION recalculate_solution_success_rate()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE solutions SET
    success_rate = (
      SELECT ROUND(
        COUNT(*) FILTER (WHERE outcome = 'fixed') * 100.0 / NULLIF(COUNT(*), 0), 2
      )
      FROM solution_usage WHERE solution_id = NEW.solution_id
    ),
    usage_count = (SELECT COUNT(*) FROM solution_usage WHERE solution_id = NEW.solution_id)
  WHERE id = NEW.solution_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_update_solution_stats
  AFTER INSERT ON solution_usage
  FOR EACH ROW EXECUTE FUNCTION recalculate_solution_success_rate();

-- ============================================================
-- SEED DATA (Optional — for testing)
-- ============================================================
INSERT INTO system_nodes (name, type, status, ip_address)
VALUES
  ('CORE-DC-01', 'server', 'healthy', '10.0.0.1'),
  ('CORE-DC-02', 'server', 'warning', '10.0.0.2'),
  ('FILE-SRV-01', 'storage', 'healthy', '10.0.0.10'),
  ('NET-SW-CORE', 'network', 'healthy', '10.0.0.254'),
  ('APP-SRV-WEB', 'server', 'critical', '10.0.0.20'),
  ('BACKUP-NAS-01', 'storage', 'offline', '10.0.0.30');
