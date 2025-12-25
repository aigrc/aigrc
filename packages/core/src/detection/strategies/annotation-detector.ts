import type { DetectionResult, PatternDefinition } from "../types";

// ─────────────────────────────────────────────────────────────────
// ANNOTATION/DECORATOR DETECTION STRATEGY
// ─────────────────────────────────────────────────────────────────

// Python decorator pattern: @decorator or @decorator(...)
const PYTHON_DECORATOR_REGEX = /^\s*@(\w+)(?:\(.*\))?\s*$/;

// TypeScript/JavaScript decorator pattern (experimental decorators)
const TS_DECORATOR_REGEX = /^\s*@(\w+)(?:\(.*\))?\s*$/;

export function detectAnnotations(
  filePath: string,
  lines: string[],
  patterns: PatternDefinition[]
): DetectionResult[] {
  const detections: DetectionResult[] = [];
  const isPython = filePath.endsWith(".py");

  for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
    const line = lines[lineIndex];
    const trimmedLine = line.trim();

    // Check for decorator syntax
    if (!trimmedLine.startsWith("@")) continue;

    const decoratorMatch = isPython
      ? PYTHON_DECORATOR_REGEX.exec(trimmedLine)
      : TS_DECORATOR_REGEX.exec(trimmedLine);

    if (!decoratorMatch) continue;

    const decoratorName = decoratorMatch[1];

    // Match against patterns with decorator type rules
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
        if (rule.type !== "decorator") continue;

        const ruleDecorator = rule.pattern.replace(/^@/, "");
        if (decoratorName.toLowerCase() === ruleDecorator.toLowerCase()) {
          // Look ahead to get the decorated function/class name
          const nextLine = lineIndex + 1 < lines.length ? lines[lineIndex + 1] : "";
          const decoratedName = extractDecoratedName(nextLine, isPython);

          detections.push({
            filePath,
            line: lineIndex + 1,
            match: trimmedLine,
            matchContext: decoratedName
              ? `${trimmedLine}\n${nextLine.trim()}`
              : trimmedLine,
            registryCard: pattern.id,
            framework: pattern.name,
            category: pattern.category,
            confidence: rule.confidence,
            strategy: "annotation",
            implies: pattern.implies,
            metadata: {
              decorator: decoratorName,
              decorated: decoratedName,
            },
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

function extractDecoratedName(line: string, isPython: boolean): string | null {
  if (isPython) {
    // Python: def function_name(...) or class ClassName
    const pythonMatch = /(?:def|class|async\s+def)\s+(\w+)/.exec(line);
    if (pythonMatch) return pythonMatch[1];
  } else {
    // TypeScript/JavaScript: function name(...) or class ClassName or method name(...)
    const tsMatch = /(?:function|class|async\s+function)\s+(\w+)/.exec(line);
    if (tsMatch) return tsMatch[1];

    // Also match method definitions
    const methodMatch = /^\s*(?:async\s+)?(\w+)\s*\(/.exec(line);
    if (methodMatch) return methodMatch[1];
  }

  return null;
}
