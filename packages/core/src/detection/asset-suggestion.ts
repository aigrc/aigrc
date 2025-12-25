import type { Technical } from "../schemas";
import type {
  AssetCardSuggestion,
  DetectionResult,
  ScanResult,
  ConfidenceLevel,
} from "./types";

// ─────────────────────────────────────────────────────────────────
// ASSET CARD SUGGESTION
// ─────────────────────────────────────────────────────────────────

export function suggestAssetCard(scanResult: ScanResult): AssetCardSuggestion {
  const { detections, summary, inferredRiskFactors, suggestedTechnical } = scanResult;

  // Generate name from primary framework
  const name = generateName(summary.primaryFramework, suggestedTechnical?.type);

  // Generate description
  const description = generateDescription(detections, summary);

  // Collect components from detections
  const components = collectComponents(detections);

  // Collect unique source files
  const sourceFiles = [...new Set(detections.map((d) => d.filePath))];

  // Calculate overall confidence
  const confidence = calculateOverallConfidence(detections);

  // Get unique registry cards used
  const basedOn = [...new Set(detections.map((d) => d.registryCard))];

  return {
    name,
    description,
    technical: {
      type: suggestedTechnical?.type ?? "framework",
      framework: suggestedTechnical?.framework ?? summary.primaryFramework ?? "unknown",
      components,
      sourceFiles,
    },
    riskFactors: inferredRiskFactors,
    confidence,
    basedOn,
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

function generateName(
  primaryFramework: string | undefined,
  type: Technical["type"] | undefined
): string {
  if (!primaryFramework) {
    return "AI Asset";
  }

  const typeLabel: Record<Technical["type"], string> = {
    model: "Model",
    agent: "Agent",
    api_client: "Integration",
    framework: "Application",
    pipeline: "Pipeline",
  };

  return `${primaryFramework} ${typeLabel[type ?? "framework"]}`;
}

function generateDescription(
  detections: DetectionResult[],
  summary: ScanResult["summary"]
): string {
  const frameworks = Object.keys(summary.byFramework);
  const parts: string[] = [];

  // Main description
  if (frameworks.length === 1) {
    parts.push(`AI asset using ${frameworks[0]}.`);
  } else if (frameworks.length > 1) {
    parts.push(`AI asset using ${frameworks.slice(0, 3).join(", ")}${frameworks.length > 3 ? ` and ${frameworks.length - 3} more` : ""}.`);
  } else {
    parts.push("AI asset detected in codebase.");
  }

  // Add capability descriptions
  const categories = summary.byCategory;

  if (categories.agent_framework > 0) {
    parts.push("Includes autonomous agent capabilities.");
  }

  if (categories.llm_provider > 0) {
    parts.push("Integrates with LLM providers.");
  }

  if (categories.ml_framework > 0) {
    parts.push("Uses machine learning frameworks.");
  }

  if (categories.model_file > 0) {
    parts.push("Contains model files.");
  }

  return parts.join(" ");
}

function collectComponents(
  detections: DetectionResult[]
): AssetCardSuggestion["technical"]["components"] {
  const components: AssetCardSuggestion["technical"]["components"] = [];
  const seen = new Set<string>();

  for (const detection of detections) {
    const key = `${detection.category}-${detection.framework}`;
    if (seen.has(key)) continue;
    seen.add(key);

    const component: { type: string; provider?: string; model?: string } = {
      type: mapCategoryToComponentType(detection.category),
    };

    // Add provider for LLM provider detections
    if (detection.category === "llm_provider") {
      component.provider = detection.framework;
    }

    components.push(component);
  }

  return components;
}

function mapCategoryToComponentType(category: string): string {
  const mapping: Record<string, string> = {
    llm_provider: "llm",
    framework: "framework",
    agent_framework: "agent",
    ml_framework: "model",
    ml_ops: "mlops",
    model_file: "model",
  };
  return mapping[category] ?? category;
}

function calculateOverallConfidence(
  detections: DetectionResult[]
): ConfidenceLevel {
  if (detections.length === 0) return "low";

  const highCount = detections.filter((d) => d.confidence === "high").length;
  const mediumCount = detections.filter((d) => d.confidence === "medium").length;

  // High confidence if we have multiple high-confidence detections
  if (highCount >= 3) return "high";

  // High confidence if we have at least one high and several medium
  if (highCount >= 1 && mediumCount >= 2) return "high";

  // Medium confidence if we have any high or multiple medium
  if (highCount >= 1 || mediumCount >= 3) return "medium";

  // Medium confidence for moderate detection count
  if (mediumCount >= 1) return "medium";

  return "low";
}
