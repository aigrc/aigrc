import type { PatternDefinition } from "../types";
import { registerPattern, createImplication } from "./registry";

// ─────────────────────────────────────────────────────────────────
// PYTHON AI FRAMEWORK PATTERNS
// ─────────────────────────────────────────────────────────────────

const pythonPatterns: PatternDefinition[] = [
  // ─────────────────────────────────────────────────────────────────
  // ML FRAMEWORKS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "pytorch",
    name: "PyTorch",
    category: "ml_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "import torch", confidence: "high" },
      { type: "import", pattern: "from torch", confidence: "high" },
      { type: "regex", pattern: "torch\\.nn\\.", confidence: "medium" },
      { type: "regex", pattern: "torch\\.tensor", confidence: "medium" },
      { type: "regex", pattern: "torch\\.cuda", confidence: "medium" },
    ],
    implies: [],
  },
  {
    id: "tensorflow",
    name: "TensorFlow",
    category: "ml_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "import tensorflow", confidence: "high" },
      { type: "import", pattern: "from tensorflow", confidence: "high" },
      { type: "regex", pattern: "tf\\.keras", confidence: "medium" },
      { type: "regex", pattern: "tf\\.data", confidence: "medium" },
    ],
    implies: [],
  },
  {
    id: "keras",
    name: "Keras",
    category: "ml_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "import keras", confidence: "high" },
      { type: "import", pattern: "from keras", confidence: "high" },
      { type: "regex", pattern: "Sequential\\(", confidence: "medium" },
    ],
    implies: [],
  },
  {
    id: "scikit-learn",
    name: "Scikit-learn",
    category: "ml_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "import sklearn", confidence: "high" },
      { type: "import", pattern: "from sklearn", confidence: "high" },
      { type: "regex", pattern: "\\.fit\\(", confidence: "low" },
      { type: "regex", pattern: "\\.predict\\(", confidence: "low" },
    ],
    implies: [],
  },

  // ─────────────────────────────────────────────────────────────────
  // LLM PROVIDERS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "openai-python",
    name: "OpenAI Python SDK",
    category: "llm_provider",
    language: "python",
    patterns: [
      { type: "import", pattern: "from openai", confidence: "high" },
      { type: "import", pattern: "import openai", confidence: "high" },
      { type: "regex", pattern: "OpenAI\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "client\\.chat\\.completions", confidence: "medium" },
      { type: "regex", pattern: "ChatCompletion\\.create", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "OpenAI SDK calls external API"),
    ],
  },
  {
    id: "anthropic-python",
    name: "Anthropic Python SDK",
    category: "llm_provider",
    language: "python",
    patterns: [
      { type: "import", pattern: "from anthropic", confidence: "high" },
      { type: "import", pattern: "import anthropic", confidence: "high" },
      { type: "regex", pattern: "Anthropic\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "client\\.messages\\.create", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Anthropic SDK calls external API"),
    ],
  },
  {
    id: "cohere-python",
    name: "Cohere Python SDK",
    category: "llm_provider",
    language: "python",
    patterns: [
      { type: "import", pattern: "import cohere", confidence: "high" },
      { type: "import", pattern: "from cohere", confidence: "high" },
      { type: "regex", pattern: "cohere\\.Client", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Cohere SDK calls external API"),
    ],
  },
  {
    id: "google-genai",
    name: "Google Generative AI",
    category: "llm_provider",
    language: "python",
    patterns: [
      { type: "import", pattern: "import google.generativeai", confidence: "high" },
      { type: "import", pattern: "from google.generativeai", confidence: "high" },
      { type: "regex", pattern: "genai\\.GenerativeModel", confidence: "high" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Google GenAI SDK calls external API"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // FRAMEWORKS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "huggingface-transformers",
    name: "Hugging Face Transformers",
    category: "framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from transformers", confidence: "high" },
      { type: "import", pattern: "import transformers", confidence: "high" },
      { type: "regex", pattern: "AutoModel\\.from_pretrained", confidence: "high" },
      { type: "regex", pattern: "AutoTokenizer", confidence: "medium" },
      { type: "regex", pattern: "pipeline\\s*\\(", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "Hugging Face typically loads models from Hub"),
    ],
  },
  {
    id: "langchain-python",
    name: "LangChain",
    category: "framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from langchain", confidence: "high" },
      { type: "import", pattern: "import langchain", confidence: "high" },
      { type: "import", pattern: "from langchain_core", confidence: "high" },
      { type: "import", pattern: "from langchain_openai", confidence: "high" },
      { type: "import", pattern: "from langchain_anthropic", confidence: "high" },
      { type: "import", pattern: "from langchain_community", confidence: "high" },
      { type: "regex", pattern: "LLMChain", confidence: "high" },
      { type: "regex", pattern: "ChatPromptTemplate", confidence: "medium" },
      { type: "regex", pattern: "\\.invoke\\s*\\(", confidence: "medium" },
    ],
    implies: [
      createImplication("toolExecution", true, "LangChain supports tool/function calling"),
      createImplication("externalDataAccess", true, "LangChain chains often access external data"),
    ],
  },
  {
    id: "llamaindex",
    name: "LlamaIndex",
    category: "framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from llama_index", confidence: "high" },
      { type: "import", pattern: "import llama_index", confidence: "high" },
      { type: "regex", pattern: "VectorStoreIndex", confidence: "medium" },
      { type: "regex", pattern: "ServiceContext", confidence: "medium" },
      { type: "regex", pattern: "SimpleDirectoryReader", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "LlamaIndex typically ingests external data"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // AGENT FRAMEWORKS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "crewai",
    name: "CrewAI",
    category: "agent_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from crewai", confidence: "high" },
      { type: "import", pattern: "import crewai", confidence: "high" },
      { type: "decorator", pattern: "@agent", confidence: "high" },
      { type: "decorator", pattern: "@task", confidence: "high" },
      { type: "decorator", pattern: "@crew", confidence: "high" },
      { type: "regex", pattern: "Crew\\s*\\(", confidence: "high" },
      { type: "regex", pattern: "Agent\\s*\\(", confidence: "medium" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "CrewAI enables autonomous agent orchestration"),
      createImplication("toolExecution", true, "CrewAI agents execute tools autonomously"),
    ],
  },
  {
    id: "autogen",
    name: "AutoGen",
    category: "agent_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from autogen", confidence: "high" },
      { type: "import", pattern: "import autogen", confidence: "high" },
      { type: "regex", pattern: "AssistantAgent", confidence: "high" },
      { type: "regex", pattern: "UserProxyAgent", confidence: "high" },
      { type: "regex", pattern: "GroupChat", confidence: "medium" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "AutoGen enables multi-agent autonomous systems"),
      createImplication("toolExecution", true, "AutoGen agents can execute code and tools"),
    ],
  },
  {
    id: "langgraph",
    name: "LangGraph",
    category: "agent_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from langgraph", confidence: "high" },
      { type: "import", pattern: "import langgraph", confidence: "high" },
      { type: "regex", pattern: "StateGraph", confidence: "high" },
      { type: "regex", pattern: "add_node", confidence: "medium" },
      { type: "regex", pattern: "add_edge", confidence: "medium" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "LangGraph enables stateful agent workflows"),
      createImplication("toolExecution", true, "LangGraph agents execute tools in graph nodes"),
    ],
  },
  {
    id: "agency-swarm",
    name: "Agency Swarm",
    category: "agent_framework",
    language: "python",
    patterns: [
      { type: "import", pattern: "from agency_swarm", confidence: "high" },
      { type: "regex", pattern: "Agency\\s*\\(", confidence: "high" },
    ],
    implies: [
      createImplication("autonomousDecisions", true, "Agency Swarm enables multi-agent systems"),
      createImplication("toolExecution", true, "Agency Swarm agents execute tools"),
    ],
  },

  // ─────────────────────────────────────────────────────────────────
  // ML OPS
  // ─────────────────────────────────────────────────────────────────
  {
    id: "mlflow",
    name: "MLflow",
    category: "ml_ops",
    language: "python",
    patterns: [
      { type: "import", pattern: "import mlflow", confidence: "high" },
      { type: "import", pattern: "from mlflow", confidence: "high" },
      { type: "regex", pattern: "mlflow\\.log_", confidence: "medium" },
      { type: "regex", pattern: "mlflow\\.start_run", confidence: "medium" },
    ],
    implies: [],
  },
  {
    id: "wandb",
    name: "Weights & Biases",
    category: "ml_ops",
    language: "python",
    patterns: [
      { type: "import", pattern: "import wandb", confidence: "high" },
      { type: "import", pattern: "from wandb", confidence: "high" },
      { type: "regex", pattern: "wandb\\.init", confidence: "medium" },
    ],
    implies: [
      createImplication("externalDataAccess", true, "W&B syncs to external service"),
    ],
  },
];

export function registerPythonPatterns(): void {
  pythonPatterns.forEach(registerPattern);
}

export { pythonPatterns };
