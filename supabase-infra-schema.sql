-- ============================================================
-- OpsQuest Infrastructure Monitoring — Supabase Schema
-- Run this in your Supabase SQL Editor (after the main schema)
-- ============================================================

-- Devices discovered by the server agent (server + all LAN clients)
CREATE TABLE IF NOT EXISTS infrastructure_devices (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mac_address     text UNIQUE NOT NULL,
  device_type     text DEFAULT 'unknown',  -- 'server' | 'desktop' | 'laptop' | 'mobile' | 'unknown'
  hostname        text,
  last_ip         text,
  is_server       boolean DEFAULT false,
  hardware_info   jsonb DEFAULT '{}',
  first_seen      timestamptz DEFAULT now(),
  last_seen       timestamptz DEFAULT now(),
  created_at      timestamptz DEFAULT now()
);

-- Server agent heartbeat table
CREATE TABLE IF NOT EXISTS agent_status (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  agent_id        text UNIQUE NOT NULL,
  server_hostname text,
  last_ping       timestamptz DEFAULT now(),
  version         text DEFAULT '1.0.0',
  status          text DEFAULT 'online'   -- 'online' | 'offline'
);

-- IP cameras registered via config
CREATE TABLE IF NOT EXISTS cameras (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name            text NOT NULL,
  ip_address      text NOT NULL,
  port            integer DEFAULT 80,
  is_online       boolean DEFAULT false,
  last_checked    timestamptz,
  last_online     timestamptz,
  model           text,
  firmware        text,
  stream_url      text,
  location        text,
  created_at      timestamptz DEFAULT now(),
  UNIQUE (ip_address, port)
);

-- Firewall events snapshot (agent writes, dashboard reads)
CREATE TABLE IF NOT EXISTS firewall_events (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_time      timestamptz DEFAULT now(),
  source_ip       text,
  dest_ip         text,
  action          text,   -- 'blocked' | 'allowed' | 'dropped'
  threat_name     text,
  rule_name       text,
  protocol        text,
  raw             jsonb DEFAULT '{}'
);

-- Access point clients snapshot
CREATE TABLE IF NOT EXISTS ap_clients (
  id              uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  mac_address     text NOT NULL,
  ip_address      text,
  hostname        text,
  ssid            text,
  ap_name         text,
  band            text,   -- '2.4GHz' | '5GHz' | '6GHz'
  signal_dbm      integer,
  tx_rate_mbps    integer,
  rx_rate_mbps    integer,
  vendor          text,
  last_seen       timestamptz DEFAULT now(),
  UNIQUE (mac_address, ap_name)
);

-- Row Level Security
ALTER TABLE infrastructure_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE agent_status            ENABLE ROW LEVEL SECURITY;
ALTER TABLE cameras                 ENABLE ROW LEVEL SECURITY;
ALTER TABLE firewall_events         ENABLE ROW LEVEL SECURITY;
ALTER TABLE ap_clients              ENABLE ROW LEVEL SECURITY;

-- Allow authenticated users to read everything; anon key for agent writes
CREATE POLICY "Authenticated read devices"    ON infrastructure_devices FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon upsert devices"           ON infrastructure_devices FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update devices"           ON infrastructure_devices FOR UPDATE TO anon USING (true);

CREATE POLICY "Authenticated read agent"      ON agent_status FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon upsert agent"             ON agent_status FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update agent"             ON agent_status FOR UPDATE TO anon USING (true);

CREATE POLICY "Authenticated read cameras"    ON cameras FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon upsert cameras"           ON cameras FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update cameras"           ON cameras FOR UPDATE TO anon USING (true);

CREATE POLICY "Authenticated read fw_events"  ON firewall_events FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon insert fw_events"         ON firewall_events FOR INSERT TO anon WITH CHECK (true);

CREATE POLICY "Authenticated read ap_clients" ON ap_clients FOR SELECT TO authenticated USING (true);
CREATE POLICY "Anon upsert ap_clients"        ON ap_clients FOR INSERT TO anon WITH CHECK (true);
CREATE POLICY "Anon update ap_clients"        ON ap_clients FOR UPDATE TO anon USING (true);
