-- ============================================================================
-- AIGRC-EVT-001: Governance Events Table
-- Migration: 001_governance_events
-- Package:   @aigrc/events
-- ============================================================================

-- Core table: columns map 1:1 to GovernanceEvent envelope fields (§3)
CREATE TABLE IF NOT EXISTS governance_events (
  -- Identity (§3.1)
  id              TEXT PRIMARY KEY,                       -- evt_[a-f0-9]{32}
  spec_version    TEXT NOT NULL DEFAULT '1.0',
  schema_version  TEXT NOT NULL,                          -- aigrc-events@x.y.z

  -- Classification (§3.2)
  type            TEXT NOT NULL,                          -- aigrc.asset.created, etc.
  category        TEXT NOT NULL,                          -- asset, scan, etc.
  criticality     TEXT NOT NULL DEFAULT 'normal',         -- normal | high | critical

  -- Provenance (§3.3)
  org_id          TEXT NOT NULL,
  asset_id        TEXT NOT NULL,

  -- Temporality (§3.4)
  produced_at     TIMESTAMPTZ NOT NULL,
  received_at     TIMESTAMPTZ NOT NULL DEFAULT NOW(),     -- Server-set only

  -- Integrity (§3.6)
  hash            TEXT NOT NULL,                          -- sha256:[a-f0-9]{64}
  previous_hash   TEXT,
  signature       TEXT,

  -- Chain Linking (§3.7)
  parent_event_id TEXT,
  correlation_id  TEXT,

  -- Structured fields stored as JSONB
  golden_thread   JSONB NOT NULL,                         -- LinkedThread | OrphanDeclaration
  source          JSONB NOT NULL,                         -- EventSource object
  data            JSONB NOT NULL,                         -- Category-specific payload

  -- Full event preserved for audit/replay
  raw_event       JSONB NOT NULL,

  -- Metadata
  created_at      TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────────────
-- PERFORMANCE INDEXES
-- ────────────────────────────────────────────────────────────────────

-- Single-column indexes for common filter patterns
CREATE INDEX IF NOT EXISTS idx_ge_org_id
  ON governance_events(org_id);

CREATE INDEX IF NOT EXISTS idx_ge_asset_id
  ON governance_events(asset_id);

CREATE INDEX IF NOT EXISTS idx_ge_type
  ON governance_events(type);

CREATE INDEX IF NOT EXISTS idx_ge_produced_at
  ON governance_events(produced_at);

-- Partial index: only index non-null correlation IDs
CREATE INDEX IF NOT EXISTS idx_ge_correlation
  ON governance_events(correlation_id)
  WHERE correlation_id IS NOT NULL;

-- Composite indexes for common query patterns
CREATE INDEX IF NOT EXISTS idx_ge_org_asset
  ON governance_events(org_id, asset_id);

CREATE INDEX IF NOT EXISTS idx_ge_org_type_produced
  ON governance_events(org_id, type, produced_at DESC);

-- JSONB indexes for golden thread and source tool queries
CREATE INDEX IF NOT EXISTS idx_ge_gt_type
  ON governance_events USING GIN ((golden_thread->'type'));

CREATE INDEX IF NOT EXISTS idx_ge_source_tool
  ON governance_events USING GIN ((source->'tool'));

-- ────────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE governance_events ENABLE ROW LEVEL SECURITY;

-- Users can only read events belonging to their organization
CREATE POLICY "org_read_own_events"
  ON governance_events
  FOR SELECT
  USING (org_id = auth.jwt()->>'org_id');

-- Users can only insert events for their organization
CREATE POLICY "org_insert_own_events"
  ON governance_events
  FOR INSERT
  WITH CHECK (org_id = auth.jwt()->>'org_id');

-- Service role bypasses RLS for platform-level operations
-- (Supabase service_role key automatically bypasses RLS)

-- ────────────────────────────────────────────────────────────────────
-- CONSTRAINTS
-- ────────────────────────────────────────────────────────────────────

-- Validate event ID format
ALTER TABLE governance_events
  ADD CONSTRAINT chk_event_id_format
  CHECK (id ~ '^evt_[a-f0-9]{32}$');

-- Validate hash format
ALTER TABLE governance_events
  ADD CONSTRAINT chk_hash_format
  CHECK (hash ~ '^sha256:[a-f0-9]{64}$');

-- Validate criticality values
ALTER TABLE governance_events
  ADD CONSTRAINT chk_criticality_values
  CHECK (criticality IN ('normal', 'high', 'critical'));

-- Validate category values
ALTER TABLE governance_events
  ADD CONSTRAINT chk_category_values
  CHECK (category IN (
    'asset', 'scan', 'classification', 'compliance',
    'enforcement', 'lifecycle', 'policy', 'audit'
  ));

-- Note: Deduplication is handled by the PRIMARY KEY on id.
-- The API layer returns 200 OK for duplicates (not a DB error).
