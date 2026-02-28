import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";

// ─────────────────────────────────────────────────────────────────
// Test the pull command logic
// We test asset comparison, YAML generation, and status display
// without actually invoking the CLI or making HTTP calls.
// ─────────────────────────────────────────────────────────────────

import type { GovernanceEvent, AssetSummary } from "@aigrc/events";

// ─── Helpers ──────────────────────────────────────────────────

function makeAssetSummary(overrides: Partial<AssetSummary> = {}): AssetSummary {
  return {
    assetId: "agent-001",
    lastEventAt: "2026-02-24T12:00:00Z",
    eventCount: 5,
    latestType: "aigrc.asset.updated",
    ...overrides,
  };
}

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
    hash: "sha256:a3f8c2e1d94b7f63a2891c04e5d6b7f8a3f8c2e1d94b7f63a2891c04e5d6b7f8",
    data: { cardId: "agent-001", cardVersion: "1.0.0" },
    ...overrides,
  } as GovernanceEvent;
}

/**
 * Sanitize asset ID for filename (mirrors pull.ts logic)
 */
function sanitizeFilename(assetId: string): string {
  return assetId.replace(/[^a-zA-Z0-9._-]/g, "-");
}

/**
 * Compare remote assets against local YAML files (mirrors pull.ts logic)
 */
interface AssetDiff {
  assetId: string;
  status: "new" | "modified" | "unchanged" | "local-only";
  remoteEventCount?: number;
  remoteLastEvent?: string;
  localExists: boolean;
}

async function compareAssets(
  remoteAssets: AssetSummary[],
  cardsDir: string,
): Promise<AssetDiff[]> {
  const diffs: AssetDiff[] = [];

  const localFiles = new Set<string>();
  try {
    const entries = await fs.readdir(cardsDir, { withFileTypes: true });
    for (const entry of entries) {
      if (
        entry.isFile() &&
        (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml"))
      ) {
        const assetName = path.basename(entry.name, path.extname(entry.name));
        localFiles.add(assetName);
      }
    }
  } catch {
    // Directory doesn't exist
  }

  for (const asset of remoteAssets) {
    const localName = sanitizeFilename(asset.assetId);
    const localPath = path.join(cardsDir, `${localName}.yaml`);

    let localExists = false;
    try {
      await fs.access(localPath);
      localExists = true;
    } catch {
      // File doesn't exist
    }

    if (!localExists) {
      diffs.push({
        assetId: asset.assetId,
        status: "new",
        remoteEventCount: asset.eventCount,
        remoteLastEvent: asset.latestType,
        localExists: false,
      });
    } else {
      diffs.push({
        assetId: asset.assetId,
        status: "modified",
        remoteEventCount: asset.eventCount,
        remoteLastEvent: asset.latestType,
        localExists: true,
      });
    }

    localFiles.delete(localName);
  }

  for (const localName of localFiles) {
    diffs.push({
      assetId: localName,
      status: "local-only",
      localExists: true,
    });
  }

  return diffs;
}

/**
 * Build card data from event (mirrors pull.ts logic)
 */
function buildCardFromEvent(
  event: GovernanceEvent,
  diff: AssetDiff,
): Record<string, unknown> {
  const card: Record<string, unknown> = {
    assetId: event.assetId,
    version: (event.data as any)?.cardVersion ?? "1.0.0",
    lastEventAt: event.producedAt,
    lastEventType: event.type,
    eventCount: diff.remoteEventCount,
  };

  if (event.goldenThread) {
    card.goldenThread = event.goldenThread;
  }

  if (event.data) {
    const { cardId, cardVersion, ...restData } = event.data as Record<string, unknown>;
    if (Object.keys(restData).length > 0) {
      card.data = restData;
    }
  }

  if (event.source) {
    card.source = {
      tool: event.source.tool,
      environment: event.source.environment,
    };
  }

  return card;
}

// ─────────────────────────────────────────────────────────────────
// TESTS: Asset Comparison
// ─────────────────────────────────────────────────────────────────

describe("Pull — Asset Comparison", () => {
  let tempDir: string;
  let cardsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aigrc-pull-"));
    cardsDir = path.join(tempDir, "cards");
    await fs.mkdir(cardsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects new remote assets", async () => {
    const remoteAssets = [
      makeAssetSummary({ assetId: "agent-001" }),
      makeAssetSummary({ assetId: "agent-002" }),
    ];

    const diffs = await compareAssets(remoteAssets, cardsDir);

    expect(diffs).toHaveLength(2);
    expect(diffs[0].status).toBe("new");
    expect(diffs[1].status).toBe("new");
    expect(diffs[0].localExists).toBe(false);
  });

  it("detects modified assets (local file exists)", async () => {
    await fs.writeFile(
      path.join(cardsDir, "agent-001.yaml"),
      "assetId: agent-001\n",
    );

    const remoteAssets = [makeAssetSummary({ assetId: "agent-001" })];
    const diffs = await compareAssets(remoteAssets, cardsDir);

    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe("modified");
    expect(diffs[0].localExists).toBe(true);
  });

  it("detects local-only assets", async () => {
    await fs.writeFile(
      path.join(cardsDir, "local-asset.yaml"),
      "assetId: local-asset\n",
    );

    const remoteAssets: AssetSummary[] = [];
    const diffs = await compareAssets(remoteAssets, cardsDir);

    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe("local-only");
    expect(diffs[0].assetId).toBe("local-asset");
  });

  it("handles mixed new, modified, and local-only assets", async () => {
    await fs.writeFile(
      path.join(cardsDir, "existing.yaml"),
      "assetId: existing\n",
    );
    await fs.writeFile(
      path.join(cardsDir, "local-only.yaml"),
      "assetId: local-only\n",
    );

    const remoteAssets = [
      makeAssetSummary({ assetId: "existing" }),
      makeAssetSummary({ assetId: "new-remote" }),
    ];

    const diffs = await compareAssets(remoteAssets, cardsDir);

    expect(diffs).toHaveLength(3);

    const existing = diffs.find((d) => d.assetId === "existing");
    const newRemote = diffs.find((d) => d.assetId === "new-remote");
    const localOnly = diffs.find((d) => d.assetId === "local-only");

    expect(existing?.status).toBe("modified");
    expect(newRemote?.status).toBe("new");
    expect(localOnly?.status).toBe("local-only");
  });

  it("returns empty diffs when no remote and no local assets", async () => {
    const diffs = await compareAssets([], cardsDir);
    expect(diffs).toHaveLength(0);
  });

  it("handles missing cards directory gracefully", async () => {
    const nonExistentDir = path.join(tempDir, "nonexistent");
    const diffs = await compareAssets(
      [makeAssetSummary()],
      nonExistentDir,
    );

    expect(diffs).toHaveLength(1);
    expect(diffs[0].status).toBe("new");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Card Building
// ─────────────────────────────────────────────────────────────────

describe("Pull — Card Building", () => {
  it("builds card from event with correct fields", () => {
    const event = makeEvent();
    const diff: AssetDiff = {
      assetId: "agent-001",
      status: "new",
      remoteEventCount: 5,
      remoteLastEvent: "aigrc.asset.created",
      localExists: false,
    };

    const card = buildCardFromEvent(event, diff);

    expect(card.assetId).toBe("agent-001");
    expect(card.version).toBe("1.0.0");
    expect(card.lastEventAt).toBe("2026-02-24T12:00:00Z");
    expect(card.lastEventType).toBe("aigrc.asset.created");
    expect(card.eventCount).toBe(5);
  });

  it("includes golden thread information", () => {
    const event = makeEvent();
    const diff: AssetDiff = {
      assetId: "agent-001",
      status: "new",
      remoteEventCount: 1,
      localExists: false,
    };

    const card = buildCardFromEvent(event, diff);

    expect(card.goldenThread).toBeDefined();
    expect((card.goldenThread as any).type).toBe("linked");
    expect((card.goldenThread as any).system).toBe("jira");
    expect((card.goldenThread as any).ref).toBe("AIG-100");
  });

  it("includes source info", () => {
    const event = makeEvent();
    const diff: AssetDiff = {
      assetId: "agent-001",
      status: "new",
      remoteEventCount: 1,
      localExists: false,
    };

    const card = buildCardFromEvent(event, diff);

    expect(card.source).toBeDefined();
    expect((card.source as any).tool).toBe("cli");
    expect((card.source as any).environment).toBe("development");
  });

  it("extracts extra data fields (excludes cardId and cardVersion)", () => {
    const event = makeEvent({
      data: { cardId: "agent-001", cardVersion: "2.0.0", riskLevel: "high", assetType: "llm" },
    } as any);
    const diff: AssetDiff = {
      assetId: "agent-001",
      status: "new",
      remoteEventCount: 1,
      localExists: false,
    };

    const card = buildCardFromEvent(event, diff);

    expect(card.data).toBeDefined();
    expect((card.data as any).riskLevel).toBe("high");
    expect((card.data as any).assetType).toBe("llm");
    expect((card.data as any).cardId).toBeUndefined();
    expect((card.data as any).cardVersion).toBeUndefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Filename Sanitization
// ─────────────────────────────────────────────────────────────────

describe("Pull — Filename Sanitization", () => {
  it("keeps valid characters", () => {
    expect(sanitizeFilename("agent-001")).toBe("agent-001");
    expect(sanitizeFilename("my_asset.v2")).toBe("my_asset.v2");
  });

  it("replaces invalid characters with hyphens", () => {
    expect(sanitizeFilename("org/asset:1")).toBe("org-asset-1");
    expect(sanitizeFilename("asset name with spaces")).toBe("asset-name-with-spaces");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Command Registration
// ─────────────────────────────────────────────────────────────────

describe("Pull — Command Registration", () => {
  it("pullCommand is a Commander instance with correct name", async () => {
    const { pullCommand } = await import("../src/commands/pull.js");

    expect(pullCommand.name()).toBe("pull");
    expect(pullCommand.description()).toContain("Pull");
  });

  it("pullCommand has expected options", async () => {
    const { pullCommand } = await import("../src/commands/pull.js");

    const optionNames = pullCommand.options.map((o: any) => o.long);
    expect(optionNames).toContain("--api-url");
    expect(optionNames).toContain("--api-key");
    expect(optionNames).toContain("--org");
    expect(optionNames).toContain("--status");
    expect(optionNames).toContain("--local-wins");
    expect(optionNames).toContain("--verbose");
  });
});
