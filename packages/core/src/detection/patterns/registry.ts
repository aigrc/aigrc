import type { PatternDefinition, RiskImplication, FrameworkCategory, PatternLanguage } from "../types";

// ─────────────────────────────────────────────────────────────────
// PATTERN REGISTRY
// ─────────────────────────────────────────────────────────────────

const registry: Map<string, PatternDefinition> = new Map();

export function registerPattern(pattern: PatternDefinition): void {
  if (registry.has(pattern.id)) {
    throw new Error(`Pattern with ID "${pattern.id}" already registered`);
  }
  registry.set(pattern.id, pattern);
}

export function getPattern(id: string): PatternDefinition | undefined {
  return registry.get(id);
}

export function getAllPatterns(): PatternDefinition[] {
  return Array.from(registry.values());
}

export function getPatternsByCategory(category: FrameworkCategory): PatternDefinition[] {
  return getAllPatterns().filter((p) => p.category === category);
}

export function getPatternsByLanguage(language: PatternLanguage): PatternDefinition[] {
  return getAllPatterns().filter((p) => p.language === language || p.language === "any");
}

export function clearRegistry(): void {
  registry.clear();
}

export function isRegistryInitialized(): boolean {
  return registry.size > 0;
}

// ─────────────────────────────────────────────────────────────────
// IMPLICATION HELPERS
// ─────────────────────────────────────────────────────────────────

export function createImplication(
  factor: RiskImplication["factor"],
  value: RiskImplication["value"],
  reason: string
): RiskImplication {
  return { factor, value, reason };
}
