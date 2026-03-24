// ─────────────────────────────────────────────────────────────────
// @aigrc/github-app — Regulatory Mapper Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { mapToRegulations } from "../../src/classification/regulatory-mapper.js";
import type { DetectionResult } from "@aigrc/core";

describe("mapToRegulations", () => {
  const emptyDetections: DetectionResult[] = [];

  describe("EU AI Act", () => {
    it("should classify L0 as minimal risk", () => {
      const result = mapToRegulations("L0", emptyDetections);
      expect(result.euAiAct.classification).toBe("Minimal Risk");
    });

    it("should classify L1 as limited risk with transparency articles", () => {
      const result = mapToRegulations("L1", emptyDetections);
      expect(result.euAiAct.classification).toBe("Limited Risk");
      expect(result.euAiAct.articles.some((a) => a.includes("Transparency"))).toBe(true);
    });

    it("should classify L2 as high risk with multiple articles", () => {
      const result = mapToRegulations("L2", emptyDetections);
      expect(result.euAiAct.classification).toBe("High Risk");
      expect(result.euAiAct.articles.length).toBeGreaterThan(3);
      expect(result.euAiAct.obligations.some((o) => o.includes("risk management"))).toBe(true);
    });

    it("should classify L3 as unacceptable/prohibited", () => {
      const result = mapToRegulations("L3", emptyDetections);
      expect(result.euAiAct.classification).toBe("Unacceptable Risk");
      expect(result.euAiAct.obligations.some((o) => o.includes("PROHIBITED"))).toBe(true);
    });
  });

  describe("NIST AI RMF", () => {
    it("should map L0 to GOVERN function only", () => {
      const result = mapToRegulations("L0", emptyDetections);
      expect(result.nistRmf.functions).toEqual(["GOVERN"]);
    });

    it("should map L2 to GOVERN, MAP, and MEASURE functions", () => {
      const result = mapToRegulations("L2", emptyDetections);
      expect(result.nistRmf.functions).toContain("GOVERN");
      expect(result.nistRmf.functions).toContain("MAP");
      expect(result.nistRmf.functions).toContain("MEASURE");
    });

    it("should map L3 to all four NIST functions", () => {
      const result = mapToRegulations("L3", emptyDetections);
      expect(result.nistRmf.functions).toEqual(["GOVERN", "MAP", "MEASURE", "MANAGE"]);
    });
  });

  describe("ISO 42001", () => {
    it("should include at least one clause for every tier", () => {
      for (const tier of ["L0", "L1", "L2", "L3"] as const) {
        const result = mapToRegulations(tier, emptyDetections);
        expect(result.iso42001.clauses.length).toBeGreaterThan(0);
      }
    });

    it("should increase controls with tier severity", () => {
      const l0 = mapToRegulations("L0", emptyDetections);
      const l3 = mapToRegulations("L3", emptyDetections);
      expect(l3.iso42001.controls.length).toBeGreaterThan(l0.iso42001.controls.length);
    });
  });

  describe("Sector-specific regulations", () => {
    it("should detect HIPAA/GDPR when PII processing implied", () => {
      const detections: DetectionResult[] = [
        {
          filePath: "test.py",
          line: 1,
          match: "import openai",
          framework: "OpenAI",
          category: "llm_provider",
          confidence: "high",
          strategy: "import",
          implies: [
            { factor: "piiProcessing", value: "yes", reason: "Processes PII", confidence: 0.9 },
          ],
        },
      ];

      const result = mapToRegulations("L2", detections);
      expect(result.sectorSpecific).toBeDefined();
      expect(result.sectorSpecific!.some((s) => s.regulation === "HIPAA")).toBe(true);
      expect(result.sectorSpecific!.some((s) => s.regulation === "GDPR")).toBe(true);
    });

    it("should not add sector regulations when no triggers", () => {
      const result = mapToRegulations("L2", emptyDetections);
      expect(result.sectorSpecific).toEqual([]);
    });
  });
});
