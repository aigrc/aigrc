import { describe, it, expect } from "vitest";
import {
  EVENT_TYPE_CATEGORY_MAP,
  DEFAULT_CRITICALITY_MAP,
  isHighFrequencyTool,
  SPEC_VERSION,
  SCHEMA_VERSION,
} from "../src/constants";
import { EventTypeSchema } from "../src/schemas/enums";

describe("SPEC_VERSION and SCHEMA_VERSION", () => {
  it("has correct spec version", () => {
    expect(SPEC_VERSION).toBe("1.0");
  });

  it("has correct schema version format", () => {
    expect(SCHEMA_VERSION).toMatch(/^aigrc-events@\d+\.\d+\.\d+$/);
  });
});

describe("EVENT_TYPE_CATEGORY_MAP", () => {
  it("has an entry for every event type", () => {
    const allTypes = EventTypeSchema.options;
    for (const type of allTypes) {
      expect(EVENT_TYPE_CATEGORY_MAP).toHaveProperty(type);
    }
  });

  it("maps asset types to asset category", () => {
    expect(EVENT_TYPE_CATEGORY_MAP["aigrc.asset.created"]).toBe("asset");
    expect(EVENT_TYPE_CATEGORY_MAP["aigrc.asset.discovered"]).toBe("asset");
  });

  it("maps enforcement types to enforcement category", () => {
    expect(EVENT_TYPE_CATEGORY_MAP["aigrc.enforcement.killswitch"]).toBe("enforcement");
  });

  it("maps lifecycle types to lifecycle category", () => {
    expect(EVENT_TYPE_CATEGORY_MAP["aigrc.lifecycle.orphan.declared"]).toBe("lifecycle");
    expect(EVENT_TYPE_CATEGORY_MAP["aigrc.lifecycle.decay.expired"]).toBe("lifecycle");
  });

  it("maps audit types to audit category", () => {
    expect(EVENT_TYPE_CATEGORY_MAP["aigrc.audit.chain.broken"]).toBe("audit");
  });
});

describe("DEFAULT_CRITICALITY_MAP", () => {
  it("has an entry for every event type", () => {
    const allTypes = EventTypeSchema.options;
    for (const type of allTypes) {
      expect(DEFAULT_CRITICALITY_MAP).toHaveProperty(type);
    }
  });

  it("marks killswitch as critical", () => {
    expect(DEFAULT_CRITICALITY_MAP["aigrc.enforcement.killswitch"]).toBe("critical");
  });

  it("marks chain.broken as critical", () => {
    expect(DEFAULT_CRITICALITY_MAP["aigrc.audit.chain.broken"]).toBe("critical");
  });

  it("marks asset.discovered as high", () => {
    expect(DEFAULT_CRITICALITY_MAP["aigrc.asset.discovered"]).toBe("high");
  });

  it("marks asset.created as normal", () => {
    expect(DEFAULT_CRITICALITY_MAP["aigrc.asset.created"]).toBe("normal");
  });
});

describe("isHighFrequencyTool", () => {
  it("runtime-sdk is high-frequency", () => {
    expect(isHighFrequencyTool("runtime-sdk")).toBe(true);
  });

  it("i2e-firewall is high-frequency", () => {
    expect(isHighFrequencyTool("i2e-firewall")).toBe(true);
  });

  it("cli is not high-frequency", () => {
    expect(isHighFrequencyTool("cli")).toBe(false);
  });

  it("vscode is not high-frequency", () => {
    expect(isHighFrequencyTool("vscode")).toBe(false);
  });
});
