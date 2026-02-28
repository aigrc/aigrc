-- ============================================================================
-- AIGRC-EVT-001 §13.3: Integrity Checkpoints (Daily Merkle Roots)
-- Migration: 002_integrity_checkpoints
-- Package:   @aigrc/events
-- ============================================================================

CREATE TABLE IF NOT EXISTS integrity_checkpoints (
  id          SERIAL PRIMARY KEY,
  org_id      TEXT NOT NULL,
  date        DATE NOT NULL,
  merkle_root TEXT NOT NULL,                              -- sha256:[a-f0-9]{64}
  event_count INTEGER NOT NULL DEFAULT 0,
  computed_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

  -- One checkpoint per org per day
  UNIQUE(org_id, date)
);

-- ────────────────────────────────────────────────────────────────────
-- INDEXES
-- ────────────────────────────────────────────────────────────────────

CREATE INDEX IF NOT EXISTS idx_ic_org_id
  ON integrity_checkpoints(org_id);

CREATE INDEX IF NOT EXISTS idx_ic_org_date
  ON integrity_checkpoints(org_id, date DESC);

-- ────────────────────────────────────────────────────────────────────
-- ROW-LEVEL SECURITY
-- ────────────────────────────────────────────────────────────────────

ALTER TABLE integrity_checkpoints ENABLE ROW LEVEL SECURITY;

CREATE POLICY "org_read_own_checkpoints"
  ON integrity_checkpoints
  FOR SELECT
  USING (org_id = auth.jwt()->>'org_id');

-- Only the platform service role can insert checkpoints
-- (Computed by scheduled job, not by end users)
