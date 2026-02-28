/**
 * CGA Certificate Authority Database Schema
 *
 * SQLite schema for certificate registry, supporting:
 * - Certificate storage and retrieval
 * - Revocation tracking
 * - OCSP response caching
 * - Audit logging
 */

export const SCHEMA_VERSION = 1;

export const CREATE_TABLES = `
-- Certificate Registry
-- Stores all issued CGA certificates
CREATE TABLE IF NOT EXISTS certificates (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  agent_version TEXT NOT NULL,
  organization_id TEXT NOT NULL,
  organization_name TEXT NOT NULL,
  organization_domain TEXT,

  level TEXT NOT NULL CHECK (level IN ('BRONZE', 'SILVER', 'GOLD', 'PLATINUM')),

  golden_thread_hash TEXT NOT NULL,
  golden_thread_algorithm TEXT NOT NULL DEFAULT 'SHA-256',

  issued_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,

  -- Certificate content (YAML)
  certificate_yaml TEXT NOT NULL,

  -- Signature
  signature_algorithm TEXT NOT NULL,
  signature_key_id TEXT NOT NULL,
  signature_value TEXT NOT NULL,

  -- Status tracking
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'revoked', 'expired', 'superseded')),
  revoked_at TEXT,
  revocation_reason TEXT,

  -- Metadata
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now')),

  -- Indexes
  UNIQUE(agent_id, agent_version, organization_id)
);

CREATE INDEX IF NOT EXISTS idx_certificates_agent_id ON certificates(agent_id);
CREATE INDEX IF NOT EXISTS idx_certificates_organization_id ON certificates(organization_id);
CREATE INDEX IF NOT EXISTS idx_certificates_status ON certificates(status);
CREATE INDEX IF NOT EXISTS idx_certificates_expires_at ON certificates(expires_at);
CREATE INDEX IF NOT EXISTS idx_certificates_level ON certificates(level);

-- Revocation List
-- Tracks revoked certificates for OCSP and CRL
CREATE TABLE IF NOT EXISTS revocations (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id TEXT NOT NULL REFERENCES certificates(id),
  revoked_at TEXT NOT NULL DEFAULT (datetime('now')),
  reason TEXT NOT NULL,
  revoked_by TEXT NOT NULL,

  -- Optional: reference to incident
  incident_id TEXT,

  UNIQUE(certificate_id)
);

CREATE INDEX IF NOT EXISTS idx_revocations_certificate_id ON revocations(certificate_id);

-- OCSP Response Cache
-- Caches OCSP responses for performance
CREATE TABLE IF NOT EXISTS ocsp_cache (
  certificate_id TEXT PRIMARY KEY REFERENCES certificates(id),
  response_bytes BLOB NOT NULL,
  produced_at TEXT NOT NULL,
  this_update TEXT NOT NULL,
  next_update TEXT NOT NULL,

  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Verification History
-- Logs all verification attempts for audit
CREATE TABLE IF NOT EXISTS verification_history (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  certificate_id TEXT REFERENCES certificates(id),
  agent_id TEXT NOT NULL,

  -- Request details
  request_ip TEXT,
  request_action TEXT,
  request_timestamp TEXT NOT NULL DEFAULT (datetime('now')),

  -- Verification result
  result TEXT NOT NULL CHECK (result IN ('valid', 'invalid', 'revoked', 'expired', 'unknown')),
  result_details TEXT,

  -- Performance
  duration_ms INTEGER
);

CREATE INDEX IF NOT EXISTS idx_verification_history_certificate_id ON verification_history(certificate_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_agent_id ON verification_history(agent_id);
CREATE INDEX IF NOT EXISTS idx_verification_history_timestamp ON verification_history(request_timestamp);

-- CA Keys
-- Stores CA signing keys (encrypted)
CREATE TABLE IF NOT EXISTS ca_keys (
  id TEXT PRIMARY KEY,
  algorithm TEXT NOT NULL,
  public_key TEXT NOT NULL,
  -- Private key stored encrypted
  private_key_encrypted BLOB NOT NULL,

  -- Key status
  status TEXT NOT NULL DEFAULT 'active' CHECK (status IN ('active', 'inactive', 'rotated')),

  -- Validity
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  expires_at TEXT,
  rotated_at TEXT,

  -- Usage tracking
  certificates_signed INTEGER NOT NULL DEFAULT 0
);

-- Audit Log
-- Comprehensive audit trail
CREATE TABLE IF NOT EXISTS audit_log (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  timestamp TEXT NOT NULL DEFAULT (datetime('now')),

  -- Actor
  actor_type TEXT NOT NULL CHECK (actor_type IN ('system', 'admin', 'agent', 'api')),
  actor_id TEXT,

  -- Action
  action TEXT NOT NULL,
  resource_type TEXT NOT NULL,
  resource_id TEXT,

  -- Details
  details TEXT,

  -- Request context
  request_ip TEXT,
  request_id TEXT
);

CREATE INDEX IF NOT EXISTS idx_audit_log_timestamp ON audit_log(timestamp);
CREATE INDEX IF NOT EXISTS idx_audit_log_actor ON audit_log(actor_type, actor_id);
CREATE INDEX IF NOT EXISTS idx_audit_log_resource ON audit_log(resource_type, resource_id);

-- Schema version tracking
CREATE TABLE IF NOT EXISTS schema_version (
  version INTEGER PRIMARY KEY,
  applied_at TEXT NOT NULL DEFAULT (datetime('now'))
);

-- Insert initial schema version
INSERT OR IGNORE INTO schema_version (version) VALUES (${SCHEMA_VERSION});
`;

export const MIGRATIONS: Record<number, string> = {
  // Future migrations will be added here
  // 2: "ALTER TABLE certificates ADD COLUMN ...",
};
