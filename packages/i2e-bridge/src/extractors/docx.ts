/**
 * DOCX Document Extractor
 *
 * Extracts text content from Microsoft Word documents using mammoth.
 * Preserves document structure and extracts metadata.
 *
 * @module @aigrc/i2e-bridge/extractors/docx
 */

import { readFile, stat } from "fs/promises";
import {
  BaseDocumentExtractor,
  computeContentHash,
  createSuccessResult,
  createErrorResult,
  extractorRegistry,
} from "./base";
import type {
  PolicySourceInput,
  PolicySourceType,
  ExtractionResult,
} from "../types";

// Dynamic import for mammoth
let mammoth: MammothModule | null = null;

interface MammothMessage {
  type: "warning" | "error";
  message: string;
}

interface MammothResult {
  value: string;
  messages: MammothMessage[];
}

interface MammothModule {
  extractRawText: (input: { buffer: Buffer }) => Promise<MammothResult>;
  convertToHtml: (input: { buffer: Buffer }) => Promise<MammothResult>;
}

/**
 * Loads mammoth library dynamically
 */
async function loadMammoth(): Promise<MammothModule | null> {
  if (mammoth) return mammoth;
  try {
    const module = await import("mammoth");
    mammoth = module.default || module;
    return mammoth;
  } catch {
    return null;
  }
}

/**
 * DOCX Document Extractor
 *
 * Extracts text from Microsoft Word (.docx) files for policy analysis.
 */
export class DocxExtractor extends BaseDocumentExtractor {
  name = "docx";
  supportedTypes: PolicySourceType[] = ["docx"];
  private available: boolean | null = null;

  /**
   * Checks if mammoth is available
   */
  isAvailable(): boolean {
    if (this.available !== null) return this.available;

    try {
      require.resolve("mammoth");
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  /**
   * Extracts text content from a DOCX file
   */
  async extract(source: PolicySourceInput): Promise<ExtractionResult> {
    const validationError = this.validateSource(source);
    if (validationError) {
      return createErrorResult(source, validationError);
    }

    // Load mammoth
    const parser = await loadMammoth();
    if (!parser) {
      return createErrorResult(
        source,
        "mammoth is not installed. Run: npm install mammoth"
      );
    }

    try {
      // Read DOCX file
      const buffer = await readFile(source.uri);
      const fileStats = await stat(source.uri);

      // Extract raw text
      const result = await parser.extractRawText({ buffer });

      // Clean extracted text
      const content = this.cleanText(result.value);
      const contentHash = await computeContentHash(content);

      // Generate warnings from mammoth messages
      const warnings = this.processMessages(result.messages);

      // Add our own warnings
      warnings.push(...this.generateWarnings(content, fileStats.size));

      return createSuccessResult(source, content, contentHash, {
        warnings,
        documentMetadata: {
          title: source.title,
          modifiedAt: fileStats.mtime.toISOString(),
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(source, `Failed to parse DOCX: ${message}`);
    }
  }

  /**
   * Cleans extracted text content
   */
  private cleanText(text: string): string {
    return text
      // Normalize line endings
      .replace(/\r\n/g, "\n")
      .replace(/\r/g, "\n")
      // Remove excessive blank lines
      .replace(/\n{3,}/g, "\n\n")
      // Trim each line
      .split("\n")
      .map(line => line.trim())
      .join("\n")
      // Trim overall content
      .trim();
  }

  /**
   * Processes mammoth warning/error messages
   */
  private processMessages(messages: MammothMessage[]): string[] {
    return messages
      .filter(msg => msg.type === "warning" || msg.type === "error")
      .map(msg => `[${msg.type}] ${msg.message}`);
  }

  /**
   * Generates warnings for potential extraction issues
   */
  private generateWarnings(content: string, fileSize: number): string[] {
    const warnings: string[] = [];

    // Warn if very little text extracted from large file
    if (content.length < 100 && fileSize > 10000) {
      warnings.push(
        `Very little text extracted (${content.length} chars) from ${Math.round(fileSize / 1024)}KB file. ` +
        "Document may contain primarily images or embedded objects."
      );
    }

    // Warn about very large documents
    if (fileSize > 10 * 1024 * 1024) {
      warnings.push(
        `Large document (${Math.round(fileSize / 1024 / 1024)}MB). ` +
        "Consider splitting into smaller policy documents."
      );
    }

    // Warn about short content
    if (content.length < 500 && content.length > 0) {
      warnings.push(
        "Document has very little text content. Verify this is the complete policy document."
      );
    }

    return warnings;
  }
}

// Create and register the extractor
export const docxExtractor = new DocxExtractor();
extractorRegistry.register(docxExtractor);
