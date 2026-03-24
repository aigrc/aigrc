// ─────────────────────────────────────────────────────────────────
// PangoGuard — File Signature Detection
// Detects AI-indicative files by name, extension, or structure
// ─────────────────────────────────────────────────────────────────

import { registerPattern, createImplication } from "@aigrc/core";
import type { PatternDefinition } from "@aigrc/core";

/**
 * Register file signature detection patterns into @aigrc/core's pattern registry.
 */
export function registerFileSignatures(): void {
  for (const pattern of FILE_SIGNATURE_PATTERNS) {
    registerPattern(pattern);
  }
}

// ─────────────────────────────────────────────────────────────────
// MODEL FILE PATTERNS
// ─────────────────────────────────────────────────────────────────

const ggufModels: PatternDefinition = {
  id: "gguf-model-file",
  name: "GGUF Model File",
  category: "model_file",
  language: "any",
  patterns: [
    { type: "literal", pattern: ".gguf", confidence: "high", description: "GGUF quantized model file" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Local model file for LLM inference"),
  ],
};

const safetensorsModels: PatternDefinition = {
  id: "safetensors-model-file",
  name: "Safetensors Model File",
  category: "model_file",
  language: "any",
  patterns: [
    { type: "literal", pattern: ".safetensors", confidence: "high", description: "Safetensors model weights" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Model weights file for inference"),
  ],
};

const ollamaModelfile: PatternDefinition = {
  id: "ollama-modelfile",
  name: "Ollama Modelfile",
  category: "model_file",
  language: "any",
  patterns: [
    { type: "literal", pattern: "Modelfile", confidence: "high", description: "Ollama Modelfile" },
    { type: "regex", pattern: "FROM\\s+\\w+.*\n.*PARAMETER", confidence: "high", description: "Ollama Modelfile content" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Ollama model configuration"),
  ],
};

// ─────────────────────────────────────────────────────────────────
// AI CONFIGURATION FILE PATTERNS
// ─────────────────────────────────────────────────────────────────

const agentYaml: PatternDefinition = {
  id: "agent-yaml",
  name: "Agent Configuration (YAML)",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "literal", pattern: "agent.yaml", confidence: "high", description: "Agent YAML config" },
    { type: "literal", pattern: "agent.yml", confidence: "high", description: "Agent YML config" },
    { type: "literal", pattern: "agents.yaml", confidence: "high", description: "Multi-agent YAML config" },
    { type: "literal", pattern: "agents.yml", confidence: "high", description: "Multi-agent YML config" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Agent configuration file"),
  ],
};

const systemPrompt: PatternDefinition = {
  id: "system-prompt-file",
  name: "System Prompt File",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "literal", pattern: "system-prompt.txt", confidence: "high", description: "System prompt file" },
    { type: "literal", pattern: "system_prompt.txt", confidence: "high", description: "System prompt file" },
    { type: "literal", pattern: "system-prompt.md", confidence: "high", description: "System prompt markdown" },
    { type: "literal", pattern: "system_prompt.md", confidence: "high", description: "System prompt markdown" },
    { type: "regex", pattern: "prompts?/.*system", confidence: "medium", description: "System prompt in prompts directory" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "AI system prompt — defines agent behavior"),
  ],
};

const kongYaml: PatternDefinition = {
  id: "kong-yaml",
  name: "Kong Configuration",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "literal", pattern: "kong.yaml", confidence: "medium", description: "Kong gateway config" },
    { type: "literal", pattern: "kong.yml", confidence: "medium", description: "Kong gateway config" },
    { type: "regex", pattern: "plugins:\\s*\\n.*ai-", confidence: "high", description: "Kong AI plugin config" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Kong API gateway with AI routing"),
  ],
};

const mcpJsonFile: PatternDefinition = {
  id: "mcp-json-file",
  name: "MCP Configuration (mcp.json)",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "literal", pattern: "mcp.json", confidence: "high", description: "MCP configuration file" },
    { type: "literal", pattern: ".mcp.json", confidence: "high", description: "MCP configuration file (dotfile)" },
  ],
  implies: [
    createImplication("toolExecution", true, "MCP server configuration"),
  ],
};

// ─────────────────────────────────────────────────────────────────
// GOVERNANCE FILE PATTERNS (already governed)
// ─────────────────────────────────────────────────────────────────

const aigrcCard: PatternDefinition = {
  id: "aigrc-card-file",
  name: "AIGRC Asset Card",
  category: "framework",
  language: "any",
  patterns: [
    { type: "regex", pattern: "\\.aigrc/cards/.*\\.ya?ml", confidence: "high", description: "AIGRC asset card file" },
    { type: "regex", pattern: "aigrc-\\d{4}-[a-f0-9]{8}", confidence: "high", description: "AIGRC asset ID" },
  ],
  implies: [],
};

const aigrcConfig: PatternDefinition = {
  id: "aigrc-config-file",
  name: "AIGRC Configuration",
  category: "framework",
  language: "any",
  patterns: [
    { type: "literal", pattern: ".aigrc.yaml", confidence: "high", description: "AIGRC config file" },
    { type: "literal", pattern: ".aigrc.yml", confidence: "high", description: "AIGRC config file" },
  ],
  implies: [],
};

// ─────────────────────────────────────────────────────────────────
// ML PIPELINE FILES
// ─────────────────────────────────────────────────────────────────

const mlflowConfig: PatternDefinition = {
  id: "mlflow-config",
  name: "MLflow Configuration",
  category: "ml_ops",
  language: "any",
  patterns: [
    { type: "literal", pattern: "MLproject", confidence: "high", description: "MLflow project file" },
    { type: "literal", pattern: "mlflow.yaml", confidence: "high", description: "MLflow config" },
    { type: "regex", pattern: "mlflow\\.(?:log_model|register_model|load_model)", confidence: "high", description: "MLflow model operations" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "MLflow ML pipeline"),
  ],
};

const dvcConfig: PatternDefinition = {
  id: "dvc-config",
  name: "DVC Pipeline",
  category: "ml_ops",
  language: "any",
  patterns: [
    { type: "literal", pattern: "dvc.yaml", confidence: "high", description: "DVC pipeline file" },
    { type: "literal", pattern: "dvc.lock", confidence: "high", description: "DVC lock file" },
    { type: "literal", pattern: ".dvc", confidence: "medium", description: "DVC tracked file" },
  ],
  implies: [],
};

// ─────────────────────────────────────────────────────────────────
// ALL FILE SIGNATURE PATTERNS
// ─────────────────────────────────────────────────────────────────

export const FILE_SIGNATURE_PATTERNS: PatternDefinition[] = [
  // Model files
  ggufModels,
  safetensorsModels,
  ollamaModelfile,
  // AI config files
  agentYaml,
  systemPrompt,
  kongYaml,
  mcpJsonFile,
  // Governance files
  aigrcCard,
  aigrcConfig,
  // ML pipeline files
  mlflowConfig,
  dvcConfig,
];
