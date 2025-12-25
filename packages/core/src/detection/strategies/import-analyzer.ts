import type { DetectionResult, PatternDefinition } from "../types";

// ─────────────────────────────────────────────────────────────────
// IMPORT ANALYSIS STRATEGY
// ─────────────────────────────────────────────────────────────────

// Python import patterns
const PYTHON_IMPORT_REGEX = /^(?:from\s+(\S+)\s+import|import\s+(\S+))/;

// JavaScript/TypeScript import patterns
const JS_IMPORT_REGEX =
  /(?:import\s+(?:[\w{},*\s]+\s+from\s+)?['"]([^'"]+)['"]|require\s*\(\s*['"]([^'"]+)['"]\s*\))/;

export function analyzeImports(
  filePath: string,
  content: string,
  patterns: PatternDefinition[]
): DetectionResult[] {
  const detections: DetectionResult[] = [];
  const lines = content.split("\n");
  const isPython = filePath.endsWith(".py");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex].trim();

    // Skip empty lines and comments
    if (!line) continue;
    if (isPython && line.startsWith("#")) continue;
    if (!isPython && (line.startsWith("//") || line.startsWith("/*"))) continue;

    // Check if this is an import line
    const importMatch = isPython
      ? extractPythonImport(line)
      : extractJsImport(line);

    if (!importMatch) continue;

    // Match against patterns with import type rules
    for (const pattern of patterns) {
      // Skip patterns for different languages
      if (
        pattern.language !== "any" &&
        ((isPython && pattern.language !== "python") ||
          (!isPython && pattern.language !== "javascript" && pattern.language !== "typescript"))
      ) {
        continue;
      }

      for (const rule of pattern.patterns) {
        if (rule.type !== "import") continue;

        if (matchesImport(line, rule.pattern)) {
          detections.push({
            filePath,
            line: lineIndex + 1,
            match: line,
            registryCard: pattern.id,
            framework: pattern.name,
            category: pattern.category,
            confidence: rule.confidence,
            strategy: "import_analysis",
            implies: pattern.implies,
            metadata: { importedModule: importMatch },
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

function extractPythonImport(line: string): string | null {
  const match = PYTHON_IMPORT_REGEX.exec(line);
  if (match) {
    return match[1] || match[2];
  }
  return null;
}

function extractJsImport(line: string): string | null {
  const match = JS_IMPORT_REGEX.exec(line);
  if (match) {
    return match[1] || match[2];
  }
  return null;
}

function matchesImport(line: string, pattern: string): boolean {
  // Normalize for comparison - handle both single and double quotes
  const normalizedLine = line.toLowerCase().replace(/'/g, '"');
  const normalizedPattern = pattern.toLowerCase().replace(/'/g, '"');
  return normalizedLine.includes(normalizedPattern);
}
