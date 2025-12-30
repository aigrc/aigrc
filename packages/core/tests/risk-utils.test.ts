import { describe, it, expect } from "vitest";
import {
  compareRiskLevels,
  isRiskLevelAtLeast,
  isRiskLevelAtMost,
  getRiskLevelOrdinal,
  getMaxRiskLevel,
  getMinRiskLevel,
  mapToEuAiActCategory,
  getRiskLevelsAtLeast,
  getRiskLevelsAtMost,
  parseRiskLevel,
  isValidRiskLevel,
} from "../src/risk-utils";

describe("Risk Level Utilities", () => {
  describe("compareRiskLevels", () => {
    it("should return 0 for equal levels", () => {
      expect(compareRiskLevels("minimal", "minimal")).toBe(0);
      expect(compareRiskLevels("high", "high")).toBe(0);
    });

    it("should return -1 when first is lower", () => {
      expect(compareRiskLevels("minimal", "limited")).toBe(-1);
      expect(compareRiskLevels("limited", "high")).toBe(-1);
      expect(compareRiskLevels("high", "unacceptable")).toBe(-1);
    });

    it("should return 1 when first is higher", () => {
      expect(compareRiskLevels("unacceptable", "high")).toBe(1);
      expect(compareRiskLevels("high", "limited")).toBe(1);
      expect(compareRiskLevels("limited", "minimal")).toBe(1);
    });
  });

  describe("isRiskLevelAtLeast", () => {
    it("should return true when level >= threshold", () => {
      expect(isRiskLevelAtLeast("high", "high")).toBe(true);
      expect(isRiskLevelAtLeast("high", "limited")).toBe(true);
      expect(isRiskLevelAtLeast("unacceptable", "minimal")).toBe(true);
    });

    it("should return false when level < threshold", () => {
      expect(isRiskLevelAtLeast("minimal", "limited")).toBe(false);
      expect(isRiskLevelAtLeast("limited", "high")).toBe(false);
    });
  });

  describe("isRiskLevelAtMost", () => {
    it("should return true when level <= threshold", () => {
      expect(isRiskLevelAtMost("minimal", "minimal")).toBe(true);
      expect(isRiskLevelAtMost("minimal", "limited")).toBe(true);
      expect(isRiskLevelAtMost("limited", "high")).toBe(true);
    });

    it("should return false when level > threshold", () => {
      expect(isRiskLevelAtMost("high", "limited")).toBe(false);
      expect(isRiskLevelAtMost("unacceptable", "high")).toBe(false);
    });
  });

  describe("getRiskLevelOrdinal", () => {
    it("should return correct ordinals", () => {
      expect(getRiskLevelOrdinal("minimal")).toBe(0);
      expect(getRiskLevelOrdinal("limited")).toBe(1);
      expect(getRiskLevelOrdinal("high")).toBe(2);
      expect(getRiskLevelOrdinal("unacceptable")).toBe(3);
    });
  });

  describe("getMaxRiskLevel", () => {
    it("should return the maximum risk level", () => {
      expect(getMaxRiskLevel(["minimal", "limited", "high"])).toBe("high");
      expect(getMaxRiskLevel(["minimal", "unacceptable"])).toBe("unacceptable");
    });

    it("should return minimal for empty array", () => {
      expect(getMaxRiskLevel([])).toBe("minimal");
    });

    it("should handle single element", () => {
      expect(getMaxRiskLevel(["limited"])).toBe("limited");
    });
  });

  describe("getMinRiskLevel", () => {
    it("should return the minimum risk level", () => {
      expect(getMinRiskLevel(["limited", "high", "unacceptable"])).toBe("limited");
      expect(getMinRiskLevel(["minimal", "high"])).toBe("minimal");
    });

    it("should return minimal for empty array", () => {
      expect(getMinRiskLevel([])).toBe("minimal");
    });
  });

  describe("mapToEuAiActCategory", () => {
    it("should map correctly to EU AI Act categories", () => {
      expect(mapToEuAiActCategory("minimal")).toBe("minimal_risk");
      expect(mapToEuAiActCategory("limited")).toBe("limited_risk");
      expect(mapToEuAiActCategory("high")).toBe("high_risk");
      expect(mapToEuAiActCategory("unacceptable")).toBe("prohibited");
    });
  });

  describe("getRiskLevelsAtLeast", () => {
    it("should return levels at or above threshold", () => {
      expect(getRiskLevelsAtLeast("high")).toEqual(["high", "unacceptable"]);
      expect(getRiskLevelsAtLeast("minimal")).toEqual(["minimal", "limited", "high", "unacceptable"]);
    });

    it("should return only unacceptable for unacceptable threshold", () => {
      expect(getRiskLevelsAtLeast("unacceptable")).toEqual(["unacceptable"]);
    });
  });

  describe("getRiskLevelsAtMost", () => {
    it("should return levels at or below threshold", () => {
      expect(getRiskLevelsAtMost("limited")).toEqual(["minimal", "limited"]);
      expect(getRiskLevelsAtMost("high")).toEqual(["minimal", "limited", "high"]);
    });

    it("should return only minimal for minimal threshold", () => {
      expect(getRiskLevelsAtMost("minimal")).toEqual(["minimal"]);
    });
  });

  describe("parseRiskLevel", () => {
    it("should parse valid risk levels", () => {
      expect(parseRiskLevel("minimal")).toBe("minimal");
      expect(parseRiskLevel("limited")).toBe("limited");
      expect(parseRiskLevel("high")).toBe("high");
      expect(parseRiskLevel("unacceptable")).toBe("unacceptable");
    });

    it("should handle case insensitivity", () => {
      expect(parseRiskLevel("MINIMAL")).toBe("minimal");
      expect(parseRiskLevel("High")).toBe("high");
    });

    it("should return undefined for invalid values", () => {
      expect(parseRiskLevel("invalid")).toBeUndefined();
      expect(parseRiskLevel("")).toBeUndefined();
    });
  });

  describe("isValidRiskLevel", () => {
    it("should return true for valid risk levels", () => {
      expect(isValidRiskLevel("minimal")).toBe(true);
      expect(isValidRiskLevel("limited")).toBe(true);
      expect(isValidRiskLevel("high")).toBe(true);
      expect(isValidRiskLevel("unacceptable")).toBe(true);
    });

    it("should return false for invalid values", () => {
      expect(isValidRiskLevel("invalid")).toBe(false);
      expect(isValidRiskLevel(null)).toBe(false);
      expect(isValidRiskLevel(undefined)).toBe(false);
      expect(isValidRiskLevel(123)).toBe(false);
    });
  });
});
