import type { RiskFactors } from "../schemas";
import type { DetectionResult, RiskImplication, ConfidenceLevel } from "./types";

// ─────────────────────────────────────────────────────────────────
// RISK FACTOR INFERENCE
// ─────────────────────────────────────────────────────────────────

export function inferRiskFactors(detections: DetectionResult[]): Partial<RiskFactors> {
  const implications = collectImplications(detections);

  return {
    autonomousDecisions: inferBoolean(implications, "autonomousDecisions"),
    customerFacing: inferBoolean(implications, "customerFacing"),
    toolExecution: inferBoolean(implications, "toolExecution"),
    externalDataAccess: inferBoolean(implications, "externalDataAccess"),
    piiProcessing: inferPiiProcessing(implications),
    highStakesDecisions: inferBoolean(implications, "highStakesDecisions"),
  };
}

// ─────────────────────────────────────────────────────────────────
// HELPER FUNCTIONS
// ─────────────────────────────────────────────────────────────────

interface WeightedImplication extends RiskImplication {
  weight: number;
}

function collectImplications(detections: DetectionResult[]): WeightedImplication[] {
  const implications: WeightedImplication[] = [];

  for (const detection of detections) {
    const weight = confidenceWeight(detection.confidence);

    for (const implication of detection.implies) {
      // Only include implications from medium+ confidence detections
      if (weight >= 2) {
        implications.push({
          ...implication,
          weight,
        });
      }
    }
  }

  return implications;
}

function confidenceWeight(confidence: ConfidenceLevel): number {
  const weights: Record<ConfidenceLevel, number> = {
    high: 3,
    medium: 2,
    low: 1,
  };
  return weights[confidence];
}

function inferBoolean(
  implications: WeightedImplication[],
  factor: keyof RiskFactors
): boolean {
  const relevant = implications.filter((i) => i.factor === factor);

  if (relevant.length === 0) return false;

  // If any high-weight implication sets it to true, return true
  // Otherwise, require multiple medium-weight implications
  const highWeight = relevant.filter((i) => i.weight >= 3 && i.value === true);
  if (highWeight.length > 0) return true;

  const mediumWeight = relevant.filter((i) => i.weight >= 2 && i.value === true);
  if (mediumWeight.length >= 2) return true;

  // Single medium-weight is still enough
  if (mediumWeight.length >= 1) return true;

  return false;
}

function inferPiiProcessing(
  implications: WeightedImplication[]
): "yes" | "no" | "unknown" {
  const relevant = implications.filter((i) => i.factor === "piiProcessing");

  if (relevant.length === 0) return "unknown";

  // If any high-confidence says "yes", return "yes"
  const highYes = relevant.filter((i) => i.weight >= 3 && i.value === "yes");
  if (highYes.length > 0) return "yes";

  // If multiple medium-confidence say "yes", return "yes"
  const mediumYes = relevant.filter((i) => i.weight >= 2 && i.value === "yes");
  if (mediumYes.length >= 2) return "yes";

  // If any says "yes", return "yes" (conservative)
  if (relevant.some((i) => i.value === "yes")) return "yes";

  // If all say "no", return "no"
  if (relevant.every((i) => i.value === "no")) return "no";

  return "unknown";
}

// ─────────────────────────────────────────────────────────────────
// IMPLICATION CHAIN APPLICATION
// ─────────────────────────────────────────────────────────────────

const IMPLICATION_CHAINS: Record<string, RiskImplication[]> = {
  // LangChain implies tool execution and external data access
  "langchain-python": [
    { factor: "toolExecution", value: true, reason: "LangChain enables tool calling" },
    { factor: "externalDataAccess", value: true, reason: "LangChain chains access external data" },
  ],
  "langchain-js": [
    { factor: "toolExecution", value: true, reason: "LangChain.js enables tool calling" },
    { factor: "externalDataAccess", value: true, reason: "LangChain.js chains access external data" },
  ],
  // CrewAI implies autonomous decisions and tool execution
  crewai: [
    { factor: "autonomousDecisions", value: true, reason: "CrewAI enables autonomous agents" },
    { factor: "toolExecution", value: true, reason: "CrewAI agents execute tools" },
  ],
  // AutoGen implies autonomous decisions and tool execution
  autogen: [
    { factor: "autonomousDecisions", value: true, reason: "AutoGen enables autonomous agents" },
    { factor: "toolExecution", value: true, reason: "AutoGen agents can execute code" },
  ],
  // LangGraph implies autonomous decisions
  langgraph: [
    { factor: "autonomousDecisions", value: true, reason: "LangGraph enables stateful agents" },
  ],
  "langgraph-js": [
    { factor: "autonomousDecisions", value: true, reason: "LangGraph.js enables stateful agents" },
  ],
  // Vercel AI SDK implies customer-facing
  "vercel-ai-sdk": [
    { factor: "customerFacing", value: true, reason: "Vercel AI SDK used in user-facing apps" },
  ],
};

export function applyImplicationChains(
  detections: DetectionResult[]
): DetectionResult[] {
  return detections.map((detection) => {
    const chainedImplications = IMPLICATION_CHAINS[detection.registryCard];
    if (chainedImplications) {
      return {
        ...detection,
        implies: [...detection.implies, ...chainedImplications],
      };
    }
    return detection;
  });
}
