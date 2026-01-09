/**
 * PDF Document Extractor
 *
 * Extracts text content from PDF policy documents using pdf-parse.
 * Handles multi-page documents and extracts metadata.
 *
 * @module @aigrc/i2e-bridge/extractors/pdf
 */

import { readFile } from "fs/promises";
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

// Dynamic import for pdf-parse (CommonJS module)
let pdfParse: ((buffer: Buffer) => Promise<PDFParseResult>) | null = null;

interface PDFParseResult {
  numpages: number;
  numrender: number;
  info: {
    Title?: string;
    Author?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: unknown;
  };
  metadata: unknown;
  text: string;
  version: string;
}

/**
 * Loads pdf-parse library dynamically
 */
async function loadPdfParse(): Promise<typeof pdfParse> {
  if (pdfParse) return pdfParse;
  try {
    // pdf-parse is a CommonJS module, need dynamic import
    const module = await import("pdf-parse");
    pdfParse = module.default || module;
    return pdfParse;
  } catch {
    return null;
  }
}

/**
 * PDF Document Extractor
 *
 * Extracts text from PDF files for policy analysis.
 */
export class PdfExtractor extends BaseDocumentExtractor {
  name = "pdf";
  supportedTypes: PolicySourceType[] = ["pdf"];
  private available: boolean | null = null;

  /**
   * Checks if pdf-parse is available
   */
  isAvailable(): boolean {
    if (this.available !== null) return this.available;

    try {
      // Try to resolve the module
      require.resolve("pdf-parse");
      this.available = true;
    } catch {
      this.available = false;
    }
    return this.available;
  }

  /**
   * Extracts text content from a PDF file
   */
  async extract(source: PolicySourceInput): Promise<ExtractionResult> {
    const validationError = this.validateSource(source);
    if (validationError) {
      return createErrorResult(source, validationError);
    }

    // Load pdf-parse
    const parser = await loadPdfParse();
    if (!parser) {
      return createErrorResult(
        source,
        "pdf-parse is not installed. Run: npm install pdf-parse"
      );
    }

    try {
      // Read PDF file
      const buffer = await readFile(source.uri);

      // Parse PDF
      const data = await parser(buffer);

      // Extract text content
      const content = this.cleanText(data.text);
      const contentHash = await computeContentHash(content);

      // Extract metadata
      const metadata = this.extractMetadata(data);

      return createSuccessResult(source, content, contentHash, {
        pageCount: data.numpages,
        warnings: this.generateWarnings(data, content),
        documentMetadata: metadata,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(source, `Failed to parse PDF: ${message}`);
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
      // Remove excessive whitespace while preserving paragraphs
      .replace(/[ \t]+/g, " ")
      .replace(/\n{3,}/g, "\n\n")
      // Trim each line
      .split("\n")
      .map(line => line.trim())
      .join("\n")
      // Trim overall content
      .trim();
  }

  /**
   * Extracts document metadata from PDF info
   */
  private extractMetadata(data: PDFParseResult): ExtractionResult["documentMetadata"] {
    const info = data.info || {};
    return {
      title: info.Title,
      author: info.Author,
      createdAt: this.parseDate(info.CreationDate),
      modifiedAt: this.parseDate(info.ModDate),
      pageCount: data.numpages,
    };
  }

  /**
   * Parses PDF date format to ISO string
   */
  private parseDate(pdfDate?: string): string | undefined {
    if (!pdfDate) return undefined;

    // PDF date format: D:YYYYMMDDHHmmSSOHH'mm'
    const match = pdfDate.match(/D:(\d{4})(\d{2})(\d{2})(\d{2})?(\d{2})?(\d{2})?/);
    if (!match) return undefined;

    const [, year, month, day, hour = "00", minute = "00", second = "00"] = match;
    try {
      const date = new Date(
        parseInt(year),
        parseInt(month) - 1,
        parseInt(day),
        parseInt(hour),
        parseInt(minute),
        parseInt(second)
      );
      return date.toISOString();
    } catch {
      return undefined;
    }
  }

  /**
   * Generates warnings for potential extraction issues
   */
  private generateWarnings(data: PDFParseResult, content: string): string[] {
    const warnings: string[] = [];

    // Warn if very little text extracted
    if (content.length < 100 && data.numpages > 0) {
      warnings.push(
        `Very little text extracted (${content.length} chars) from ${data.numpages} pages. ` +
        "PDF may contain primarily images or scanned content."
      );
    }

    // Warn about large documents
    if (data.numpages > 100) {
      warnings.push(
        `Large document with ${data.numpages} pages. ` +
        "Consider splitting into smaller policy documents for better analysis."
      );
    }

    // Warn about text density
    const charsPerPage = content.length / (data.numpages || 1);
    if (charsPerPage < 200 && data.numpages > 1) {
      warnings.push(
        `Low text density (${Math.round(charsPerPage)} chars/page). ` +
        "Document may have significant non-text content."
      );
    }

    return warnings;
  }
}

// Create and register the extractor
export const pdfExtractor = new PdfExtractor();
extractorRegistry.register(pdfExtractor);
