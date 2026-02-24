import { describe, it, expect } from "vitest";
import {
  GovernanceEventBuilder,
  GovernanceEventValidationError,
} from "../src/builder";
import type { BuilderConfig } from "../src/builder";
import { AigrcEventValidator } from "../src/validator";
import { computeEventHash } from "../src/event-hash";
import { DEFAULT_CRITICALITY_MAP, EVENT_TYPE_CATEGORY_MAP } from "../src/constants";
import type { GoldenThreadRef } from "../src/schemas/golden-thread-ref";

// ─────────────────────────────────────────────────────────────────
// TEST FIXTURES
// ─────────────────────────────────────────────────────────────────

const STANDARD_CONFIG: BuilderConfig = {
  source: {
    tool: "cli",
    version: "0.4.2",
    orgId: "org-pangolabs",
    instanceId: "inst-001",
    identity: { type: "api-key", subject: "dev@pangolabs.cloud" },
    environment: "production",
  },
};

const HIGH_FREQ_CONFIG: BuilderConfig = {
  source: {
    tool: "runtime-sdk",
    version: "1.0.0",
    orgId: "org-pangolabs",
    instanceId: "inst-runtime-001",
    identity: { type: "service-token", subject: "runtime@pangolabs.cloud" },
    environment: "production",
  },
};

const LINKED_THREAD: GoldenThreadRef = {
  type: "linked",
  system: "jira",
  ref: "AIG-199",
  url: "https://aigos.atlassian.net/browse/AIG-199",
  status: "active",
};

const ORPHAN_THREAD: GoldenThreadRef = {
  type: "orphan",
  reason: "discovery",
  declaredBy: "dev@pangolabs.cloud",
  declaredAt: "2026-02-24T12:00:00Z",
  remediationDeadline: "2026-03-10T12:00:00Z",
  remediationNote: "Will link to AIG-200 once sprint begins and work is assigned",
};

const FIXED_TIMESTAMP = "2026-02-24T12:00:00.100Z";

// ─────────────────────────────────────────────────────────────────
// CONSTRUCTION
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Construction", () => {
  it("creates a builder with valid config", () => {
    const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
    expect(builder).toBeDefined();
  });

  it("creates a builder with high-frequency config", () => {
    const builder = new GovernanceEventBuilder(HIGH_FREQ_CONFIG);
    expect(builder).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// ASSET EVENTS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Asset Events", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const assetData = {
    cardId: "card-001",
    cardVersion: "1.0.0",
    assetType: "agent" as const,
    riskLevel: "high" as const,
  };

  it("assetCreated produces valid event", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: assetData,
      timestamp: FIXED_TIMESTAMP,
    });

    expect(event.type).toBe("aigrc.asset.created");
    expect(event.category).toBe("asset");
    expect(event.specVersion).toBe("1.0");
    expect(event.schemaVersion).toBe("aigrc-events@0.1.0");
    expect(event.id).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(event.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(event.orgId).toBe("org-pangolabs");
    expect(event.assetId).toBe("aigrc-2024-a1b2c3d4");
  });

  it("assetUpdated produces valid event", () => {
    const event = builder.assetUpdated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: { ...assetData, changes: [{ field: "riskLevel", previous: "minimal", current: "high", changedBy: "admin" }] },
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.asset.updated");
    expect(event.category).toBe("asset");
  });

  it("assetDiscovered produces high criticality by default", () => {
    const event = builder.assetDiscovered({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: ORPHAN_THREAD,
      data: assetData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.criticality).toBe("high");
  });

  it("assetRetired produces valid event", () => {
    const event = builder.assetRetired({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: assetData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.asset.retired");
  });

  it("assetRegistered produces valid event", () => {
    const event = builder.assetRegistered({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: assetData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.asset.registered");
  });
});

// ─────────────────────────────────────────────────────────────────
// SCAN EVENTS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Scan Events", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const scanData = {
    scanId: "scan-001",
    trigger: "commit" as const,
    filesScanned: 42,
    findingCount: 3,
    durationMs: 1250,
  };

  it("scanStarted produces valid event", () => {
    const event = builder.scanStarted({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: scanData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.scan.started");
    expect(event.category).toBe("scan");
  });

  it("scanCompleted produces valid event", () => {
    const event = builder.scanCompleted({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: scanData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.scan.completed");
  });

  it("scanFinding produces valid event", () => {
    const event = builder.scanFinding({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: scanData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.scan.finding");
  });
});

// ─────────────────────────────────────────────────────────────────
// ENFORCEMENT EVENTS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Enforcement Events", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const enforcementData = {
    decisionId: "dec-001",
    ruleId: "rule-001",
    ruleName: "No PII Access",
    action: "Block access to PII data store",
    outcome: "deny" as const,
    latencyMs: 1.5,
    policySource: "bundle-001",
    confidence: 0.95,
  };

  it("enforcementKillswitch produces critical criticality by default", () => {
    const event = builder.enforcementKillswitch({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: enforcementData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.enforcement.killswitch");
    expect(event.criticality).toBe("critical");
  });

  it("enforcementDecision produces valid event", () => {
    const event = builder.enforcementDecision({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: enforcementData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.enforcement.decision");
    expect(event.category).toBe("enforcement");
  });
});

// ─────────────────────────────────────────────────────────────────
// LIFECYCLE EVENTS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Lifecycle Events", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const lifecycleData = {
    reason: "Orphan deadline reached",
    triggeredBy: "schedule" as const,
    details: "Asset has been orphaned for 30 days without remediation",
  };

  it("lifecycleOrphanDeclared produces valid event", () => {
    const event = builder.lifecycleOrphanDeclared({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: ORPHAN_THREAD,
      data: lifecycleData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.lifecycle.orphan.declared");
    expect(event.category).toBe("lifecycle");
  });

  it("lifecycleDecayExpired produces high criticality by default", () => {
    const event = builder.lifecycleDecayExpired({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: lifecycleData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.criticality).toBe("high");
  });
});

// ─────────────────────────────────────────────────────────────────
// POLICY EVENTS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Policy Events", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const policyData = {
    policyId: "pol-001",
    policyName: "EU AI Act Compliance",
    policyVersion: "1.0.0",
  };

  it("policyCompiled produces valid event", () => {
    const event = builder.policyCompiled({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: policyData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.policy.compiled");
    expect(event.category).toBe("policy");
  });
});

// ─────────────────────────────────────────────────────────────────
// AUDIT EVENTS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Audit Events", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const auditData = {
    auditId: "audit-001",
    auditType: "chain-verification" as const,
    eventCount: 500,
    verified: true,
  };

  it("auditChainBroken produces critical criticality by default", () => {
    const brokenData = { ...auditData, verified: false, brokenAt: "evt_abc", brokenReason: "Hash mismatch" };
    const event = builder.auditChainBroken({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: brokenData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.audit.chain.broken");
    expect(event.criticality).toBe("critical");
  });

  it("auditChainVerified produces valid event", () => {
    const event = builder.auditChainVerified({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: auditData,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.type).toBe("aigrc.audit.chain.verified");
    expect(event.category).toBe("audit");
  });
});

// ─────────────────────────────────────────────────────────────────
// DETERMINISM & INTEGRITY
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Determinism & Integrity", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const validator = new AigrcEventValidator();

  const baseParams = {
    assetId: "aigrc-2024-a1b2c3d4",
    goldenThread: LINKED_THREAD,
    data: { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const },
    timestamp: FIXED_TIMESTAMP,
  };

  it("produces deterministic IDs (same params → same ID)", () => {
    const e1 = builder.assetCreated(baseParams);
    const e2 = builder.assetCreated(baseParams);
    expect(e1.id).toBe(e2.id);
  });

  it("produces deterministic hashes (same params → same hash)", () => {
    const e1 = builder.assetCreated(baseParams);
    const e2 = builder.assetCreated(baseParams);
    expect(e1.hash).toBe(e2.hash);
  });

  it("hash matches recomputed canonical hash", () => {
    const event = builder.assetCreated(baseParams);
    const { hash } = computeEventHash(event as unknown as Record<string, unknown>);
    expect(event.hash).toBe(hash);
  });

  it("passes full AigrcEventValidator validation", () => {
    const event = builder.assetCreated(baseParams);
    const result = validator.validate(event);
    expect(result.valid).toBe(true);
    expect(result.errors).toHaveLength(0);
  });

  it("returns frozen (immutable) events", () => {
    const event = builder.assetCreated(baseParams);
    expect(Object.isFrozen(event)).toBe(true);
  });
});

// ─────────────────────────────────────────────────────────────────
// CATEGORY & CRITICALITY MAPPING
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Category & Criticality", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);

  it("sets correct category from EVENT_TYPE_CATEGORY_MAP", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const },
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.category).toBe(EVENT_TYPE_CATEGORY_MAP["aigrc.asset.created"]);
  });

  it("uses default criticality from DEFAULT_CRITICALITY_MAP", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const },
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.criticality).toBe(DEFAULT_CRITICALITY_MAP["aigrc.asset.created"]);
  });

  it("allows criticality override", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const },
      timestamp: FIXED_TIMESTAMP,
      criticality: "critical",
    });
    expect(event.criticality).toBe("critical");
  });
});

// ─────────────────────────────────────────────────────────────────
// GOLDEN THREAD
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Golden Thread", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const data = { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const };

  it("accepts linked golden thread", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.goldenThread.type).toBe("linked");
  });

  it("accepts orphan golden thread", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: ORPHAN_THREAD,
      data,
      timestamp: FIXED_TIMESTAMP,
    });
    expect(event.goldenThread.type).toBe("orphan");
  });
});

// ─────────────────────────────────────────────────────────────────
// OPTIONAL FIELDS
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Optional Fields", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);
  const data = { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const };

  it("forwards correlationId", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data,
      timestamp: FIXED_TIMESTAMP,
      correlationId: "corr-pr-42",
    });
    expect(event.correlationId).toBe("corr-pr-42");
  });

  it("forwards parentEventId", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data,
      timestamp: FIXED_TIMESTAMP,
      parentEventId: "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    });
    expect(event.parentEventId).toBe("evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8");
  });

  it("forwards previousHash", () => {
    const event = builder.assetCreated({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data,
      timestamp: FIXED_TIMESTAMP,
      previousHash: "sha256:a3f8c2e1d94b7f63a2891c04e5d6b7f8a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    });
    expect(event.previousHash).toBe(
      "sha256:a3f8c2e1d94b7f63a2891c04e5d6b7f8a3f8c2e1d94b7f63a2891c04e5d6b7f8"
    );
  });
});

// ─────────────────────────────────────────────────────────────────
// HIGH-FREQUENCY TOOL
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — High-Frequency Tool", () => {
  const builder = new GovernanceEventBuilder(HIGH_FREQ_CONFIG);

  it("produces valid events with runtime-sdk tool", () => {
    const event = builder.enforcementDecision({
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: {
        decisionId: "dec-001",
        ruleId: "rule-001",
        ruleName: "No PII Access",
        action: "Block access",
        outcome: "deny",
        latencyMs: 1.2,
        policySource: "bundle-001",
        confidence: 0.99,
      },
      timestamp: FIXED_TIMESTAMP,
    });

    expect(event.id).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(event.source.tool).toBe("runtime-sdk");
  });

  it("high-freq and standard tools produce different IDs for same params", () => {
    const standardBuilder = new GovernanceEventBuilder(STANDARD_CONFIG);
    const hfBuilder = new GovernanceEventBuilder(HIGH_FREQ_CONFIG);

    const params = {
      assetId: "aigrc-2024-a1b2c3d4",
      goldenThread: LINKED_THREAD,
      data: { cardId: "card-001", cardVersion: "1.0.0", assetType: "agent" as const, riskLevel: "high" as const },
      timestamp: FIXED_TIMESTAMP,
    };

    const e1 = standardBuilder.assetCreated(params);
    const e2 = hfBuilder.assetCreated(params);
    expect(e1.id).not.toBe(e2.id);
  });
});

// ─────────────────────────────────────────────────────────────────
// ERROR HANDLING
// ─────────────────────────────────────────────────────────────────

describe("GovernanceEventBuilder — Error Handling", () => {
  const builder = new GovernanceEventBuilder(STANDARD_CONFIG);

  it("throws GovernanceEventValidationError for invalid data", () => {
    expect(() =>
      builder.assetCreated({
        assetId: "aigrc-2024-a1b2c3d4",
        goldenThread: LINKED_THREAD,
        // Empty data — should fail EVT_DATA_EMPTY
        data: {} as any,
        timestamp: FIXED_TIMESTAMP,
      })
    ).toThrow(GovernanceEventValidationError);
  });

  it("error includes validation errors array", () => {
    try {
      builder.assetCreated({
        assetId: "aigrc-2024-a1b2c3d4",
        goldenThread: LINKED_THREAD,
        data: {} as any,
        timestamp: FIXED_TIMESTAMP,
      });
      expect.unreachable("should have thrown");
    } catch (e) {
      expect(e).toBeInstanceOf(GovernanceEventValidationError);
      const err = e as GovernanceEventValidationError;
      expect(err.errors.length).toBeGreaterThan(0);
      expect(err.message).toContain("EVT_");
    }
  });
});
