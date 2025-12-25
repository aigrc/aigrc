import type { PatternDefinition } from "../types";
import { registerPattern, createImplication } from "./registry";

// ─────────────────────────────────────────────────────────────────
// RISK FACTOR INDICATOR PATTERNS
// ─────────────────────────────────────────────────────────────────

const riskIndicatorPatterns: PatternDefinition[] = [
  // ─────────────────────────────────────────────────────────────────
  // AUTONOMOUS EXECUTION
  // ─────────────────────────────────────────────────────────────────
  {
    id: "autonomous-execution",
    name: "Autonomous Execution Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "\\.invoke\\s*\\(", confidence: "medium", description: "Agent invocation" },
      { type: "regex", pattern: "\\.run\\s*\\(", confidence: "low", description: "Run method (generic)" },
      { type: "regex", pattern: "while\\s+True", confidence: "medium", description: "Potential agent loop (Python)" },
      { type: "regex", pattern: "while\\s*\\(\\s*true\\s*\\)", confidence: "medium", description: "Potential agent loop (JS)" },
      { type: "regex", pattern: "agent\\.execute", confidence: "high", description: "Agent execution" },
      { type: "regex", pattern: "AgentExecutor", confidence: "high", description: "LangChain agent executor" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "Pattern indicates autonomous execution capability"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // TOOL EXECUTION
  // ─────────────────────────────────────────────────────────────────
  {
    id: "tool-execution",
    name: "Tool Execution Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "decorator", pattern: "@tool", confidence: "high", description: "Tool decorator" },
      { type: "regex", pattern: "function_calling", confidence: "high" },
      { type: "regex", pattern: "tools\\s*[=:]\\s*\\[", confidence: "medium" },
      { type: "regex", pattern: "bind_tools", confidence: "high" },
      { type: "regex", pattern: "create_tool", confidence: "high" },
      { type: "regex", pattern: "StructuredTool", confidence: "high" },
      { type: "regex", pattern: "BaseTool", confidence: "high" },
      { type: "regex", pattern: "mcp_server", confidence: "high", description: "MCP tool server" },
      { type: "regex", pattern: "McpServer", confidence: "high", description: "MCP server" },
    ],
    implies: [
      createImplication("toolExecution", true, "Pattern indicates tool execution capability"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // EXTERNAL DATA ACCESS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "external-data-access",
    name: "External Data Access Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "requests\\.(get|post|put|delete|patch)", confidence: "medium" },
      { type: "regex", pattern: "fetch\\s*\\(", confidence: "medium" },
      { type: "regex", pattern: "axios\\.", confidence: "medium" },
      { type: "regex", pattern: "httpx\\.", confidence: "medium" },
      { type: "regex", pattern: "aiohttp\\.", confidence: "medium" },
      { type: "regex", pattern: "WebBrowser", confidence: "high", description: "Web browsing capability" },
      { type: "regex", pattern: "Retriever", confidence: "medium", description: "RAG retrieval" },
      { type: "regex", pattern: "VectorStore", confidence: "medium", description: "Vector database access" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Pattern indicates external data access"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // DATABASE ACCESS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "database-access",
    name: "Database Access Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "SQLDatabase", confidence: "high" },
      { type: "regex", pattern: "create_sql_agent", confidence: "high" },
      { type: "regex", pattern: "sql_agent", confidence: "high" },
      { type: "regex", pattern: "MongoClient", confidence: "medium" },
      { type: "regex", pattern: "psycopg", confidence: "medium" },
      { type: "regex", pattern: "pymongo", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Pattern indicates database access"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // PII PROCESSING
  // ─────────────────────────────────────────────────────────────────
  {
    id: "pii-processing",
    name: "PII Processing Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "email|e-mail|e_mail", confidence: "low" },
      { type: "regex", pattern: "phone_number|phone|telephone|mobile", confidence: "low" },
      { type: "regex", pattern: "ssn|social_security|social-security", confidence: "high" },
      { type: "regex", pattern: "password|passwd|pwd", confidence: "medium" },
      { type: "regex", pattern: "credit_card|creditcard|cc_number", confidence: "high" },
      { type: "regex", pattern: "date_of_birth|dob|birthdate", confidence: "medium" },
      { type: "regex", pattern: "address|street|city|zipcode|zip_code", confidence: "low" },
      { type: "regex", pattern: "passport|driver_license|drivers_license", confidence: "high" },
    ],
    implies: [
      createImplication("piiProcessing", "yes", "Pattern suggests PII handling"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // HIGH-STAKES DECISIONS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "high-stakes-medical",
    name: "Medical/Healthcare Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "medical|diagnosis|patient|treatment", confidence: "high" },
      { type: "regex", pattern: "healthcare|health_care|clinical", confidence: "high" },
      { type: "regex", pattern: "prescription|medication|drug", confidence: "medium" },
      { type: "regex", pattern: "symptom|disease|condition", confidence: "medium" },
    ],
    implies: [
      createImplication("highStakesDecisions", true, "Pattern indicates medical/healthcare domain"),
    ],
  },
  {
    id: "high-stakes-legal",
    name: "Legal Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "legal|lawsuit|attorney|lawyer", confidence: "high" },
      { type: "regex", pattern: "contract|agreement|terms", confidence: "low" },
      { type: "regex", pattern: "court|judge|verdict|sentence", confidence: "high" },
      { type: "regex", pattern: "compliance|regulation|regulatory", confidence: "medium" },
    ],
    implies: [
      createImplication("highStakesDecisions", true, "Pattern indicates legal domain"),
    ],
  },
  {
    id: "high-stakes-financial",
    name: "Financial Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "financial|trading|investment|loan", confidence: "high" },
      { type: "regex", pattern: "credit_score|creditworthiness|credit_rating", confidence: "high" },
      { type: "regex", pattern: "mortgage|banking|transaction", confidence: "medium" },
      { type: "regex", pattern: "portfolio|stock|bond|asset", confidence: "medium" },
    ],
    implies: [
      createImplication("highStakesDecisions", true, "Pattern indicates financial domain"),
    ],
  },
  {
    id: "high-stakes-hiring",
    name: "Hiring/Employment Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "hiring|recruitment|candidate|applicant", confidence: "high" },
      { type: "regex", pattern: "resume|cv|curriculum_vitae", confidence: "high" },
      { type: "regex", pattern: "interview|screening|background_check", confidence: "high" },
      { type: "regex", pattern: "employee|termination|performance_review", confidence: "medium" },
    ],
    implies: [
      createImplication("highStakesDecisions", true, "Pattern indicates hiring/employment domain"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // CUSTOMER FACING
  // ─────────────────────────────────────────────────────────────────
  {
    id: "customer-facing",
    name: "Customer-Facing Patterns",
    category: "framework",
    language: "any",
    patterns: [
      { type: "regex", pattern: "chatbot|chat_bot|conversational", confidence: "high" },
      { type: "regex", pattern: "customer_service|customer_support", confidence: "high" },
      { type: "regex", pattern: "useChat|useCompletion", confidence: "high", description: "Vercel AI hooks" },
      { type: "regex", pattern: "StreamingTextResponse", confidence: "high" },
      { type: "regex", pattern: "user_input|user_message|user_query", confidence: "medium" },
    ],
    implies: [
      createImplication("customerFacing", true, "Pattern indicates customer-facing application"),
    ],
  },
];

export function registerRiskIndicatorPatterns(): void {
  riskIndicatorPatterns.forEach(registerPattern);
}

export { riskIndicatorPatterns };
