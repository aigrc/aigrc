-- ─────────────────────────────────────────────────────────────────
-- PangoGuard — Supabase Schema Migration
-- Tables: installations, scan_results, ai_asset_inventory
-- ─────────────────────────────────────────────────────────────────

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ─────────────────────────────────────────────────────────────────
-- INSTALLATIONS TABLE
-- Tracks GitHub App installations per organization
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS installations (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  github_installation_id  BIGINT UNIQUE NOT NULL,
  github_org_login        TEXT NOT NULL,
  github_org_type         TEXT NOT NULL CHECK (github_org_type IN ('Organization', 'User')),
  plan                    JSONB DEFAULT '{}',
  installed_at            TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at              TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_installations_org ON installations(github_org_login);

-- ─────────────────────────────────────────────────────────────────
-- SCAN RESULTS TABLE
-- Stores every scan event (PR, push, scheduled, full-repo)
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS scan_results (
  id              UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id UUID NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  repo_full_name  TEXT NOT NULL,
  pr_number       INTEGER,
  commit_sha      TEXT NOT NULL,
  scan_type       TEXT NOT NULL CHECK (scan_type IN ('pr_diff', 'push', 'full_repo', 'scheduled')),
  detections      JSONB NOT NULL DEFAULT '{}',
  risk_summary    JSONB NOT NULL DEFAULT '{}',
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_scan_results_repo ON scan_results(repo_full_name);
CREATE INDEX idx_scan_results_installation ON scan_results(installation_id);
CREATE INDEX idx_scan_results_created ON scan_results(created_at DESC);
CREATE INDEX idx_scan_results_pr ON scan_results(repo_full_name, pr_number) WHERE pr_number IS NOT NULL;

-- ─────────────────────────────────────────────────────────────────
-- AI ASSET INVENTORY TABLE
-- Living inventory of all detected AI/ML assets across repos
-- ─────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS ai_asset_inventory (
  id                UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  installation_id   UUID NOT NULL REFERENCES installations(id) ON DELETE CASCADE,
  repo_full_name    TEXT NOT NULL,
  file_path         TEXT NOT NULL,
  asset_type        TEXT NOT NULL,
  framework         TEXT NOT NULL,
  risk_tier         TEXT NOT NULL CHECK (risk_tier IN ('L0', 'L1', 'L2', 'L3')),
  governance_status TEXT NOT NULL DEFAULT 'ungoverned' CHECK (governance_status IN ('ungoverned', 'card_created', 'approved')),
  first_detected_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  last_seen_at      TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  metadata          JSONB DEFAULT '{}',

  -- Unique constraint for upsert deduplication
  UNIQUE (repo_full_name, file_path, framework)
);

CREATE INDEX idx_inventory_installation ON ai_asset_inventory(installation_id);
CREATE INDEX idx_inventory_repo ON ai_asset_inventory(repo_full_name);
CREATE INDEX idx_inventory_tier ON ai_asset_inventory(risk_tier);
CREATE INDEX idx_inventory_ungoverned ON ai_asset_inventory(governance_status) WHERE governance_status = 'ungoverned';
CREATE INDEX idx_inventory_framework ON ai_asset_inventory(framework);

-- ─────────────────────────────────────────────────────────────────
-- ROW LEVEL SECURITY (RLS)
-- Each installation can only access its own data
-- ─────────────────────────────────────────────────────────────────

ALTER TABLE installations ENABLE ROW LEVEL SECURITY;
ALTER TABLE scan_results ENABLE ROW LEVEL SECURITY;
ALTER TABLE ai_asset_inventory ENABLE ROW LEVEL SECURITY;

-- Service role bypass (server-side only)
CREATE POLICY "service_role_all" ON installations FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON scan_results FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "service_role_all" ON ai_asset_inventory FOR ALL USING (true) WITH CHECK (true);

-- ─────────────────────────────────────────────────────────────────
-- UPDATED_AT TRIGGER
-- ─────────────────────────────────────────────────────────────────

CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER installations_updated_at
  BEFORE UPDATE ON installations
  FOR EACH ROW EXECUTE FUNCTION update_updated_at();
