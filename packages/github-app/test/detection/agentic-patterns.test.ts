// ─────────────────────────────────────────────────────────────────
// @aigrc/github-app — Agentic Pattern Detection Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { detectAgenticPatterns } from "../../src/detection/agentic-patterns.js";
import type { DetectionResult } from "@aigrc/core";

describe("detectAgenticPatterns", () => {
  const emptyDetections: DetectionResult[] = [];

  it("should return empty array for empty inputs", () => {
    const result = detectAgenticPatterns([], new Map());
    expect(result).toEqual([]);
  });

  it("should detect tool execution loops", () => {
    const files = new Map([
      [
        "agent.ts",
        `
while (iteration < maxIterations) {
  const result = await executeTool(toolName, args);
  iteration++;
}
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    expect(result.some((e) => e.pattern === "tool_execution_loop")).toBe(true);
    expect(result.find((e) => e.pattern === "tool_execution_loop")?.riskElevation).toBe(1);
  });

  it("should detect multi-agent orchestration via GroupChat", () => {
    const files = new Map([
      [
        "crew.py",
        `
from autogen import GroupChat, GroupChatManager
group = GroupChat(agents=[agent1, agent2])
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    expect(result.some((e) => e.pattern === "multi_agent_orchestration")).toBe(true);
  });

  it("should detect HITL bypass with +2 elevation and critical flag", () => {
    const files = new Map([
      [
        "config.py",
        `
agent_config = {
    "human_in_the_loop": False,
    "auto_execute": True,
}
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    const hitl = result.find((e) => e.pattern === "hitl_bypass");
    expect(hitl).toBeDefined();
    expect(hitl?.riskElevation).toBe(2);
    expect(hitl?.critical).toBe(true);
  });

  it("should detect agent spawning agents with +2 elevation", () => {
    const files = new Map([
      [
        "spawner.py",
        `
class OrchestratorAgent:
    async def run(self):
        child = spawn_agent(SubAgent, config)
        result = await child.execute()
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    const spawn = result.find((e) => e.pattern === "agent_spawning_agents");
    expect(spawn).toBeDefined();
    expect(spawn?.riskElevation).toBe(2);
    expect(spawn?.critical).toBe(true);
  });

  it("should detect database mutations", () => {
    const files = new Map([
      [
        "agent.ts",
        `
async function processData() {
  await prisma.user.create({ data: { name: "test" } });
}
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    expect(result.some((e) => e.pattern === "db_mutation")).toBe(true);
  });

  it("should detect PII without anonymization", () => {
    const files = new Map([
      [
        "handler.py",
        `
def process_user(data):
    ssn = data["social_security"]
    return classify(ssn)
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    expect(result.some((e) => e.pattern === "pii_without_anonymization")).toBe(true);
  });

  it("should NOT flag PII when anonymization is present", () => {
    const files = new Map([
      [
        "handler.py",
        `
from presidio import anonymize
def process_user(data):
    ssn = data["social_security"]
    return anonymize(ssn)
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    expect(result.some((e) => e.pattern === "pii_without_anonymization")).toBe(false);
  });

  it("should detect file system writes", () => {
    const files = new Map([
      [
        "agent.ts",
        `
import fs from "fs";
async function saveResult(data: string) {
  fs.writeFileSync("/tmp/output.txt", data);
}
`,
      ],
    ]);

    const result = detectAgenticPatterns(emptyDetections, files);
    expect(result.some((e) => e.pattern === "file_system_write")).toBe(true);
  });
});
