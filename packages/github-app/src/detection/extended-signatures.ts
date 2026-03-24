// ─────────────────────────────────────────────────────────────────
// PangoGuard — Extended AI Framework Signatures
// 30+ new patterns beyond @aigrc/core's built-in detection
// ─────────────────────────────────────────────────────────────────

import {
  registerPattern,
  createImplication,
} from "@aigrc/core";
import type { PatternDefinition } from "@aigrc/core";

/**
 * Register all extended AI framework signatures into @aigrc/core's pattern registry.
 */
export function registerExtendedSignatures(): void {
  for (const pattern of EXTENDED_PATTERNS) {
    registerPattern(pattern);
  }
}

// ─────────────────────────────────────────────────────────────────
// NEW PYTHON SIGNATURES
// ─────────────────────────────────────────────────────────────────

const pydanticAi: PatternDefinition = {
  id: "pydantic-ai",
  name: "Pydantic AI",
  category: "agent_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from pydantic_ai", confidence: "high", description: "Pydantic AI import" },
    { type: "import", pattern: "import pydantic_ai", confidence: "high", description: "Pydantic AI import" },
    { type: "regex", pattern: "Agent\\s*\\(", confidence: "medium", description: "Pydantic AI Agent instantiation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Pydantic AI agent makes autonomous decisions"),
    createImplication("toolExecution", true, "Pydantic AI agents support tool execution"),
  ],
};

const dspy: PatternDefinition = {
  id: "dspy",
  name: "DSPy",
  category: "framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "import dspy", confidence: "high", description: "DSPy import" },
    { type: "import", pattern: "from dspy", confidence: "high", description: "DSPy import" },
    { type: "regex", pattern: "dspy\\.(?:ChainOfThought|Predict|Module|Signature)", confidence: "high", description: "DSPy module usage" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "DSPy pipeline makes autonomous decisions"),
  ],
};

const instructor: PatternDefinition = {
  id: "instructor",
  name: "Instructor",
  category: "framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "import instructor", confidence: "high", description: "Instructor import" },
    { type: "import", pattern: "from instructor", confidence: "high", description: "Instructor import" },
    { type: "regex", pattern: "instructor\\.(?:patch|from_openai|from_anthropic)", confidence: "high", description: "Instructor client patching" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Structured extraction via Instructor"),
  ],
};

const guardrailsAi: PatternDefinition = {
  id: "guardrails-ai",
  name: "Guardrails AI",
  category: "framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from guardrails", confidence: "high", description: "Guardrails AI import" },
    { type: "import", pattern: "import guardrails", confidence: "high", description: "Guardrails AI import" },
    { type: "regex", pattern: "Guard\\.from_(?:pydantic|string|rail)", confidence: "high", description: "Guardrails Guard creation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Guardrails AI provides AI output validation"),
  ],
};

const a2aProtocol: PatternDefinition = {
  id: "a2a-protocol",
  name: "Agent-to-Agent Protocol (A2A)",
  category: "agent_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from a2a", confidence: "high", description: "A2A protocol import" },
    { type: "import", pattern: "import a2a", confidence: "high", description: "A2A protocol import" },
    { type: "regex", pattern: "A2AClient|A2AServer|AgentCard", confidence: "medium", description: "A2A protocol usage" },
    { type: "regex", pattern: "\\.well-known/agent\\.json", confidence: "high", description: "A2A agent card endpoint" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "A2A enables inter-agent communication"),
    createImplication("toolExecution", true, "A2A agents execute tools across agent boundaries"),
    createImplication("externalDataAccess", true, "A2A agents communicate with external agents"),
  ],
};

const bedrockRuntime: PatternDefinition = {
  id: "aws-bedrock",
  name: "AWS Bedrock",
  category: "llm_provider",
  language: "python",
  patterns: [
    { type: "regex", pattern: "boto3\\.client\\(['\"]bedrock-runtime['\"]\\)", confidence: "high", description: "AWS Bedrock runtime client" },
    { type: "regex", pattern: "invoke_model|invoke_model_with_response_stream", confidence: "medium", description: "Bedrock model invocation" },
    { type: "import", pattern: "from botocore", confidence: "low", description: "AWS SDK import (may be Bedrock)" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Calls AWS Bedrock API"),
  ],
};

const sentenceTransformers: PatternDefinition = {
  id: "sentence-transformers",
  name: "Sentence Transformers",
  category: "ml_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from sentence_transformers", confidence: "high", description: "Sentence Transformers import" },
    { type: "import", pattern: "import sentence_transformers", confidence: "high", description: "Sentence Transformers import" },
    { type: "regex", pattern: "SentenceTransformer\\(", confidence: "high", description: "Sentence Transformer model loading" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Embedding model for semantic processing"),
  ],
};

const faiss: PatternDefinition = {
  id: "faiss",
  name: "FAISS",
  category: "ml_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "import faiss", confidence: "high", description: "FAISS import" },
    { type: "import", pattern: "from faiss", confidence: "high", description: "FAISS import" },
    { type: "regex", pattern: "faiss\\.(?:IndexFlatL2|IndexIVFFlat|IndexHNSW)", confidence: "high", description: "FAISS index creation" },
  ],
  implies: [],
};

const chromadb: PatternDefinition = {
  id: "chromadb",
  name: "ChromaDB",
  category: "ml_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "import chromadb", confidence: "high", description: "ChromaDB import" },
    { type: "import", pattern: "from chromadb", confidence: "high", description: "ChromaDB import" },
    { type: "regex", pattern: "chromadb\\.(?:Client|HttpClient|PersistentClient)", confidence: "high", description: "ChromaDB client creation" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Vector database for AI retrieval"),
  ],
};

const pinecone: PatternDefinition = {
  id: "pinecone",
  name: "Pinecone",
  category: "ml_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from pinecone", confidence: "high", description: "Pinecone import" },
    { type: "import", pattern: "import pinecone", confidence: "high", description: "Pinecone import" },
    { type: "regex", pattern: "Pinecone\\(", confidence: "high", description: "Pinecone client creation" },
    { type: "regex", pattern: "pinecone\\.Index\\(", confidence: "high", description: "Pinecone index access" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Pinecone vector database access"),
  ],
};

const weaviatePy: PatternDefinition = {
  id: "weaviate-py",
  name: "Weaviate (Python)",
  category: "ml_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "import weaviate", confidence: "high", description: "Weaviate import" },
    { type: "import", pattern: "from weaviate", confidence: "high", description: "Weaviate import" },
    { type: "regex", pattern: "weaviate\\.(?:Client|connect_to)", confidence: "high", description: "Weaviate client creation" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Weaviate vector database access"),
  ],
};

const qdrantPy: PatternDefinition = {
  id: "qdrant-py",
  name: "Qdrant (Python)",
  category: "ml_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from qdrant_client", confidence: "high", description: "Qdrant import" },
    { type: "import", pattern: "import qdrant_client", confidence: "high", description: "Qdrant import" },
    { type: "regex", pattern: "QdrantClient\\(", confidence: "high", description: "Qdrant client creation" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Qdrant vector database access"),
  ],
};

const smolagents: PatternDefinition = {
  id: "smolagents",
  name: "smolagents (HuggingFace)",
  category: "agent_framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from smolagents", confidence: "high", description: "smolagents import" },
    { type: "import", pattern: "import smolagents", confidence: "high", description: "smolagents import" },
    { type: "regex", pattern: "(?:CodeAgent|ToolCallingAgent|ManagedAgent)\\(", confidence: "high", description: "smolagents agent creation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "HuggingFace smolagents make autonomous decisions"),
    createImplication("toolExecution", true, "smolagents execute tools and code"),
  ],
};

const llamaIndex: PatternDefinition = {
  id: "llama-index",
  name: "LlamaIndex",
  category: "framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from llama_index", confidence: "high", description: "LlamaIndex import" },
    { type: "import", pattern: "import llama_index", confidence: "high", description: "LlamaIndex import" },
    { type: "regex", pattern: "VectorStoreIndex|SimpleDirectoryReader|ServiceContext", confidence: "medium", description: "LlamaIndex core usage" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "LlamaIndex accesses external data for RAG"),
  ],
};

const haystack: PatternDefinition = {
  id: "haystack",
  name: "Haystack",
  category: "framework",
  language: "python",
  patterns: [
    { type: "import", pattern: "from haystack", confidence: "high", description: "Haystack import" },
    { type: "import", pattern: "import haystack", confidence: "high", description: "Haystack import" },
    { type: "regex", pattern: "Pipeline\\(\\)|DocumentStore|Retriever", confidence: "medium", description: "Haystack pipeline usage" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Haystack accesses document stores"),
  ],
};

// ─────────────────────────────────────────────────────────────────
// NEW JAVASCRIPT / TYPESCRIPT SIGNATURES
// ─────────────────────────────────────────────────────────────────

const vercelAiSdk: PatternDefinition = {
  id: "vercel-ai-sdk",
  name: "Vercel AI SDK",
  category: "framework",
  language: "javascript",
  patterns: [
    { type: "import", pattern: "from \"ai\"", confidence: "high", description: "Vercel AI SDK import" },
    { type: "import", pattern: "from 'ai'", confidence: "high", description: "Vercel AI SDK import" },
    { type: "import", pattern: "@ai-sdk/", confidence: "high", description: "Vercel AI SDK provider import" },
    { type: "regex", pattern: "(?:generateText|streamText|generateObject|streamObject)\\(", confidence: "high", description: "Vercel AI SDK function call" },
    { type: "regex", pattern: "(?:createOpenAI|createAnthropic|createGoogleGenerativeAI)\\(", confidence: "high", description: "Vercel AI SDK provider creation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Vercel AI SDK generates AI responses"),
    createImplication("externalDataAccess", true, "Vercel AI SDK calls external LLM APIs"),
  ],
};

const mastra: PatternDefinition = {
  id: "mastra",
  name: "Mastra",
  category: "agent_framework",
  language: "javascript",
  patterns: [
    { type: "import", pattern: "from \"mastra\"", confidence: "high", description: "Mastra import" },
    { type: "import", pattern: "from 'mastra'", confidence: "high", description: "Mastra import" },
    { type: "import", pattern: "@mastra/", confidence: "high", description: "Mastra subpackage import" },
    { type: "regex", pattern: "new Mastra\\(", confidence: "high", description: "Mastra instance creation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Mastra orchestrates AI agents"),
    createImplication("toolExecution", true, "Mastra agents execute tools"),
  ],
};

const msAutogen: PatternDefinition = {
  id: "ms-autogen",
  name: "Microsoft AutoGen",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "import", pattern: "from autogen", confidence: "high", description: "AutoGen Python import" },
    { type: "import", pattern: "import autogen", confidence: "high", description: "AutoGen Python import" },
    { type: "import", pattern: "@microsoft/autogen", confidence: "high", description: "AutoGen JS/TS import" },
    { type: "regex", pattern: "(?:ConversableAgent|AssistantAgent|UserProxyAgent|GroupChat)\\(", confidence: "high", description: "AutoGen agent creation" },
    { type: "regex", pattern: "autogen\\.(?:Agent|ChatCompletion)", confidence: "medium", description: "AutoGen usage" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "AutoGen agents make autonomous decisions"),
    createImplication("toolExecution", true, "AutoGen agents can execute code and tools"),
  ],
};

const semanticKernel: PatternDefinition = {
  id: "semantic-kernel",
  name: "Semantic Kernel",
  category: "framework",
  language: "any",
  patterns: [
    { type: "import", pattern: "from semantic_kernel", confidence: "high", description: "Semantic Kernel Python import" },
    { type: "import", pattern: "semantic-kernel", confidence: "high", description: "Semantic Kernel JS/TS import" },
    { type: "regex", pattern: "Kernel\\(\\)|kernel\\.add_plugin|kernel\\.invoke", confidence: "medium", description: "Semantic Kernel usage" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Semantic Kernel orchestrates AI plugins"),
    createImplication("toolExecution", true, "Semantic Kernel executes plugins"),
  ],
};

const onnxWeb: PatternDefinition = {
  id: "onnxruntime-web",
  name: "ONNX Runtime Web",
  category: "ml_framework",
  language: "javascript",
  patterns: [
    { type: "import", pattern: "onnxruntime-web", confidence: "high", description: "ONNX Runtime Web import" },
    { type: "import", pattern: "onnxruntime-node", confidence: "high", description: "ONNX Runtime Node import" },
    { type: "regex", pattern: "InferenceSession\\.create\\(", confidence: "high", description: "ONNX session creation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Local model inference via ONNX Runtime"),
  ],
};

const weaviateJs: PatternDefinition = {
  id: "weaviate-js",
  name: "Weaviate (JS)",
  category: "ml_framework",
  language: "javascript",
  patterns: [
    { type: "import", pattern: "weaviate-client", confidence: "high", description: "Weaviate JS import" },
    { type: "import", pattern: "weaviate-ts-client", confidence: "high", description: "Weaviate TS import" },
    { type: "regex", pattern: "weaviate\\.connectTo(?:Local|WCS|Custom)", confidence: "high", description: "Weaviate JS connection" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Weaviate vector database access"),
  ],
};

const qdrantJs: PatternDefinition = {
  id: "qdrant-js",
  name: "Qdrant (JS)",
  category: "ml_framework",
  language: "javascript",
  patterns: [
    { type: "import", pattern: "@qdrant/js-client-rest", confidence: "high", description: "Qdrant JS import" },
    { type: "regex", pattern: "new QdrantClient\\(", confidence: "high", description: "Qdrant JS client creation" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Qdrant vector database access"),
  ],
};

const anthropicSdk: PatternDefinition = {
  id: "anthropic-sdk",
  name: "Anthropic SDK",
  category: "llm_provider",
  language: "any",
  patterns: [
    { type: "import", pattern: "@anthropic-ai/sdk", confidence: "high", description: "Anthropic JS/TS SDK import" },
    { type: "import", pattern: "from anthropic", confidence: "high", description: "Anthropic Python SDK import" },
    { type: "import", pattern: "import anthropic", confidence: "high", description: "Anthropic Python SDK import" },
    { type: "regex", pattern: "new Anthropic\\(", confidence: "high", description: "Anthropic client creation" },
    { type: "regex", pattern: "anthropic\\.(?:Anthropic|Client)\\(", confidence: "high", description: "Anthropic Python client creation" },
    { type: "regex", pattern: "\\.messages\\.create\\(", confidence: "medium", description: "Anthropic messages API call" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Calls Anthropic Claude API"),
  ],
};

const googleGenAi: PatternDefinition = {
  id: "google-genai",
  name: "Google Generative AI",
  category: "llm_provider",
  language: "any",
  patterns: [
    { type: "import", pattern: "@google/generative-ai", confidence: "high", description: "Google GenAI JS import" },
    { type: "import", pattern: "google.generativeai", confidence: "high", description: "Google GenAI Python import" },
    { type: "import", pattern: "from google.ai", confidence: "high", description: "Google AI import" },
    { type: "regex", pattern: "GenerativeModel\\(", confidence: "medium", description: "Google GenAI model creation" },
    { type: "regex", pattern: "genai\\.(?:configure|GenerativeModel)", confidence: "high", description: "Google GenAI usage" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Calls Google Gemini API"),
  ],
};

const mistralSdk: PatternDefinition = {
  id: "mistral-sdk",
  name: "Mistral AI",
  category: "llm_provider",
  language: "any",
  patterns: [
    { type: "import", pattern: "@mistralai/mistralai", confidence: "high", description: "Mistral JS SDK import" },
    { type: "import", pattern: "from mistralai", confidence: "high", description: "Mistral Python SDK import" },
    { type: "regex", pattern: "MistralClient\\(|Mistral\\(", confidence: "high", description: "Mistral client creation" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Calls Mistral AI API"),
  ],
};

const cohereSDK: PatternDefinition = {
  id: "cohere-sdk",
  name: "Cohere",
  category: "llm_provider",
  language: "any",
  patterns: [
    { type: "import", pattern: "import cohere", confidence: "high", description: "Cohere Python import" },
    { type: "import", pattern: "from cohere", confidence: "high", description: "Cohere Python import" },
    { type: "import", pattern: "cohere-ai", confidence: "high", description: "Cohere JS import" },
    { type: "regex", pattern: "cohere\\.Client\\(|CohereClient\\(", confidence: "high", description: "Cohere client creation" },
  ],
  implies: [
    createImplication("externalDataAccess", true, "Calls Cohere API"),
  ],
};

const openaiAssistants: PatternDefinition = {
  id: "openai-assistants",
  name: "OpenAI Assistants API",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "regex", pattern: "\\.beta\\.assistants\\.create\\(", confidence: "high", description: "OpenAI Assistants creation" },
    { type: "regex", pattern: "\\.beta\\.threads\\.(?:create|runs)", confidence: "high", description: "OpenAI Threads API" },
    { type: "regex", pattern: "assistant_id|thread_id|run\\.status", confidence: "medium", description: "OpenAI Assistants patterns" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "OpenAI Assistant makes autonomous decisions"),
    createImplication("toolExecution", true, "OpenAI Assistants support function calling"),
    createImplication("externalDataAccess", true, "Calls OpenAI Assistants API"),
  ],
};

const langGraph: PatternDefinition = {
  id: "langgraph",
  name: "LangGraph",
  category: "agent_framework",
  language: "any",
  patterns: [
    { type: "import", pattern: "from langgraph", confidence: "high", description: "LangGraph import" },
    { type: "import", pattern: "@langchain/langgraph", confidence: "high", description: "LangGraph JS import" },
    { type: "regex", pattern: "StateGraph\\(|MessageGraph\\(|CompiledGraph", confidence: "high", description: "LangGraph graph creation" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "LangGraph orchestrates stateful agent workflows"),
    createImplication("toolExecution", true, "LangGraph agents execute tools in graph nodes"),
  ],
};

const llamaCpp: PatternDefinition = {
  id: "llama-cpp",
  name: "llama.cpp / llama-cpp-python",
  category: "ml_framework",
  language: "any",
  patterns: [
    { type: "import", pattern: "from llama_cpp", confidence: "high", description: "llama-cpp-python import" },
    { type: "import", pattern: "import llama_cpp", confidence: "high", description: "llama-cpp-python import" },
    { type: "import", pattern: "node-llama-cpp", confidence: "high", description: "node-llama-cpp import" },
    { type: "regex", pattern: "Llama\\(model_path", confidence: "high", description: "llama.cpp model loading" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Local LLM inference via llama.cpp"),
  ],
};

const ollamaSdk: PatternDefinition = {
  id: "ollama",
  name: "Ollama",
  category: "llm_provider",
  language: "any",
  patterns: [
    { type: "import", pattern: "import ollama", confidence: "high", description: "Ollama Python import" },
    { type: "import", pattern: "from ollama", confidence: "high", description: "Ollama Python import" },
    { type: "import", pattern: "from \"ollama\"", confidence: "high", description: "Ollama JS import" },
    { type: "regex", pattern: "ollama\\.(?:chat|generate|embeddings)\\(", confidence: "high", description: "Ollama API call" },
  ],
  implies: [
    createImplication("autonomousDecisions", true, "Local LLM inference via Ollama"),
  ],
};

// ─────────────────────────────────────────────────────────────────
// ALL EXTENDED PATTERNS
// ─────────────────────────────────────────────────────────────────

export const EXTENDED_PATTERNS: PatternDefinition[] = [
  // Python
  pydanticAi,
  dspy,
  instructor,
  guardrailsAi,
  a2aProtocol,
  bedrockRuntime,
  sentenceTransformers,
  faiss,
  chromadb,
  pinecone,
  weaviatePy,
  qdrantPy,
  smolagents,
  llamaIndex,
  haystack,
  // JavaScript / TypeScript
  vercelAiSdk,
  mastra,
  msAutogen,
  semanticKernel,
  onnxWeb,
  weaviateJs,
  qdrantJs,
  // Cross-language
  anthropicSdk,
  googleGenAi,
  mistralSdk,
  cohereSDK,
  openaiAssistants,
  langGraph,
  llamaCpp,
  ollamaSdk,
];
