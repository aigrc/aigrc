/**
 * Scanner Service
 *
 * Wraps @aigrc/core detection engine for MCP integration.
 */

import {
  scan as coreScan,
  type ScanResult,
  type ScanOptions,
} from "@aigrc/core";
import { AIGRCConfig } from "../config.js";
import * as path from "path";

export class ScannerService {
  constructor(private config: AIGRCConfig) {}

  /**
   * Scan a directory for AI/ML frameworks
   */
  async scan(
    directory: string,
    options: {
      ignorePatterns?: string[];
      extensions?: string[];
      maxFiles?: number;
    } = {}
  ): Promise<ScanResult> {
    const absolutePath = path.isAbsolute(directory)
      ? directory
      : path.resolve(this.config.workspace, directory);

    const scanOptions: ScanOptions = {
      directory: absolutePath,
      ignorePatterns: options.ignorePatterns || ["node_modules", ".git", "dist", "build"],
      extensions: options.extensions,
      maxFiles: options.maxFiles || 10000,
      recursive: true,
    };

    return coreScan(scanOptions);
  }

  /**
   * Format scan results as markdown for MCP response
   */
  formatScanResults(result: ScanResult): string {
    const lines: string[] = [];

    lines.push("## Scan Results\n");
    lines.push(`**Files Scanned:** ${result.scannedFiles}`);
    lines.push(`**Detections Found:** ${result.detections.length}`);
    lines.push(`**Scan Duration:** ${result.duration}ms\n`);

    if (result.detections.length === 0) {
      lines.push("No AI/ML frameworks detected.\n");
      return lines.join("\n");
    }

    lines.push("### Detections\n");
    lines.push("| File | Framework | Category | Confidence |");
    lines.push("|------|-----------|----------|------------|");

    for (const detection of result.detections) {
      const relativePath = detection.filePath.replace(/\\/g, "/");
      lines.push(
        `| ${relativePath} | ${detection.framework} | ${detection.category} | ${detection.confidence} |`
      );
    }

    // Group by framework
    lines.push("\n### Summary by Framework\n");
    for (const [framework, count] of Object.entries(result.summary.byFramework)) {
      lines.push(`- **${framework}:** ${count} detection(s)`);
    }

    return lines.join("\n");
  }
}
