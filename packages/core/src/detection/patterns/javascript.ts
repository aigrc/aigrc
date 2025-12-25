import type { PatternDefinition } from "../types";
import { registerPattern, createImplication } from "./registry";

// ─────────────────────────────────────────────────────────────────
// JAVASCRIPT/TYPESCRIPT AI FRAMEWORK PATTERNS
// ─────────────────────────────────────────────────────────────────

const javascriptPatterns: PatternDefinition[] = [
  // ─────────────────────────────────────────────────────────────────
  // LLM PROVIDERS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "openai-js",
    name: "OpenAI JavaScript SDK",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "openai"', confidence: "high" },
      { type: "import", pattern: "from 'openai'", confidence: "high" },
      { type: "regex", pattern: "new OpenAI\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "openai\\.chat\\.completions", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "OpenAI SDK calls external API"),
    ],
  },
  {
    id: "anthropic-js",
    name: "Anthropic JavaScript SDK",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "@anthropic-ai/sdk"', confidence: "high" },
      { type: "import", pattern: "from '@anthropic-ai/sdk'", confidence: "high" },
      { type: "regex", pattern: "new Anthropic\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "\\.messages\\.create", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Anthropic SDK calls external API"),
    ],
  },
  {
    id: "cohere-js",
    name: "Cohere JavaScript SDK",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "cohere-ai"', confidence: "high" },
      { type: "import", pattern: "from 'cohere-ai'", confidence: "high" },
      { type: "regex", pattern: "new CohereClient", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Cohere SDK calls external API"),
    ],
  },
  {
    id: "replicate-js",
    name: "Replicate",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "replicate"', confidence: "high" },
      { type: "import", pattern: "from 'replicate'", confidence: "high" },
      { type: "regex", pattern: "new Replicate\\s*\\(", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Replicate SDK calls external API"),
    ],
  },
  {
    id: "huggingface-js",
    name: "Hugging Face Inference",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "@huggingface/inference"', confidence: "high" },
      { type: "import", pattern: "from '@huggingface/inference'", confidence: "high" },
      { type: "regex", pattern: "HfInference\\s*\\(", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Hugging Face SDK calls external API"),
    ],
  },
  {
    id: "together-js",
    name: "Together AI",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "together-ai"', confidence: "high" },
      { type: "import", pattern: "from 'together-ai'", confidence: "high" },
      { type: "regex", pattern: "new Together\\s*\\(", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Together AI SDK calls external API"),
    ],
  },
  {
    id: "groq-js",
    name: "Groq SDK",
    category: "llm_provider",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "groq-sdk"', confidence: "high" },
      { type: "import", pattern: "from 'groq-sdk'", confidence: "high" },
      { type: "regex", pattern: "new Groq\\s*\\(", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Groq SDK calls external API"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // FRAMEWORKS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "langchain-js",
    name: "LangChain.js",
    category: "framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "langchain"', confidence: "high" },
      { type: "import", pattern: "from 'langchain'", confidence: "high" },
      { type: "import", pattern: 'from "@langchain/core"', confidence: "high" },
      { type: "import", pattern: 'from "@langchain/openai"', confidence: "high" },
      { type: "import", pattern: 'from "@langchain/anthropic"', confidence: "high" },
      { type: "import", pattern: 'from "@langchain/community"', confidence: "high" },
      { type: "regex", pattern: "new ChatOpenAI", confidence: "medium" },
      { type: "regex", pattern: "ChatPromptTemplate", confidence: "medium" },
      { type: "regex", pattern: "\\.invoke\\s*\\(", confidence: "low" },
    ],
    implies: [
      createImplication("toolExecution", true, "LangChain.js supports tool calling"),
      createImplication("externalDataAccess", true, "LangChain.js chains access external data"),
    ],
  },
  {
    id: "vercel-ai-sdk",
    name: "Vercel AI SDK",
    category: "framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "ai"', confidence: "medium" },
      { type: "import", pattern: "from 'ai'", confidence: "medium" },
      { type: "import", pattern: 'from "ai/react"', confidence: "high" },
      { type: "import", pattern: 'from "@ai-sdk/openai"', confidence: "high" },
      { type: "import", pattern: 'from "@ai-sdk/anthropic"', confidence: "high" },
      { type: "regex", pattern: "generateText\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "streamText\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "useChat\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "useCompletion\\s*\\(", confidence: "high" },
    ],
    implies: [
      createImplication("customerFacing", true, "Vercel AI SDK typically used in user-facing apps"),
      createImplication("externalDataAccess", true, "Vercel AI SDK calls LLM providers"),
    ],
  },
  {
    id: "llamaindex-js",
    name: "LlamaIndex.TS",
    category: "framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "llamaindex"', confidence: "high" },
      { type: "import", pattern: "from 'llamaindex'", confidence: "high" },
      { type: "regex", pattern: "VectorStoreIndex", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "LlamaIndex typically ingests external data"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ML FRAMEWORKS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "tensorflow-js",
    name: "TensorFlow.js",
    category: "ml_framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "@tensorflow/tfjs"', confidence: "high" },
      { type: "import", pattern: "from '@tensorflow/tfjs'", confidence: "high" },
      { type: "import", pattern: 'from "@tensorflow/tfjs-node"', confidence: "high" },
      { type: "regex", pattern: "tf\\.loadLayersModel", confidence: "medium" },
      { type: "regex", pattern: "tf\\.sequential", confidence: "medium" },
    ],
    implies: [],
  },
  {
    id: "onnxruntime-js",
    name: "ONNX Runtime Web",
    category: "ml_framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "onnxruntime-web"', confidence: "high" },
      { type: "import", pattern: 'from "onnxruntime-node"', confidence: "high" },
      { type: "regex", pattern: "InferenceSession\\.create", confidence: "high" },
    ],
    implies: [],
  },
  {
    id: "transformers-js",
    name: "Transformers.js",
    category: "ml_framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "@xenova/transformers"', confidence: "high" },
      { type: "import", pattern: 'from "@huggingface/transformers"', confidence: "high" },
      { type: "regex", pattern: "pipeline\\s*\\(", confidence: "medium" },
    ],
    implies: [],
  },

  // ─────────────────────────────────────────────────────────────────
  // AGENT FRAMEWORKS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "langgraph-js",
    name: "LangGraph.js",
    category: "agent_framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "@langchain/langgraph"', confidence: "high" },
      { type: "regex", pattern: "StateGraph", confidence: "high" },
      { type: "regex", pattern: "addNode", confidence: "medium" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "LangGraph enables stateful agent workflows"),
      createImplication("toolExecution", true, "LangGraph agents execute tools"),
    ],
  },
  {
    id: "autogen-js",
    name: "AutoGen.js",
    category: "agent_framework",
    language: "javascript",
    patterns: [
      { type: "import", pattern: 'from "autogen"', confidence: "high" },
      { type: "regex", pattern: "AssistantAgent", confidence: "high" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "AutoGen enables multi-agent systems"),
      createImplication("toolExecution", true, "AutoGen agents execute tools"),
    ],
  },
];

export function registerJavaScriptPatterns(): void {
  javascriptPatterns.forEach(registerPattern);
}

export { javascriptPatterns };
