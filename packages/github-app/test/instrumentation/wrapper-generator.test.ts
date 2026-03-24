// ─────────────────────────────────────────────────────────────────
// PangoGuard — Wrapper Generator Tests
// ─────────────────────────────────────────────────────────────────

import { describe, it, expect } from "vitest";
import { generateWrapper } from "../../src/instrumentation/wrapper-generator.js";

const mockDetection = {
  filePath: "src/agent.ts",
  framework: "OpenAI",
  category: "llm_provider" as const,
  confidence: "high" as const,
  line: 1,
  matchedPattern: 'import OpenAI from "openai"',
  riskFactors: [],
};

describe("generateWrapper", () => {
  it("should generate OpenAI TypeScript wrapper", () => {
    const result = generateWrapper("openai", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.framework).toBe("openai");
    expect(result!.language).toBe("typescript");
    expect(result!.content).toContain("governedChatCompletion");
    expect(result!.content).toContain("@aigrc/runtime-sdk");
  });

  it("should generate Anthropic TypeScript wrapper", () => {
    const result = generateWrapper("anthropic-sdk", mockDetection as any, "L1", "LIMITED");
    expect(result).not.toBeNull();
    expect(result!.framework).toBe("anthropic-sdk");
    expect(result!.content).toContain("governedMessage");
  });

  it("should generate Vercel AI SDK wrapper", () => {
    const result = generateWrapper("vercel-ai-sdk", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governedGenerateText");
    expect(result!.content).toContain("governedStreamText");
  });

  it("should generate MCP TypeScript wrapper", () => {
    const result = generateWrapper("mcp-sdk-ts", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governedToolHandler");
    expect(result!.content).toContain("@modelcontextprotocol/sdk");
  });

  it("should generate Mastra wrapper", () => {
    const result = generateWrapper("mastra", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governedMastraAgent");
  });

  it("should generate LangChain Python wrapper", () => {
    const result = generateWrapper("langchain", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.language).toBe("python");
    expect(result!.content).toContain("governed_chain_invoke");
    expect(result!.content).toContain("aigrc_runtime_sdk");
  });

  it("should generate CrewAI Python wrapper", () => {
    const result = generateWrapper("crewai", mockDetection as any, "L1", "LIMITED");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governed_crew_kickoff");
  });

  it("should generate FastMCP Python wrapper", () => {
    const result = generateWrapper("fastmcp", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governed_fastmcp_tool");
    expect(result!.content).toContain("@wraps");
  });

  it("should generate MCP Python wrapper", () => {
    const result = generateWrapper("mcp-sdk-py", mockDetection as any, "L2", "HIGH");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governed_tool");
    expect(result!.content).toContain("decorator");
  });

  it("should generate Pydantic AI Python wrapper", () => {
    const result = generateWrapper("pydantic-ai", mockDetection as any, "L1", "LIMITED");
    expect(result).not.toBeNull();
    expect(result!.content).toContain("governed_agent_run");
  });

  it("should return null for unsupported frameworks", () => {
    const result = generateWrapper("unknown-framework", mockDetection as any, "L0", "MINIMAL");
    expect(result).toBeNull();
  });

  it("should embed risk tier in generated code", () => {
    const result = generateWrapper("openai", mockDetection as any, "L3", "UNACCEPTABLE");
    expect(result!.content).toContain("L3");
    expect(result!.content).toContain("UNACCEPTABLE");
  });
});
