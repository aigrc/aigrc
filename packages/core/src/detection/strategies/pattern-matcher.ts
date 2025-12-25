import type { DetectionResult, PatternDefinition, PatternRule } from "../types";

// ─────────────────────────────────────────────────────────────────
// PATTERN MATCHING STRATEGY
// ─────────────────────────────────────────────────────────────────

export function matchPatterns(
  filePath: string,
  lines: string[],
  patterns: PatternDefinition[]
): DetectionResult[] {
  const detections: DetectionResult[] = [];

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];

    for (const pattern of patterns) {
      for (const rule of pattern.patterns) {
        if (rule.type !== "regex" && rule.type !== "literal") continue;

        const match = matchRule(line, rule);
        if (match) {
          detections.push({
            filePath,
            line: lineIndex + 1,
            column: match.index,
            match: match.text,
            matchContext: getContext(lines, lineIndex),
            registryCard: pattern.id,
            framework: pattern.name,
            category: pattern.category,
            confidence: rule.confidence,
            strategy: "pattern_match",
            implies: pattern.implies,
          });
        }
      }
    }
  }

  return detections;
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

function matchRule(
  line: string,
  rule: PatternRule
): { text: string; index: number } | null {
  if (rule.type === "literal") {
    const index = line.indexOf(rule.pattern);
    if (index !== -1) {
      return { text: rule.pattern, index };
    }
  } else if (rule.type === "regex") {
    try {
      const regex = new RegExp(rule.pattern, "i");
      const match = regex.exec(line);
      if (match) {
        return { text: match[0], index: match.index };
      }
    } catch {
      // Invalid regex, skip
    }
  }
  return null;
}

function getContext(lines: string[], index: number, contextLines = 2): string {
  const start = Math.max(0, index - contextLines);
  const end = Math.min(lines.length, index + contextLines + 1);
  return lines.slice(start, end).join("\n");
}
