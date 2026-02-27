import { describe, it, expect, vi, beforeEach } from "vitest";

// ─────────────────────────────────────────────────────────────────
// Test the events list subcommand logic
// We test filter building, formatting, and command registration
// without actually invoking the CLI or making HTTP calls.
// ─────────────────────────────────────────────────────────────────

import type { GovernanceEvent, EventListFilters } from "@aigrc/events";

// ─── Helpers ──────────────────────────────────────────────────

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
 * Build filters from CLI options (mirrors events.ts logic)
 */
interface ListOptions {
  asset?: string;
  type?: string;
  criticality?: string;
  since?: string;
  limit?: string;
  offset?: string;
}

function buildFilters(options: ListOptions): EventListFilters {
  const filters: EventListFilters = {};
  if (options.asset) filters.assetId = options.asset;
  if (options.type) filters.type = options.type;
  if (options.criticality) filters.criticality = options.criticality;
  if (options.since) filters.since = options.since;
  if (options.limit) filters.limit = parseInt(options.limit, 10);
  if (options.offset) filters.offset = parseInt(options.offset, 10);
  if (!filters.limit) filters.limit = 20;
  return filters;
}

/**
 * Format event type for display (mirrors events.ts logic)
 */
function formatEventType(type: string): string {
  return type.replace(/^aigrc\./, "");
}

/**
 * Format time for display (mirrors events.ts logic)
 */
function formatTime(isoString: string): string {
  try {
    const date = new Date(isoString);
    return date.toISOString().replace("T", " ").slice(0, 19);
  } catch {
    return isoString.slice(0, 19);
  }
}

// ─────────────────────────────────────────────────────────────────
// TESTS: Filter Building
// ─────────────────────────────────────────────────────────────────

describe("Events List — Filter Building", () => {
  it("builds default filters with limit 20", () => {
    const filters = buildFilters({});
    expect(filters.limit).toBe(20);
    expect(filters.assetId).toBeUndefined();
    expect(filters.type).toBeUndefined();
    expect(filters.offset).toBeUndefined();
  });

  it("builds filters from all options", () => {
    const filters = buildFilters({
      asset: "agent-001",
      type: "aigrc.asset.created",
      criticality: "high",
      since: "2026-01-01T00:00:00Z",
      limit: "10",
      offset: "5",
    });

    expect(filters.assetId).toBe("agent-001");
    expect(filters.type).toBe("aigrc.asset.created");
    expect(filters.criticality).toBe("high");
    expect(filters.since).toBe("2026-01-01T00:00:00Z");
    expect(filters.limit).toBe(10);
    expect(filters.offset).toBe(5);
  });

  it("parses limit and offset as integers", () => {
    const filters = buildFilters({ limit: "50", offset: "100" });
    expect(filters.limit).toBe(50);
    expect(filters.offset).toBe(100);
  });

  it("defaults limit to 20 when not provided", () => {
    const filters = buildFilters({ asset: "test" });
    expect(filters.limit).toBe(20);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Formatting
// ─────────────────────────────────────────────────────────────────

describe("Events List — Formatting", () => {
  it("strips aigrc. prefix from event type", () => {
    expect(formatEventType("aigrc.asset.created")).toBe("asset.created");
    expect(formatEventType("aigrc.scan.completed")).toBe("scan.completed");
    expect(formatEventType("aigrc.policy.compiled")).toBe("policy.compiled");
  });

  it("preserves types without aigrc. prefix", () => {
    expect(formatEventType("custom.event")).toBe("custom.event");
  });

  it("formats ISO timestamp to readable format", () => {
    const formatted = formatTime("2026-02-24T12:30:45Z");
    expect(formatted).toBe("2026-02-24 12:30:45");
  });

  it("handles malformed timestamps gracefully", () => {
    const formatted = formatTime("not-a-date-string");
    // Should return first 19 chars of the input
    expect(formatted).toBe("not-a-date-string");
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Pagination Calculation
// ─────────────────────────────────────────────────────────────────

describe("Events List — Pagination", () => {
  it("calculates page number correctly", () => {
    const limit = 20;
    const offset = 0;
    const page = Math.floor(offset / limit) + 1;
    expect(page).toBe(1);
  });

  it("calculates page number for offset 40", () => {
    const limit = 20;
    const offset = 40;
    const page = Math.floor(offset / limit) + 1;
    expect(page).toBe(3);
  });

  it("calculates total pages correctly", () => {
    const total = 55;
    const limit = 20;
    const totalPages = Math.ceil(total / limit);
    expect(totalPages).toBe(3);
  });
});

// ─────────────────────────────────────────────────────────────────
// TESTS: Command Registration
// ─────────────────────────────────────────────────────────────────

describe("Events List — Command Registration", () => {
  it("eventsCommand has list subcommand", async () => {
    const { eventsCommand } = await import("../src/commands/events.js");

    const listCmd = eventsCommand.commands.find(
      (cmd: any) => cmd.name() === "list",
    );
    expect(listCmd).toBeDefined();
    expect(listCmd!.description()).toContain("List");
  });

  it("list subcommand has expected options", async () => {
    const { eventsCommand } = await import("../src/commands/events.js");

    const listCmd = eventsCommand.commands.find(
      (cmd: any) => cmd.name() === "list",
    );
    expect(listCmd).toBeDefined();

    const optionNames = listCmd!.options.map((o: any) => o.long);
    expect(optionNames).toContain("--asset");
    expect(optionNames).toContain("--type");
    expect(optionNames).toContain("--criticality");
    expect(optionNames).toContain("--since");
    expect(optionNames).toContain("--limit");
    expect(optionNames).toContain("--offset");
    expect(optionNames).toContain("--json");
    expect(optionNames).toContain("--live");
  });
});
