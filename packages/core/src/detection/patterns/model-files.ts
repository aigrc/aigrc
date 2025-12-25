import type { PatternDefinition } from "../types";
import { registerPattern } from "./registry";

// ─────────────────────────────────────────────────────────────────
// MODEL FILE PATTERNS (File Extension Based)
// ─────────────────────────────────────────────────────────────────

const modelFilePatterns: PatternDefinition[] = [
  {
    id: "pytorch-model",
    name: "PyTorch Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".pt", confidence: "high" },
      { type: "literal", pattern: ".pth", confidence: "high" },
      { type: "literal", pattern: ".bin", confidence: "medium", description: "May be transformer weights" },
    ],
    implies: [],
  },
  {
    id: "safetensors-model",
    name: "SafeTensors Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".safetensors", confidence: "high" },
    ],
    implies: [],
  },
  {
    id: "onnx-model",
    name: "ONNX Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".onnx", confidence: "high" },
    ],
    implies: [],
  },
  {
    id: "keras-model",
    name: "Keras/TensorFlow Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".h5", confidence: "high" },
      { type: "literal", pattern: ".keras", confidence: "high" },
      { type: "literal", pattern: ".pb", confidence: "medium", description: "TensorFlow frozen graph" },
    ],
    implies: [],
  },
  {
    id: "sklearn-model",
    name: "Scikit-learn Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".pkl", confidence: "low", description: "Could be any pickle file" },
      { type: "literal", pattern: ".joblib", confidence: "high" },
    ],
    implies: [],
  },
  {
    id: "model-config",
    name: "Model Configuration File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "regex", pattern: "config\\.json$", confidence: "low", description: "May be model config" },
      { type: "regex", pattern: "model\\.json$", confidence: "medium" },
      { type: "regex", pattern: "adapter_config\\.json$", confidence: "high", description: "LoRA adapter" },
      { type: "regex", pattern: "tokenizer\\.json$", confidence: "high" },
      { type: "regex", pattern: "tokenizer_config\\.json$", confidence: "high" },
      { type: "regex", pattern: "generation_config\\.json$", confidence: "high" },
    ],
    implies: [],
  },
  {
    id: "gguf-model",
    name: "GGUF Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".gguf", confidence: "high", description: "llama.cpp format" },
      { type: "literal", pattern: ".ggml", confidence: "high", description: "Legacy GGML format" },
    ],
    implies: [],
  },
  {
    id: "mlx-model",
    name: "MLX Model File",
    category: "model_file",
    language: "any",
    patterns: [
      { type: "literal", pattern: ".npz", confidence: "low", description: "May be MLX weights" },
    ],
    implies: [],
  },
];

export function registerModelFilePatterns(): void {
  modelFilePatterns.forEach(registerPattern);
}

export { modelFilePatterns };
