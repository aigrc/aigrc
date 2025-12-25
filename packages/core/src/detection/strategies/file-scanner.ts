import { extname, basename } from "path";
import type { DetectionResult } from "../types";
import { getPatternsByCategory } from "../patterns/registry";

// ─────────────────────────────────────────────────────────────────
// FILE EXTENSION SCANNING STRATEGY
// ─────────────────────────────────────────────────────────────────

export function scanFileExtension(filePath: string): DetectionResult[] {
  const detections: DetectionResult[] = [];
  const ext = extname(filePath).toLowerCase();
  const filename = basename(filePath);

  const modelPatterns = getPatternsByCategory("model_file");

  for (const pattern of modelPatterns) {
    for (const rule of pattern.patterns) {
      let matched = false;

      if (rule.type === "literal") {
        // Match file extension
        if (ext === rule.pattern.toLowerCase()) {
          matched = true;
        }
      } else if (rule.type === "regex") {
        // Match against full filename
        try {
          const regex = new RegExp(rule.pattern, "i");
          matched = regex.test(filename);
        } catch {
          // Invalid regex, skip
        }
      }

      if (matched) {
        detections.push({
          filePath,
          line: 0, // N/A for file-level detection
          match: filename,
          registryCard: pattern.id,
          framework: pattern.name,
          category: pattern.category,
          confidence: rule.confidence,
          strategy: "file_extension",
          implies: pattern.implies,
          metadata: { extension: ext, filename },
        });
      }
    }
  }

  return detections;
}

// ─────────────────────────────────────────────────────────────────
// MODEL FILE EXTENSIONS
// ─────────────────────────────────────────────────────────────────

export const MODEL_EXTENSIONS = [
  ".pt",
  ".pth",
  ".safetensors",
  ".onnx",
  ".h5",
  ".keras",
  ".pb",
  ".pkl",
  ".joblib",
  ".bin",
  ".gguf",
  ".ggml",
  ".npz",
];

export function isModelFile(filePath: string): boolean {
  const ext = extname(filePath).toLowerCase();
  return MODEL_EXTENSIONS.includes(ext);
}
