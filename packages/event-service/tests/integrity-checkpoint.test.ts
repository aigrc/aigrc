import { describe, it, expect, vi, beforeEach } from "vitest";
import crypto from "crypto";
import {
  GovernanceEventBuilder,
  type BuilderConfig,
  type GovernanceEvent,
} from "@aigrc/events";
import {
  IntegrityCheckpointService,
  createPlatformBuilder,
} from "../src/services/integrity-checkpoint.js";
import { EMPTY_MERKLE_ROOT, buildMerkleTree } from "../src/services/merkle-tree.js";

// ─── Helpers ──────────────────────────────────────────────────

function makeHash(content: string): string {
  const hex = crypto.createHash("sha256").update(content).digest("hex");
  return `sha256:${hex}`;
}

function makeEvent(overrides: Partial<GovernanceEvent> = {}): GovernanceEvent {
  return {
    id: `evt_${crypto.randomBytes(16).toString("hex")}`,
    specVersion: "1.0",
    schemaVersion: "aigrc-events@0.1.0",
    type: "aigrc.asset.created",
    category: "asset",
    criticality: "normal",
    source: {
      tool: "cli",
      version: "0.2.0",
      orgId: "org-test",
      instanceId: "cli-test",
      identity: { type: "api-key", subject: "test@test.com" },
      environment: "development",
    },
    orgId: "org-test",
    assetId: "agent-001",
    producedAt: "2026-02-24T12:00:00Z",
    goldenThread: {
      type: "linked",
      system: "jira",
      ref: "AIG-100",
      url: "https://aigos.atlassian.net/browse/AIG-100",
      status: "active",
    },
    hash: makeHash(`event-${Math.random()}`),
    data: { cardId: "agent-001", cardVersion: "1.0.0" },
    ...overrides,
  } as GovernanceEvent;
}

/**
 * Create a mock EventStore with configurable event lists
 */
function createMockEventStore(eventsForDate: GovernanceEvent[] = []) {
  return {
    listEventsForDate: vi.fn().mockResolvedValue(eventsForDate),
    getOrgsWithEventsOnDate: vi.fn().mockResolvedValue(["org-test"]),
    // Other methods (not used by checkpoint service)
    store: vi.fn(),
    storeMany: vi.fn(),
    findById: vi.fn(),
    listEvents: vi.fn(),
    listAssets: vi.fn(),
    getAssetEvents: vi.fn(),
    clearCache: vi.fn(),
  };
}

const BUILDER_CONFIG: BuilderConfig = {
  source: {
    tool: "platform",
    version: "0.2.0",
    orgId: "org-test",
    instanceId: "integrity-checkpoint-service",
    identity: { type: "service-token", subject: "integrity@aigos.dev" },
    environment: "production",
  },
};

// ─────────────────────────────────────────────────────────────────
// TESTS: IntegrityCheckpointService
// ─────────────────────────────────────────────────────────────────

describe("IntegrityCheckpointService", () => {
  it("computes checkpoint for a normal day with events", async () => {
    const events = [
      makeEvent({ hash: makeHash("event-1") }),
      makeEvent({ hash: makeHash("event-2") }),
      makeEvent({ hash: makeHash("event-3") }),
    ];

    const mockStore = createMockEventStore(events);
    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
    });

    const result = await service.computeDailyCheckpoint("org-test", "2026-02-24");

    expect(result.orgId).toBe("org-test");
    expect(result.date).toBe("2026-02-24");
    expect(result.eventCount).toBe(3);
    expect(result.merkleRoot).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(result.computedAt).toBeTruthy();
  });

  it("returns sentinel root for zero-event day", async () => {
    const mockStore = createMockEventStore([]);
    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
    });

    const result = await service.computeDailyCheckpoint("org-test", "2026-02-24");

    expect(result.merkleRoot).toBe(EMPTY_MERKLE_ROOT);
    expect(result.eventCount).toBe(0);
  });

  it("queries events with correct org and date", async () => {
    const mockStore = createMockEventStore([]);
    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
    });

    await service.computeDailyCheckpoint("org-acme", "2026-03-15");

    expect(mockStore.listEventsForDate).toHaveBeenCalledWith(
      "org-acme",
      "2026-03-15",
    );
  });

  it("produces deterministic root for same events", async () => {
    const events = [
      makeEvent({ hash: makeHash("deterministic-1") }),
      makeEvent({ hash: makeHash("deterministic-2") }),
    ];

    const mockStore = createMockEventStore(events);
    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
    });

    const result1 = await service.computeDailyCheckpoint("org-test", "2026-02-24");
    const result2 = await service.computeDailyCheckpoint("org-test", "2026-02-24");

    expect(result1.merkleRoot).toBe(result2.merkleRoot);
  });

  it("emits audit.chain.verified event when builder provided", async () => {
    const events = [makeEvent({ hash: makeHash("event-1") })];
    const mockStore = createMockEventStore(events);
    const builder = new GovernanceEventBuilder(BUILDER_CONFIG);

    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
      builder,
    });

    const result = await service.computeDailyCheckpoint("org-test", "2026-02-24");

    expect(result.verificationEvent).toBeDefined();
    expect(result.verificationEvent!.type).toBe("aigrc.audit.chain.verified");
    expect(result.verificationEvent!.assetId).toBe("system-integrity");
    expect((result.verificationEvent!.data as any).merkleRoot).toBe(result.merkleRoot);
    expect((result.verificationEvent!.data as any).auditId).toBe("checkpoint_org-test_2026-02-24");
    expect((result.verificationEvent!.data as any).eventCount).toBe(1);
    expect((result.verificationEvent!.data as any).auditType).toBe("chain-verification");
  });

  it("does not emit event when no builder provided", async () => {
    const mockStore = createMockEventStore([]);
    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
    });

    const result = await service.computeDailyCheckpoint("org-test", "2026-02-24");

    expect(result.verificationEvent).toBeUndefined();
  });

  it("merkle root matches manual computation", async () => {
    const hash1 = makeHash("event-A");
    const hash2 = makeHash("event-B");
    const events = [
      makeEvent({ hash: hash1 }),
      makeEvent({ hash: hash2 }),
    ];

    const mockStore = createMockEventStore(events);
    const service = new IntegrityCheckpointService({
      eventStore: mockStore as any,
    });

    const result = await service.computeDailyCheckpoint("org-test", "2026-02-24");

    // Manually compute expected root
    const expectedRoot = buildMerkleTree([hash1, hash2]);
    expect(result.merkleRoot).toBe(expectedRoot);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: createPlatformBuilder
// ─────────────────────────────────────────────────────────────────

describe("createPlatformBuilder", () => {
  it("creates a builder with platform source config", () => {
    const builder = createPlatformBuilder("org-acme");

    // Build an event to verify source config
    const event = builder.auditChainVerified({
      assetId: "system-integrity",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "platform",
        declaredAt: new Date().toISOString(),
        remediationDeadline: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000).toISOString(),
        remediationNote: "System-generated integrity checkpoint for automated verification.",
      },
      data: { checkpointType: "daily-merkle-root" },
    });

    expect(event.source.tool).toBe("platform");
    expect(event.source.orgId).toBe("org-acme");
    expect(event.source.identity.type).toBe("service-token");
    expect(event.type).toBe("aigrc.audit.chain.verified");
  });
});
