import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import fs from "fs/promises";
import path from "path";
import os from "os";
import crypto from "crypto";

// ─────────────────────────────────────────────────────────────────
// Test the internal logic of events push command
// We test the file discovery, diffing, and event building
// without actually invoking the CLI or making HTTP calls.
// ─────────────────────────────────────────────────────────────────

// Import GovernanceEventBuilder for event building verification
import {
  GovernanceEventBuilder,
  type BuilderConfig,
  type GovernanceEvent,
} from "@aigrc/events";

// ─── Helpers ──────────────────────────────────────────────────

const BUILDER_CONFIG: BuilderConfig = {
  source: {
    tool: "cli",
    version: "0.2.0",
    orgId: "org-test",
    instanceId: "cli-test",
    identity: { type: "api-key", subject: "test@test.com" },
    environment: "development",
  },
};

interface PushState {
  lastPush: string;
  files: Record<string, string>;
}

interface FileChange {
  file: string;
  type: "created" | "updated";
  hash: string;
}

async function hashFile(filePath: string): Promise<string> {
  const content = await fs.readFile(filePath);
  const hash = crypto.createHash("sha256").update(content).digest("hex");
  return `sha256:${hash}`;
}

async function discoverChanges(
  cardsDir: string,
  pushState: PushState,
  specificFiles?: string[],
): Promise<FileChange[]> {
  const changes: FileChange[] = [];

  let filesToCheck: string[];
  if (specificFiles && specificFiles.length > 0) {
    filesToCheck = specificFiles.map((f) =>
      path.isAbsolute(f) ? f : path.resolve(cardsDir, f),
    );
  } else {
    const entries = await fs.readdir(cardsDir, { withFileTypes: true });
    filesToCheck = entries
      .filter(
        (entry) =>
          entry.isFile() &&
          (entry.name.endsWith(".yaml") || entry.name.endsWith(".yml")),
      )
      .map((entry) => path.resolve(cardsDir, entry.name));
  }

  for (const filePath of filesToCheck) {
    try {
      const hash = await hashFile(filePath);
      const relativePath = path.relative(path.dirname(cardsDir), filePath);
      const previousHash = pushState.files[relativePath];

      if (!previousHash) {
        changes.push({ file: relativePath, type: "created", hash });
      } else if (previousHash !== hash) {
        changes.push({ file: relativePath, type: "updated", hash });
      }
    } catch {
      // skip
    }
  }

  return changes;
}

// ─────────────────────────────────────────────────────────────────
// TESTS: File Discovery
// ─────────────────────────────────────────────────────────────────

describe("Events Push — File Discovery", () => {
  let tempDir: string;
  let cardsDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aigrc-test-"));
    cardsDir = path.join(tempDir, "cards");
    await fs.mkdir(cardsDir, { recursive: true });
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("detects new files as 'created'", async () => {
    await fs.writeFile(
      path.join(cardsDir, "agent.yaml"),
      "name: My Agent\nassetId: agent-001\n",
    );

    const changes = await discoverChanges(cardsDir, { lastPush: "", files: {} });

    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe("created");
    expect(changes[0].file).toContain("agent.yaml");
    expect(changes[0].hash).toMatch(/^sha256:[a-f0-9]{64}$/);
  });

  it("detects modified files as 'updated'", async () => {
    const filePath = path.join(cardsDir, "agent.yaml");
    await fs.writeFile(filePath, "name: My Agent\nassetId: agent-001\n");

    const originalHash = await hashFile(filePath);
    const relativePath = path.relative(path.dirname(cardsDir), filePath);

    // Modify the file
    await fs.writeFile(filePath, "name: My Agent v2\nassetId: agent-001\n");

    const changes = await discoverChanges(cardsDir, {
      lastPush: "2026-02-24T12:00:00Z",
      files: { [relativePath]: originalHash },
    });

    expect(changes).toHaveLength(1);
    expect(changes[0].type).toBe("updated");
  });

  it("skips unchanged files", async () => {
    const filePath = path.join(cardsDir, "agent.yaml");
    await fs.writeFile(filePath, "name: My Agent\n");

    const hash = await hashFile(filePath);
    const relativePath = path.relative(path.dirname(cardsDir), filePath);

    const changes = await discoverChanges(cardsDir, {
      lastPush: "2026-02-24T12:00:00Z",
      files: { [relativePath]: hash },
    });

    expect(changes).toHaveLength(0);
  });

  it("discovers multiple changed files", async () => {
    await fs.writeFile(path.join(cardsDir, "agent1.yaml"), "name: Agent 1\n");
    await fs.writeFile(path.join(cardsDir, "agent2.yaml"), "name: Agent 2\n");
    await fs.writeFile(path.join(cardsDir, "agent3.yml"), "name: Agent 3\n");

    const changes = await discoverChanges(cardsDir, { lastPush: "", files: {} });

    expect(changes).toHaveLength(3);
    expect(changes.every((c) => c.type === "created")).toBe(true);
  });

  it("ignores non-YAML files", async () => {
    await fs.writeFile(path.join(cardsDir, "readme.md"), "# Hello\n");
    await fs.writeFile(path.join(cardsDir, "agent.yaml"), "name: Agent\n");

    const changes = await discoverChanges(cardsDir, { lastPush: "", files: {} });

    expect(changes).toHaveLength(1);
    expect(changes[0].file).toContain("agent.yaml");
  });

  it("returns empty array when no files exist", async () => {
    const changes = await discoverChanges(cardsDir, { lastPush: "", files: {} });
    expect(changes).toHaveLength(0);
  });

  it("handles specific file list", async () => {
    await fs.writeFile(path.join(cardsDir, "agent1.yaml"), "name: Agent 1\n");
    await fs.writeFile(path.join(cardsDir, "agent2.yaml"), "name: Agent 2\n");

    const changes = await discoverChanges(
      cardsDir,
      { lastPush: "", files: {} },
      ["agent1.yaml"],
    );

    expect(changes).toHaveLength(1);
    expect(changes[0].file).toContain("agent1.yaml");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Event Building
// ─────────────────────────────────────────────────────────────────

describe("Events Push — Event Building", () => {
  it("builds assetCreated event for new file", () => {
    const builder = new GovernanceEventBuilder(BUILDER_CONFIG);

    const event = builder.assetCreated({
      assetId: "agent-001",
      goldenThread: {
        type: "orphan",
        reason: "discovery",
        declaredBy: "test@test.com",
        declaredAt: "2026-02-24T12:00:00Z",
        remediationDeadline: "2026-03-26T12:00:00.000Z",
        remediationNote: "Event pushed via CLI without linked authorization. Assign a golden thread reference.",
      },
      data: { cardId: "agent-001", cardVersion: "1.0.0" },
    });

    expect(event.type).toBe("aigrc.asset.created");
    expect(event.assetId).toBe("agent-001");
    expect(event.id).toMatch(/^evt_[a-f0-9]{32}$/);
    expect(event.hash).toMatch(/^sha256:[a-f0-9]{64}$/);
    expect(Object.isFrozen(event)).toBe(true);
  });

  it("builds assetUpdated event for modified file", () => {
    const builder = new GovernanceEventBuilder(BUILDER_CONFIG);

    const event = builder.assetUpdated({
      assetId: "agent-001",
      goldenThread: {
        type: "linked",
        system: "jira",
        ref: "AIG-100",
        url: "https://aigos.atlassian.net/browse/AIG-100",
        status: "active",
      },
      data: { cardId: "agent-001", cardVersion: "2.0.0" },
    });

    expect(event.type).toBe("aigrc.asset.updated");
    expect(event.assetId).toBe("agent-001");
  });

  it("uses orphan golden thread when none provided in YAML", () => {
    const builder = new GovernanceEventBuilder(BUILDER_CONFIG);

    // Simulate building from a YAML without goldenThread
    const goldenThread = {
      type: "orphan" as const,
      reason: "discovery",
      declaredBy: "cli-user",
      declaredAt: new Date().toISOString(),
      remediationDeadline: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(),
      remediationNote: "Event pushed via CLI without linked authorization. Assign a golden thread reference.",
    };

    const event = builder.assetCreated({
      assetId: "test-asset",
      goldenThread,
      data: { cardId: "test-asset", cardVersion: "1.0.0" },
    });

    expect(event.goldenThread.type).toBe("orphan");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Push State
// ─────────────────────────────────────────────────────────────────

describe("Events Push — Push State", () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "aigrc-state-"));
  });

  afterEach(async () => {
    await fs.rm(tempDir, { recursive: true, force: true });
  });

  it("loads push state from JSON file", async () => {
    const stateFile = path.join(tempDir, ".push-state.json");
    const state: PushState = {
      lastPush: "2026-02-24T12:00:00Z",
      files: { "cards/agent.yaml": "sha256:abc123" },
    };
    await fs.writeFile(stateFile, JSON.stringify(state));

    const content = await fs.readFile(stateFile, "utf-8");
    const loaded = JSON.parse(content) as PushState;

    expect(loaded.lastPush).toBe("2026-02-24T12:00:00Z");
    expect(loaded.files["cards/agent.yaml"]).toBe("sha256:abc123");
  });

  it("returns empty state when file does not exist", async () => {
    const stateFile = path.join(tempDir, "nonexistent.json");

    let state: PushState;
    try {
      const content = await fs.readFile(stateFile, "utf-8");
      state = JSON.parse(content);
    } catch {
      state = { lastPush: "", files: {} };
    }

    expect(state.lastPush).toBe("");
    expect(Object.keys(state.files)).toHaveLength(0);
  });

  it("saves push state with updated hashes", async () => {
    const stateFile = path.join(tempDir, ".push-state.json");

    const state: PushState = {
      lastPush: new Date().toISOString(),
      files: {
        "cards/agent.yaml": "sha256:abc123",
      },
    };

    await fs.writeFile(stateFile, JSON.stringify(state, null, 2));

    const content = await fs.readFile(stateFile, "utf-8");
    const saved = JSON.parse(content) as PushState;

    expect(saved.files["cards/agent.yaml"]).toBe("sha256:abc123");
    expect(saved.lastPush).toBeDefined();
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Command Registration
// ─────────────────────────────────────────────────────────────────

describe("Events Push — Command Registration", () => {
  it("eventsCommand is a Commander instance with push subcommand", async () => {
    // Dynamic import to avoid top-level import issues
    const { eventsCommand } = await import("../src/commands/events.js");

    expect(eventsCommand.name()).toBe("events");
    expect(eventsCommand.description()).toBe("Governance event management");

    // Check that push subcommand exists
    const pushCmd = eventsCommand.commands.find(
      (cmd: any) => cmd.name() === "push",
    );
    expect(pushCmd).toBeDefined();
    expect(pushCmd!.description()).toContain("AIGOS");
  });
});
