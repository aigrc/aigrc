// ─────────────────────────────────────────────────────────────────
// PangoGuard — Agentic Behavioral Pattern Detection
// Detects behavioral patterns that elevate risk tier (+1/+2)
// ─────────────────────────────────────────────────────────────────

import type { DetectionResult } from "@aigrc/core";
import type { AgenticElevation } from "../types.js";
import { createLogger } from "../utils/logger.js";

const log = createLogger("agentic-patterns");

/**
 * Detect agentic behavioral patterns in code that warrant risk elevation.
 *
 * These patterns go beyond framework detection — they identify risky
 * behavioral patterns like tool execution loops, multi-agent orchestration,
 * HITL bypass, and agent-spawning-agents.
 *
 * @param detections - Detection results from @aigrc/core scan
 * @param fileContents - Map of file paths to file contents for deeper analysis
 * @returns Array of agentic elevation signals with risk elevation values
 */
export function detectAgenticPatterns(
  detections: DetectionResult[],
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  // Run each pattern detector
  elevations.push(...detectToolExecutionLoops(fileContents));
  elevations.push(...detectMultiAgentOrchestration(fileContents));
  elevations.push(...detectExternalApiFromAgent(detections, fileContents));
  elevations.push(...detectFileSystemWrite(fileContents));
  elevations.push(...detectDbMutation(fileContents));
  elevations.push(...detectHitlBypass(fileContents));
  elevations.push(...detectAgentSpawning(fileContents));
  elevations.push(...detectPiiWithoutAnonymization(fileContents));

  if (elevations.length > 0) {
    log.info(`Detected ${elevations.length} agentic patterns`, {
      patterns: elevations.map((e) => e.pattern),
      criticalCount: elevations.filter((e) => e.critical).length,
    });
  }

  return elevations;
}

// ─────────────────────────────────────────────────────────────────
// PATTERN DETECTORS
// ─────────────────────────────────────────────────────────────────

/**
 * Pattern 1: Tool execution in a loop (while/for loop containing tool calls)
 * Risk elevation: +1
 */
function detectToolExecutionLoops(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const loopPatterns = [
    // Python: while loop with tool execution
    /(?:while|for)\s+.+:\s*\n(?:.*\n)*?.*(?:tool_call|execute_tool|run_tool|call_tool|invoke_tool)/gm,
    // JS/TS: while/for loop with tool execution
    /(?:while|for)\s*\(.+\)\s*\{[\s\S]*?(?:executeTool|runTool|callTool|invokeTool|tool\.execute)/gm,
    // ReAct loop pattern
    /(?:while|for)[\s\S]*?(?:observation|action|thought)[\s\S]*?(?:tool|function_call)/gm,
  ];

  for (const [filePath, content] of fileContents) {
    for (const pattern of loopPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "tool_execution_loop",
          indicator: "Tool execution within a loop — agent may autonomously iterate",
          riskElevation: 1,
          critical: false,
          filePath,
          line,
        });
        break; // One detection per file per pattern
      }
    }
  }

  return elevations;
}

/**
 * Pattern 2: Multi-agent orchestration (multiple agents coordinating)
 * Risk elevation: +1
 */
function detectMultiAgentOrchestration(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const multiAgentPatterns = [
    // CrewAI crew with multiple agents
    /Crew\(\s*agents\s*=\s*\[.*,.*\]/gm,
    // AutoGen GroupChat
    /GroupChat\(|GroupChatManager\(/gm,
    // LangGraph multi-agent
    /add_node\(.*agent.*\)[\s\S]*?add_node\(.*agent.*\)/gm,
    // Generic multi-agent patterns
    /agents?\s*[:=]\s*\[[\s\S]*?Agent[\s\S]*?Agent/gm,
    // Swarm patterns
    /(?:Swarm|Orchestra|Supervisor)\s*\(/gm,
  ];

  for (const [filePath, content] of fileContents) {
    for (const pattern of multiAgentPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "multi_agent_orchestration",
          indicator: "Multiple AI agents coordinating — increased autonomous surface area",
          riskElevation: 1,
          critical: false,
          filePath,
          line,
        });
        break;
      }
    }
  }

  return elevations;
}

/**
 * Pattern 3: External API calls from agent context
 * Risk elevation: +1
 */
function detectExternalApiFromAgent(
  detections: DetectionResult[],
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  // Only check files that already have agent framework detections
  const agentFiles = new Set(
    detections
      .filter((d) => d.category === "agent_framework")
      .map((d) => d.filePath)
  );

  const apiPatterns = [
    /(?:requests\.(?:get|post|put|delete|patch))\(/gm,
    /(?:fetch|axios|got|ky)\(/gm,
    /(?:httpx|aiohttp|urllib)/gm,
    /(?:subprocess\.(?:run|call|Popen))\(/gm,
  ];

  for (const [filePath, content] of fileContents) {
    if (!agentFiles.has(filePath)) continue;

    for (const pattern of apiPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "external_api_from_agent",
          indicator: "Agent makes external API/HTTP calls — data exfiltration risk",
          riskElevation: 1,
          critical: false,
          filePath,
          line,
        });
        break;
      }
    }
  }

  return elevations;
}

/**
 * Pattern 4: File system write from agent context
 * Risk elevation: +1
 */
function detectFileSystemWrite(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const writePatterns = [
    // Python file writes
    /open\(.*['\"]w['\"]|write_text\(|Path\(.*\.write/gm,
    // Node.js file writes
    /fs\.(?:writeFile|appendFile|createWriteStream)|writeFileSync/gm,
    // Shell commands
    /subprocess\.(?:run|call|Popen).*(?:>|>>|tee\s)/gm,
  ];

  for (const [filePath, content] of fileContents) {
    for (const pattern of writePatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "file_system_write",
          indicator: "Agent writes to file system — persistence and escalation risk",
          riskElevation: 1,
          critical: false,
          filePath,
          line,
        });
        break;
      }
    }
  }

  return elevations;
}

/**
 * Pattern 5: Database mutation from agent context
 * Risk elevation: +1
 */
function detectDbMutation(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const dbMutationPatterns = [
    // SQL mutations
    /(?:INSERT|UPDATE|DELETE|DROP|ALTER|TRUNCATE)\s+(?:INTO|FROM|TABLE)/gim,
    // ORM mutations
    /\.(?:save|create|update|delete|destroy|remove|insert)\(/gm,
    // Prisma mutations
    /prisma\..*\.(?:create|update|delete|upsert)\(/gm,
    // SQLAlchemy
    /session\.(?:add|delete|commit|execute)\(/gm,
  ];

  for (const [filePath, content] of fileContents) {
    for (const pattern of dbMutationPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "db_mutation",
          indicator: "Agent performs database mutations — data integrity risk",
          riskElevation: 1,
          critical: false,
          filePath,
          line,
        });
        break;
      }
    }
  }

  return elevations;
}

/**
 * Pattern 6: Human-in-the-loop bypass
 * Risk elevation: +2
 */
function detectHitlBypass(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const hitlBypassPatterns = [
    // Explicit HITL bypass flags
    /(?:human_in_the_loop|hitl|human_approval|require_approval)\s*[:=]\s*(?:false|False|0|none|None)/gim,
    // Auto-approve patterns
    /auto_?approve|skip_?approval|bypass_?review|no_?confirmation/gim,
    // Force execution
    /force_?execute|auto_?execute|skip_?confirmation/gim,
  ];

  for (const [filePath, content] of fileContents) {
    for (const pattern of hitlBypassPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "hitl_bypass",
          indicator: "Human-in-the-loop bypass detected — autonomous execution without oversight",
          riskElevation: 2,
          critical: true,
          filePath,
          line,
        });
        break;
      }
    }
  }

  return elevations;
}

/**
 * Pattern 7: Agent spawning other agents
 * Risk elevation: +2 (CRITICAL)
 */
function detectAgentSpawning(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const spawnPatterns = [
    // Direct agent creation from within agent context
    /(?:spawn|create|launch|fork)_?agent\(/gim,
    // Dynamic agent creation
    /(?:Agent|Assistant)\s*\([\s\S]*?(?:Agent|Assistant)\s*\(/gm,
    // CrewAI hierarchical
    /process\s*=\s*Process\.hierarchical/gm,
    // AutoGen nested chat
    /register_nested_chats|initiate_chats/gm,
    // ManagedAgent pattern
    /ManagedAgent\(/gm,
  ];

  for (const [filePath, content] of fileContents) {
    for (const pattern of spawnPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        const line = content.substring(0, match.index).split("\n").length;
        elevations.push({
          pattern: "agent_spawning_agents",
          indicator: "Agent spawns other agents — recursive autonomy risk",
          riskElevation: 2,
          critical: true,
          filePath,
          line,
        });
        break;
      }
    }
  }

  return elevations;
}

/**
 * Pattern 8: PII/production data processing without anonymization
 * Risk elevation: +2 (CRITICAL)
 */
function detectPiiWithoutAnonymization(
  fileContents: Map<string, string>
): AgenticElevation[] {
  const elevations: AgenticElevation[] = [];

  const piiPatterns = [
    // Direct PII field access
    /(?:ssn|social_security|passport|credit_card|card_number|national_id)\s*[:=]/gim,
    // Health data
    /(?:patient_id|medical_record|diagnosis|prescription|health_data)\s*[:=]/gim,
    // Financial data
    /(?:account_number|routing_number|bank_account|tax_id|ein)\s*[:=]/gim,
  ];

  // Check if anonymization/masking is present
  const anonymizationPatterns = [
    /(?:anonymize|mask|redact|pseudonymize|tokenize|encrypt)/im,
    /(?:presidio|pii_?redact|data_?masking)/im,
  ];

  for (const [filePath, content] of fileContents) {
    let hasPii = false;
    let piiLine = 0;

    for (const pattern of piiPatterns) {
      pattern.lastIndex = 0;
      const match = pattern.exec(content);
      if (match) {
        hasPii = true;
        piiLine = content.substring(0, match.index).split("\n").length;
        break;
      }
    }

    if (!hasPii) continue;

    // Check if anonymization is present in the same file
    const hasAnonymization = anonymizationPatterns.some((p) => p.test(content));

    if (!hasAnonymization) {
      elevations.push({
        pattern: "pii_without_anonymization",
        indicator: "PII/sensitive data processed without anonymization — privacy violation risk",
        riskElevation: 2,
        critical: true,
        filePath,
        line: piiLine,
      });
    }
  }

  return elevations;
}
