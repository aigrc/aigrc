import { describe, it, expect, beforeEach } from "vitest";
import { PolicyEvaluator } from "../src/services/policy-evaluator.js";
import {
  InMemoryPolicyBundleStore,
  type PolicyBundle,
} from "../src/services/policy-bundle-store.js";
import type { GovernanceEvent } from "@aigrc/events";

// ─────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────

const ORG_ID = "org-pangolabs";

function makeEvent(overrides: Partial<GovernanceEvent> = {}): GovernanceEvent {
  return {
    id: "evt_a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    specVersion: "1.0",
    schemaVersion: "aigrc-events@0.1.0",
    type: "aigrc.asset.created",
    category: "asset",
    criticality: "normal",
    source: {
      tool: "cli",
      version: "0.4.2",
      orgId: ORG_ID,
      instanceId: "inst-001",
      identity: { type: "api-key", subject: "dev@pangolabs.cloud" },
      environment: "production",
    },
    orgId: ORG_ID,
    assetId: "aigrc-2024-a1b2c3d4",
    producedAt: "2026-02-24T12:00:00Z",
    goldenThread: {
      type: "linked",
      system: "jira",
      ref: "AIG-199",
      url: "https://aigos.atlassian.net/browse/AIG-199",
      status: "active",
    },
    hash: "sha256:a3f8c2e1d94b7f63a2891c04e5d6b7f8a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    data: { cardId: "card-001", cardVersion: "1.0.0" },
    ...overrides,
  } as GovernanceEvent;
}

function makeBundle(overrides: Partial<PolicyBundle> = {}): PolicyBundle {
  return {
    id: "bundle-001",
    orgId: ORG_ID,
    rules: [
      {
        id: "RULE_GOLDEN_THREAD",
        name: "Golden thread must be linked",
        severity: "blocking",
        description: "All events must have a linked golden thread",
        remediation: "Link this asset to a business authorization ticket",
        appliesTo: [],
        check: "golden-thread-required",
      },
    ],
    waivers: [],
    ...overrides,
  };
}

// ─────────────────────────────────────────────────────────────────
// TESTS
// ─────────────────────────────────────────────────────────────────

describe("PolicyEvaluator", () => {
  let bundleStore: InMemoryPolicyBundleStore;
  let evaluator: PolicyEvaluator;

  beforeEach(() => {
    bundleStore = new InMemoryPolicyBundleStore();
    evaluator = new PolicyEvaluator(bundleStore);
  });

  // ─── Null cases ─────────────────────────────────────────────

  it("returns null when no active bundle exists", async () => {
    const event = makeEvent();
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).toBeNull();
  });

  it("returns null for non-evaluated event types", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle());

    const event = makeEvent({ type: "aigrc.policy.compiled" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).toBeNull();
  });

  it("returns null for lifecycle event types", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle());

    const event = makeEvent({ type: "aigrc.lifecycle.orphan.declared" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).toBeNull();
  });

  // ─── Evaluated event types ──────────────────────────────────

  it("evaluates asset.created events", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));
    const event = makeEvent({ type: "aigrc.asset.created" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).not.toBeNull();
    expect(result!.policyResult.evaluated).toBe(true);
  });

  it("evaluates asset.updated events", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));
    const event = makeEvent({ type: "aigrc.asset.updated" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).not.toBeNull();
  });

  it("evaluates scan.completed events", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));
    const event = makeEvent({ type: "aigrc.scan.completed" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).not.toBeNull();
  });

  it("evaluates classification.changed events", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));
    const event = makeEvent({ type: "aigrc.classification.changed" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);
    expect(result).not.toBeNull();
  });

  // ─── Rule evaluation ───────────────────────────────────────

  it("passes when linked golden thread satisfies golden-thread-required rule", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle());

    const event = makeEvent(); // has linked golden thread
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.passed).toBe(true);
    expect(result!.policyResult.violations).toHaveLength(0);
  });

  it("detects blocking violation when orphan golden thread violates golden-thread-required", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle());

    const event = makeEvent({
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test@test.com",
        declaredAt: "2026-02-24T12:00:00Z",
        remediationDeadline: "2026-06-24T12:00:00Z",
        remediationNote: "Will link once sprint starts and work is assigned",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.passed).toBe(false);
    expect(result!.policyResult.violations).toHaveLength(1);
    expect(result!.policyResult.violations[0].ruleId).toBe("RULE_GOLDEN_THREAD");
    expect(result!.policyResult.violations[0].severity).toBe("blocking");
  });

  it("passes with warning-only violations", async () => {
    bundleStore.setBundle(
      ORG_ID,
      makeBundle({
        rules: [
          {
            id: "RULE_CORRELATION",
            name: "Correlation ID recommended",
            severity: "warning",
            description: "Events should have correlationId for traceability",
            remediation: "Set correlationId on all events",
            appliesTo: [],
            check: "correlation-id-required",
          },
        ],
      }),
    );

    const event = makeEvent(); // no correlationId
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.passed).toBe(true); // warning-only = still passes
    expect(result!.policyResult.violations).toHaveLength(1);
    expect(result!.policyResult.violations[0].severity).toBe("warning");
  });

  it("respects appliesTo filter — skips rules for non-matching event types", async () => {
    bundleStore.setBundle(
      ORG_ID,
      makeBundle({
        rules: [
          {
            id: "RULE_SIG",
            name: "Signature required",
            severity: "blocking",
            description: "Events must have signatures",
            remediation: "Sign events",
            appliesTo: ["aigrc.scan.completed"], // only applies to scan events
            check: "signature-required",
          },
        ],
      }),
    );

    const event = makeEvent({ type: "aigrc.asset.created" } as any); // asset, not scan
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.passed).toBe(true);
    expect(result!.policyResult.violations).toHaveLength(0);
  });

  // ─── Waivers ───────────────────────────────────────────────

  it("applies active waivers to suppress violations", async () => {
    const futureDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    bundleStore.setBundle(
      ORG_ID,
      makeBundle({
        waivers: [
          {
            ruleId: "RULE_GOLDEN_THREAD",
            waivedBy: "admin@pangolabs.cloud",
            expiresAt: futureDate,
            reason: "Legacy migration in progress",
          },
        ],
      }),
    );

    const event = makeEvent({
      goldenThread: {
        type: "orphan",
        reason: "legacy-migration",
        declaredBy: "test@test.com",
        declaredAt: "2026-02-24T12:00:00Z",
        remediationDeadline: "2026-06-24T12:00:00Z",
        remediationNote: "Migrating from legacy system, will link once complete",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.passed).toBe(true); // waiver suppresses blocking violation
    expect(result!.policyResult.violations).toHaveLength(0); // waived out
    expect(result!.policyResult.waivers).toHaveLength(1);
    expect(result!.policyResult.waivers[0].ruleId).toBe("RULE_GOLDEN_THREAD");
  });

  it("ignores expired waivers", async () => {
    const pastDate = new Date(Date.now() - 1000).toISOString();

    bundleStore.setBundle(
      ORG_ID,
      makeBundle({
        waivers: [
          {
            ruleId: "RULE_GOLDEN_THREAD",
            waivedBy: "admin@pangolabs.cloud",
            expiresAt: pastDate, // expired
            reason: "Legacy migration was in progress",
          },
        ],
      }),
    );

    const event = makeEvent({
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test@test.com",
        declaredAt: "2026-02-24T12:00:00Z",
        remediationDeadline: "2026-06-24T12:00:00Z",
        remediationNote: "Will link once sprint starts and work is assigned",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.passed).toBe(false); // expired waiver doesn't help
    expect(result!.policyResult.violations).toHaveLength(1);
    expect(result!.policyResult.waivers).toHaveLength(0);
  });

  // ─── Conformance gaps ──────────────────────────────────────

  it("detects SILVER conformance gap when signature is missing", async () => {
    bundleStore.setBundle(
      ORG_ID,
      makeBundle({ rules: [], conformanceTarget: "SILVER" }),
    );

    const event = makeEvent(); // no signature
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.complianceGaps.length).toBeGreaterThan(0);
    const sigGap = result!.complianceGaps.find(
      (g) => g.ruleId === "CONFORMANCE_SIGNATURE",
    );
    expect(sigGap).toBeDefined();
    expect(sigGap!.severity).toBe("warning");
  });

  it("detects GOLD conformance gap when previousHash is missing", async () => {
    bundleStore.setBundle(
      ORG_ID,
      makeBundle({ rules: [], conformanceTarget: "GOLD" }),
    );

    const event = makeEvent(); // no previousHash
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const chainGap = result!.complianceGaps.find(
      (g) => g.ruleId === "CONFORMANCE_CHAIN",
    );
    expect(chainGap).toBeDefined();
  });

  it("no conformance gaps when no target set", async () => {
    bundleStore.setBundle(
      ORG_ID,
      makeBundle({ rules: [], conformanceTarget: undefined }),
    );

    const event = makeEvent();
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.complianceGaps).toHaveLength(0);
  });

  // ─── Governance warnings ───────────────────────────────────

  it("warns when orphan remediation deadline is approaching", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const threeDaysFromNow = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString();

    const event = makeEvent({
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test@test.com",
        declaredAt: "2026-02-20T12:00:00Z",
        remediationDeadline: threeDaysFromNow,
        remediationNote: "Will link once sprint starts and work is assigned",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const deadlineWarning = result!.warnings.find(
      (w) => w.code === "ORPHAN_DEADLINE_APPROACHING",
    );
    expect(deadlineWarning).toBeDefined();
    expect(deadlineWarning!.severity).toBe("warning");
  });

  it("warns urgently when orphan remediation deadline has passed", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const pastDeadline = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString();

    const event = makeEvent({
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test@test.com",
        declaredAt: "2026-01-01T12:00:00Z",
        remediationDeadline: pastDeadline,
        remediationNote: "This deadline has already passed, should be urgent",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const overdueWarning = result!.warnings.find(
      (w) => w.code === "ORPHAN_OVERDUE",
    );
    expect(overdueWarning).toBeDefined();
    expect(overdueWarning!.severity).toBe("urgent");
  });

  it("warns when linked thread verification is stale", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const sixtyDaysAgo = new Date(Date.now() - 60 * 24 * 60 * 60 * 1000).toISOString();

    const event = makeEvent({
      goldenThread: {
        type: "linked",
        system: "jira",
        ref: "AIG-100",
        url: "https://aigos.atlassian.net/browse/AIG-100",
        status: "active",
        verifiedAt: sixtyDaysAgo,
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const staleWarning = result!.warnings.find(
      (w) => w.code === "THREAD_STALE",
    );
    expect(staleWarning).toBeDefined();
    expect(staleWarning!.severity).toBe("warning");
  });

  it("warns when linked thread has non-active status", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const event = makeEvent({
      goldenThread: {
        type: "linked",
        system: "jira",
        ref: "AIG-100",
        url: "https://aigos.atlassian.net/browse/AIG-100",
        status: "cancelled",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const inactiveWarning = result!.warnings.find(
      (w) => w.code === "THREAD_INACTIVE",
    );
    expect(inactiveWarning).toBeDefined();
    expect(inactiveWarning!.severity).toBe("info");
  });

  // ─── Suggestions ───────────────────────────────────────────

  it("suggests linking orphan events", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const event = makeEvent({
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test@test.com",
        declaredAt: "2026-02-24T12:00:00Z",
        remediationDeadline: "2026-06-24T12:00:00Z",
        remediationNote: "Will link once sprint starts and work is assigned",
      },
    } as any);

    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const linkSuggestion = result!.suggestions.find(
      (s) => s.code === "SUGGEST_LINK_THREAD",
    );
    expect(linkSuggestion).toBeDefined();
    expect(linkSuggestion!.source).toBe("best-practice");
    expect(linkSuggestion!.confidence).toBeGreaterThan(0);
    expect(linkSuggestion!.confidence).toBeLessThanOrEqual(1);
  });

  it("suggests adding correlationId when missing", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const event = makeEvent(); // no correlationId
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const corrSuggestion = result!.suggestions.find(
      (s) => s.code === "SUGGEST_CORRELATION_ID",
    );
    expect(corrSuggestion).toBeDefined();
  });

  it("suggests signing high-criticality events", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ rules: [] }));

    const event = makeEvent({ criticality: "high" } as any);
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    const signSuggestion = result!.suggestions.find(
      (s) => s.code === "SUGGEST_SIGN_HIGH_CRIT",
    );
    expect(signSuggestion).toBeDefined();
  });

  // ─── Integration: bundleId in result ───────────────────────

  it("includes bundleId in policy result", async () => {
    bundleStore.setBundle(ORG_ID, makeBundle({ id: "my-bundle-42" }));

    const event = makeEvent();
    const result = await evaluator.evaluate(event, ORG_ID);

    expect(result).not.toBeNull();
    expect(result!.policyResult.bundleId).toBe("my-bundle-42");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: InMemoryPolicyBundleStore
// ─────────────────────────────────────────────────────────────────

describe("InMemoryPolicyBundleStore", () => {
  it("returns null when no bundle set", async () => {
    const store = new InMemoryPolicyBundleStore();
    const bundle = await store.getActiveBundle("org-test");
    expect(bundle).toBeNull();
  });

  it("returns bundle after setBundle", async () => {
    const store = new InMemoryPolicyBundleStore();
    const bundle = makeBundle();
    store.setBundle(ORG_ID, bundle);
    const result = await store.getActiveBundle(ORG_ID);
    expect(result).toEqual(bundle);
  });

  it("removes bundle after removeBundle", async () => {
    const store = new InMemoryPolicyBundleStore();
    store.setBundle(ORG_ID, makeBundle());
    store.removeBundle(ORG_ID);
    const result = await store.getActiveBundle(ORG_ID);
    expect(result).toBeNull();
  });

  it("clears all bundles", async () => {
    const store = new InMemoryPolicyBundleStore();
    store.setBundle("org-1", makeBundle({ orgId: "org-1" }));
    store.setBundle("org-2", makeBundle({ orgId: "org-2" }));
    store.clear();
    expect(await store.getActiveBundle("org-1")).toBeNull();
    expect(await store.getActiveBundle("org-2")).toBeNull();
  });
});
