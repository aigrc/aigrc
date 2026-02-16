/**
 * CGA Certificate Authority Database Client
 *
 * Provides typed database operations for the CA service.
 * Uses a simple file-based JSON store for cross-platform compatibility.
 */

import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";

// ─────────────────────────────────────────────────────────────────
// Record Types
// ─────────────────────────────────────────────────────────────────

export interface CertificateRecord {
  id: string;
  agent_id: string;
  agent_version: string;
  organization_id: string;
  organization_name: string;
  organization_domain: string | null;
  level: "BRONZE" | "SILVER" | "GOLD" | "PLATINUM";
  golden_thread_hash: string;
  golden_thread_algorithm: string;
  issued_at: string;
  expires_at: string;
  certificate_yaml: string;
  signature_algorithm: string;
  signature_key_id: string;
  signature_value: string;
  status: "active" | "revoked" | "expired" | "superseded";
  revoked_at: string | null;
  revocation_reason: string | null;
  created_at: string;
  updated_at: string;
}

export interface RevocationRecord {
  id: number;
  certificate_id: string;
  revoked_at: string;
  reason: string;
  revoked_by: string;
  incident_id: string | null;
}

export interface VerificationHistoryRecord {
  id: number;
  certificate_id: string | null;
  agent_id: string;
  request_ip: string | null;
  request_action: string | null;
  request_timestamp: string;
  result: "valid" | "invalid" | "revoked" | "expired" | "unknown";
  result_details: string | null;
  duration_ms: number | null;
}

export interface AuditLogRecord {
  id: number;
  timestamp: string;
  actor_type: "system" | "admin" | "agent" | "api";
  actor_id: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  details: string | null;
  request_ip: string | null;
  request_id: string | null;
}

export interface CAKeyRecord {
  id: string;
  algorithm: string;
  public_key: string;
  private_key_encrypted: string; // Base64 encoded
  status: "active" | "inactive" | "rotated";
  created_at: string;
  expires_at: string | null;
  rotated_at: string | null;
  certificates_signed: number;
}

// ─────────────────────────────────────────────────────────────────
// Database Store
// ─────────────────────────────────────────────────────────────────

interface DatabaseStore {
  schema_version: number;
  certificates: CertificateRecord[];
  revocations: RevocationRecord[];
  verification_history: VerificationHistoryRecord[];
  audit_log: AuditLogRecord[];
  ca_keys: CAKeyRecord[];
  counters: {
    revocation_id: number;
    verification_id: number;
    audit_id: number;
  };
}

const SCHEMA_VERSION = 1;

function createEmptyStore(): DatabaseStore {
  return {
    schema_version: SCHEMA_VERSION,
    certificates: [],
    revocations: [],
    verification_history: [],
    audit_log: [],
    ca_keys: [],
    counters: {
      revocation_id: 0,
      verification_id: 0,
      audit_id: 0,
    },
  };
}

// ─────────────────────────────────────────────────────────────────
// Database Class
// ─────────────────────────────────────────────────────────────────

export class CADatabase {
  private store: DatabaseStore;
  private dbPath: string;
  private autoSave: boolean;

  constructor(dbPath: string = ":memory:", autoSave: boolean = true) {
    this.dbPath = dbPath;
    this.autoSave = autoSave;
    this.store = this.load();
  }

  /**
   * Load database from disk or create new
   */
  private load(): DatabaseStore {
    if (this.dbPath === ":memory:") {
      return createEmptyStore();
    }

    try {
      if (existsSync(this.dbPath)) {
        const data = readFileSync(this.dbPath, "utf-8");
        return JSON.parse(data) as DatabaseStore;
      }
    } catch {
      // File doesn't exist or is corrupt, create new
    }

    return createEmptyStore();
  }

  /**
   * Save database to disk
   */
  save(): void {
    if (this.dbPath === ":memory:") return;

    try {
      const dir = dirname(this.dbPath);
      if (!existsSync(dir)) {
        mkdirSync(dir, { recursive: true });
      }
      writeFileSync(this.dbPath, JSON.stringify(this.store, null, 2));
    } catch (error) {
      console.error("Failed to save database:", error);
    }
  }

  /**
   * Auto-save helper
   */
  private maybeAutoSave(): void {
    if (this.autoSave) {
      this.save();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Certificate Operations
  // ─────────────────────────────────────────────────────────────────

  insertCertificate(cert: Omit<CertificateRecord, "created_at" | "updated_at">): void {
    const now = new Date().toISOString();
    const record: CertificateRecord = {
      ...cert,
      created_at: now,
      updated_at: now,
    };
    this.store.certificates.push(record);
    this.maybeAutoSave();
  }

  getCertificate(id: string): CertificateRecord | null {
    return this.store.certificates.find((c) => c.id === id) ?? null;
  }

  getCertificateByAgent(
    agentId: string,
    agentVersion: string,
    organizationId: string
  ): CertificateRecord | null {
    return (
      this.store.certificates
        .filter(
          (c) =>
            c.agent_id === agentId &&
            c.agent_version === agentVersion &&
            c.organization_id === organizationId
        )
        .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime())[0] ??
      null
    );
  }

  getActiveCertificatesForAgent(agentId: string): CertificateRecord[] {
    const now = new Date();
    return this.store.certificates
      .filter(
        (c) =>
          c.agent_id === agentId &&
          c.status === "active" &&
          new Date(c.expires_at) > now
      )
      .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  getExpiringCertificates(withinDays: number = 14): CertificateRecord[] {
    const now = new Date();
    const futureDate = new Date(now.getTime() + withinDays * 24 * 60 * 60 * 1000);

    return this.store.certificates
      .filter((c) => {
        const expiresAt = new Date(c.expires_at);
        return (
          c.status === "active" &&
          expiresAt <= futureDate &&
          expiresAt > now
        );
      })
      .sort((a, b) => new Date(a.expires_at).getTime() - new Date(b.expires_at).getTime());
  }

  updateCertificateStatus(
    id: string,
    status: CertificateRecord["status"],
    reason?: string
  ): void {
    const cert = this.store.certificates.find((c) => c.id === id);
    if (cert) {
      cert.status = status;
      cert.updated_at = new Date().toISOString();
      if (status === "revoked") {
        cert.revoked_at = new Date().toISOString();
        cert.revocation_reason = reason ?? null;
      }
      this.maybeAutoSave();
    }
  }

  countCertificatesByOrganization(organizationId: string): number {
    return this.store.certificates.filter((c) => c.organization_id === organizationId).length;
  }

  // ─────────────────────────────────────────────────────────────────
  // Revocation Operations
  // ─────────────────────────────────────────────────────────────────

  addRevocation(
    certificateId: string,
    reason: string,
    revokedBy: string,
    incidentId?: string
  ): void {
    this.store.counters.revocation_id++;
    const record: RevocationRecord = {
      id: this.store.counters.revocation_id,
      certificate_id: certificateId,
      revoked_at: new Date().toISOString(),
      reason,
      revoked_by: revokedBy,
      incident_id: incidentId ?? null,
    };
    this.store.revocations.push(record);
    this.maybeAutoSave();
  }

  isRevoked(certificateId: string): boolean {
    return this.store.revocations.some((r) => r.certificate_id === certificateId);
  }

  getRevocation(certificateId: string): RevocationRecord | null {
    return this.store.revocations.find((r) => r.certificate_id === certificateId) ?? null;
  }

  // ─────────────────────────────────────────────────────────────────
  // Verification History
  // ─────────────────────────────────────────────────────────────────

  logVerification(record: Omit<VerificationHistoryRecord, "id">): void {
    this.store.counters.verification_id++;
    const fullRecord: VerificationHistoryRecord = {
      ...record,
      id: this.store.counters.verification_id,
    };
    this.store.verification_history.push(fullRecord);

    // Keep only last 10000 records
    if (this.store.verification_history.length > 10000) {
      this.store.verification_history = this.store.verification_history.slice(-10000);
    }

    this.maybeAutoSave();
  }

  getVerificationHistory(certificateId: string, limit: number = 100): VerificationHistoryRecord[] {
    return this.store.verification_history
      .filter((v) => v.certificate_id === certificateId)
      .sort((a, b) => new Date(b.request_timestamp).getTime() - new Date(a.request_timestamp).getTime())
      .slice(0, limit);
  }

  // ─────────────────────────────────────────────────────────────────
  // Audit Log
  // ─────────────────────────────────────────────────────────────────

  audit(
    action: string,
    resourceType: string,
    resourceId: string | null,
    actorType: AuditLogRecord["actor_type"],
    actorId?: string,
    details?: string,
    requestIp?: string,
    requestId?: string
  ): void {
    this.store.counters.audit_id++;
    const record: AuditLogRecord = {
      id: this.store.counters.audit_id,
      timestamp: new Date().toISOString(),
      action,
      resource_type: resourceType,
      resource_id: resourceId,
      actor_type: actorType,
      actor_id: actorId ?? null,
      details: details ?? null,
      request_ip: requestIp ?? null,
      request_id: requestId ?? null,
    };
    this.store.audit_log.push(record);

    // Keep only last 10000 records
    if (this.store.audit_log.length > 10000) {
      this.store.audit_log = this.store.audit_log.slice(-10000);
    }

    this.maybeAutoSave();
  }

  getAuditLog(
    options: {
      resourceType?: string;
      resourceId?: string;
      actorType?: string;
      actorId?: string;
      since?: string;
      limit?: number;
    } = {}
  ): AuditLogRecord[] {
    let records = this.store.audit_log;

    if (options.resourceType) {
      records = records.filter((r) => r.resource_type === options.resourceType);
    }
    if (options.resourceId) {
      records = records.filter((r) => r.resource_id === options.resourceId);
    }
    if (options.actorType) {
      records = records.filter((r) => r.actor_type === options.actorType);
    }
    if (options.actorId) {
      records = records.filter((r) => r.actor_id === options.actorId);
    }
    if (options.since) {
      const sinceDate = new Date(options.since);
      records = records.filter((r) => new Date(r.timestamp) >= sinceDate);
    }

    return records
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime())
      .slice(0, options.limit ?? 100);
  }

  // ─────────────────────────────────────────────────────────────────
  // CA Keys
  // ─────────────────────────────────────────────────────────────────

  getActiveKey(): CAKeyRecord | null {
    return this.store.ca_keys.find((k) => k.status === "active") ?? null;
  }

  insertKey(key: Omit<CAKeyRecord, "certificates_signed" | "created_at">): void {
    const record: CAKeyRecord = {
      ...key,
      created_at: new Date().toISOString(),
      certificates_signed: 0,
    };
    this.store.ca_keys.push(record);
    this.maybeAutoSave();
  }

  incrementKeyUsage(keyId: string): void {
    const key = this.store.ca_keys.find((k) => k.id === keyId);
    if (key) {
      key.certificates_signed++;
      this.maybeAutoSave();
    }
  }

  // ─────────────────────────────────────────────────────────────────
  // Transaction Support (simplified)
  // ─────────────────────────────────────────────────────────────────

  transaction<T>(fn: () => T): T {
    const wasAutoSave = this.autoSave;
    this.autoSave = false;

    try {
      const result = fn();
      this.save();
      return result;
    } finally {
      this.autoSave = wasAutoSave;
    }
  }

  /**
   * Close database (save final state)
   */
  close(): void {
    this.save();
  }
}
