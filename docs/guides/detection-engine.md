# Detection Engine Guide

Deep dive into how AIGRC detects AI/ML frameworks in your codebase.

## Overview

The AIGRC Detection Engine uses multiple strategies to identify AI/ML usage:

1. **Import Analysis** - Detects package imports
2. **Pattern Matching** - Finds framework-specific code patterns
3. **File Extension Scanning** - Identifies model files
4. **Annotation Detection** - Finds AIGRC markers in code

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│                    Detection Engine                      │
├─────────────────────────────────────────────────────────┤
│                                                          │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐  │
│  │   Pattern    │  │   Import     │  │    File      │  │
│  │   Registry   │  │   Analyzer   │  │   Scanner    │  │
│  └──────────────┘  └──────────────┘  └──────────────┘  │
│         │                 │                  │          │
│         └─────────────────┼──────────────────┘          │
│                           ▼                              │
│                  ┌──────────────┐                       │
│                  │   Scanner    │                       │
│                  └──────────────┘                       │
│                           │                              │
│                           ▼                              │
│                  ┌──────────────┐                       │
│                  │ Risk Factors │                       │
│                  │  Inference   │                       │
│                  └──────────────┘                       │
│                                                          │
└─────────────────────────────────────────────────────────┘
```

## Supported Frameworks

### Python

| Framework | Category | Detection Method |
|-----------|----------|------------------|
| OpenAI | API Client | Import, patterns |
| Anthropic | API Client | Import, patterns |
| LangChain | Framework | Import, patterns |
| LlamaIndex | Framework | Import |
| CrewAI | Agent Framework | Import, patterns |
| AutoGen | Agent Framework | Import |
| PyTorch | ML Framework | Import, patterns |
| TensorFlow | ML Framework | Import, patterns |
| Keras | ML Framework | Import |
| Transformers | ML Framework | Import, patterns |
| scikit-learn | ML Framework | Import |
| spaCy | NLP | Import |

### JavaScript/TypeScript

| Framework | Category | Detection Method |
|-----------|----------|------------------|
| OpenAI SDK | API Client | Import, patterns |
| Anthropic SDK | API Client | Import, patterns |
| Vercel AI SDK | Framework | Import, patterns |
| LangChain.js | Framework | Import, patterns |
| TensorFlow.js | ML Framework | Import |
| Brain.js | ML Framework | Import |
| Hugging Face | ML Framework | Import |

### Model Files

| Extension | Format | Description |
|-----------|--------|-------------|
| `.pt`, `.pth` | PyTorch | PyTorch model weights |
| `.safetensors` | SafeTensors | Safe tensor format |
| `.onnx` | ONNX | Open Neural Network Exchange |
| `.h5`, `.keras` | Keras/TensorFlow | Keras model format |
| `.pb` | TensorFlow | Protocol buffer format |
| `.gguf`, `.ggml` | GGML | Quantized model format |
| `.bin` | Various | Binary model weights |
| `.mlmodel` | CoreML | Apple CoreML format |

## Detection Strategies

### Import Analysis

Detects AI framework imports in source files:

```python
# Python - Detected
import openai
from langchain.llms import OpenAI
from anthropic import Anthropic
```

```typescript
// TypeScript - Detected
import OpenAI from "openai";
import { ChatAnthropic } from "@langchain/anthropic";
import { generateText } from "ai";
```

### Pattern Matching

Finds framework-specific usage patterns:

```python
# Agent patterns
agent = Agent(role="researcher", goal="...")
crew = Crew(agents=[agent], tasks=[task])

# Tool execution patterns
@tool
def search(query: str) -> str:
    ...
```

```typescript
// Vercel AI SDK patterns
const { text } = await generateText({
  model: openai("gpt-4"),
  prompt: "...",
});

// Streaming patterns
const stream = await streamText({...});
```

### File Extension Scanning

Identifies model files by extension:

```
models/
├── classifier.pt          # PyTorch
├── embeddings.safetensors # SafeTensors
├── onnx_model.onnx        # ONNX
└── quantized.gguf         # GGML
```

### Annotation Detection

Finds AIGRC markers in code comments:

```python
# @aigrc:asset my-ai-component
# @aigrc:risk high
# @aigrc:owner ml-team@example.com
```

## Confidence Levels

Each detection has a confidence level:

| Level | Description | Example |
|-------|-------------|---------|
| `high` | Direct import or clear pattern | `import openai` |
| `medium` | Indirect or partial match | Generic "ai" import |
| `low` | Possible but uncertain | File naming hints |

## Risk Factor Inference

The engine infers risk factors from detections:

| Detection | Inferred Risk Factors |
|-----------|----------------------|
| Agent frameworks (CrewAI, AutoGen) | `autonomousDecisions: true`, `toolExecution: true` |
| Tool/function calling | `toolExecution: true` |
| External API clients | `externalDataAccess: true` |
| Web frameworks + AI | `customerFacing: possible` |

## Using the Detection API

### Basic Scan

```typescript
import { scan, initializePatterns } from "@aigrc/core";

// Initialize patterns (required once)
initializePatterns();

// Run scan
const result = await scan({
  directory: "./src",
  ignorePatterns: ["node_modules", ".git"],
});

console.log(`Found ${result.detections.length} detections`);
```

### Scan Result Structure

```typescript
interface ScanResult {
  directory: string;
  scannedFiles: number;
  detections: DetectionResult[];
  summary: {
    byFramework: Record<string, number>;
    byCategory: Record<string, number>;
    byConfidence: {
      high: number;
      medium: number;
      low: number;
    };
  };
  inferredRiskFactors: Partial<RiskFactors>;
  errors: ScanError[];
}

interface DetectionResult {
  framework: string;
  category: FrameworkCategory;
  confidence: ConfidenceLevel;
  filePath: string;
  line: number;
  column: number;
  matchedPattern: string;
  strategy: DetectionStrategy;
}
```

### Progress Callback

```typescript
const result = await scan(
  { directory: "./src" },
  (progress) => {
    const pct = Math.round(
      (progress.scannedFiles / progress.totalFiles) * 100
    );
    console.log(`Scanning (${pct}%): ${progress.currentFile}`);
  }
);
```

### Synchronous Scan

For smaller codebases:

```typescript
import { scanSync } from "@aigrc/core";

const result = scanSync({ directory: "./src" });
```

## Extending the Pattern Registry

### Adding Custom Patterns

```typescript
import { registerPattern } from "@aigrc/core";

// Register a custom framework
registerPattern({
  id: "my-custom-ai",
  name: "My Custom AI",
  category: "framework",
  languages: ["python"],
  rules: [
    {
      type: "import",
      pattern: /^my_custom_ai/,
      confidence: "high",
    },
    {
      type: "pattern",
      pattern: /MyCustomAgent\(/,
      confidence: "high",
    },
  ],
  implications: {
    autonomousDecisions: true,
    toolExecution: true,
  },
});
```

### Pattern Rule Types

| Type | Description | Example |
|------|-------------|---------|
| `import` | Match import statements | `/^openai$/` |
| `pattern` | Match code patterns | `/\.chat\.completions\(/` |
| `annotation` | Match comment annotations | `/@aigrc:asset/` |
| `filename` | Match file names | `/model\.py$/` |

### Risk Implications

Patterns can specify risk implications:

```typescript
{
  implications: {
    autonomousDecisions: true,    // boolean or undefined
    customerFacing: "possible",   // boolean, "possible", or undefined
    toolExecution: true,
    externalDataAccess: true,
    piiProcessing: "unknown",     // "yes", "no", "unknown", or undefined
    highStakesDecisions: false,
  }
}
```

## Asset Card Suggestions

Generate asset card suggestions from scan results:

```typescript
import { scan, suggestAssetCard } from "@aigrc/core";

const result = await scan({ directory: "./src" });
const suggestion = suggestAssetCard(result);

console.log(suggestion);
// {
//   name: "AI Service",
//   description: "Uses openai, langchain",
//   technical: {
//     type: "framework",
//     framework: "langchain"
//   },
//   riskFactors: {
//     autonomousDecisions: false,
//     customerFacing: false,
//     toolExecution: true,
//     externalDataAccess: true,
//     piiProcessing: "unknown",
//     highStakesDecisions: false
//   }
// }
```

## Performance Considerations

### Large Codebases

For large codebases:

```typescript
const result = await scan({
  directory: "./",
  ignorePatterns: [
    "node_modules",
    ".git",
    "dist",
    "build",
    "coverage",
    "__pycache__",
    ".venv",
    "*.min.js",
    "*.bundle.js",
  ],
});
```

### Targeted Scanning

Scan only relevant directories:

```typescript
// Scan only source directories
const result = await scan({
  directory: "./src",
});

// Or use include patterns
const result = await scan({
  directory: "./",
  includePatterns: ["src/**", "lib/**"],
});
```

## Debugging Detection

### Verbose Output

Use CLI verbose mode:

```bash
aigrc scan -v
```

### Check Pattern Registry

```typescript
import { getAllPatterns, getPatternsByCategory } from "@aigrc/core";

// List all patterns
const patterns = getAllPatterns();
console.log(`${patterns.length} patterns registered`);

// Get patterns by category
const apiPatterns = getPatternsByCategory("api_client");
```

### Detection Details

Each detection includes:

```typescript
{
  framework: "openai",
  category: "api_client",
  confidence: "high",
  filePath: "/path/to/file.ts",
  line: 5,
  column: 1,
  matchedPattern: "import OpenAI",
  strategy: "import_analysis"
}
```

## Next Steps

- [CLI Guide](./cli.md) - Command-line usage
- [VS Code Extension](./vscode-extension.md) - IDE integration
- [GitHub Action](./github-action.md) - CI/CD integration
- [API Reference](../api/core.md) - Full @aigrc/core API
