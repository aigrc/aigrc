/**
 * Base Document Extractor
 *
 * Provides the base class and utilities for document extractors.
 *
 * @module @aigrc/i2e-bridge/extractors/base
 */

import type {
  DocumentExtractor,
  PolicySourceInput,
  PolicySourceType,
  ExtractionResult,
} from "../types";

/**
 * Computes SHA-256 hash of content
 */
export async function computeContentHash(content: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(content);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");
  return `sha256:${hashHex}`;
}

/**
 * Creates a successful extraction result
 */
export function createSuccessResult(
  source: PolicySourceInput,
  content: string,
  contentHash: string,
  options?: {
    pageCount?: number;
    warnings?: string[];
    documentMetadata?: ExtractionResult["documentMetadata"];
  }
): ExtractionResult {
  return {
    success: true,
    content,
    source,
    contentHash,
    extractedAt: new Date().toISOString(),
    pageCount: options?.pageCount,
    warnings: options?.warnings ?? [],
    documentMetadata: options?.documentMetadata,
  };
}

/**
 * Creates a failed extraction result
 */
export function createErrorResult(
  source: PolicySourceInput,
  error: string,
  warnings: string[] = []
): ExtractionResult {
  return {
    success: false,
    content: "",
    source,
    contentHash: "",
    extractedAt: new Date().toISOString(),
    warnings,
    error,
  };
}

/**
 * Base class for document extractors
 */
export abstract class BaseDocumentExtractor implements DocumentExtractor {
  abstract name: string;
  abstract supportedTypes: PolicySourceType[];

  abstract isAvailable(): boolean;
  abstract extract(source: PolicySourceInput): Promise<ExtractionResult>;

  /**
   * Checks if this extractor supports the given source type
   */
  supports(sourceType: PolicySourceType): boolean {
    return this.supportedTypes.includes(sourceType);
  }

  /**
   * Validates a source input before extraction
   */
  protected validateSource(source: PolicySourceInput): string | null {
    if (!this.supports(source.type)) {
      return `Extractor ${this.name} does not support source type: ${source.type}`;
    }
    if (!source.uri) {
      return "Source URI is required";
    }
    return null;
  }
}

/**
 * Registry of available extractors
 */
export class ExtractorRegistry {
  private extractors: Map<PolicySourceType, DocumentExtractor[]> = new Map();

  /**
   * Registers an extractor
   */
  register(extractor: DocumentExtractor): void {
    for (const type of extractor.supportedTypes) {
      const existing = this.extractors.get(type) ?? [];
      existing.push(extractor);
      this.extractors.set(type, existing);
    }
  }

  /**
   * Gets an available extractor for a source type
   */
  getExtractor(sourceType: PolicySourceType): DocumentExtractor | null {
    const extractors = this.extractors.get(sourceType) ?? [];
    // Return first available extractor
    for (const extractor of extractors) {
      if (extractor.isAvailable()) {
        return extractor;
      }
    }
    return null;
  }

  /**
   * Gets all registered extractors for a source type
   */
  getExtractors(sourceType: PolicySourceType): DocumentExtractor[] {
    return this.extractors.get(sourceType) ?? [];
  }

  /**
   * Gets all available source types
   */
  getSupportedTypes(): PolicySourceType[] {
    return Array.from(this.extractors.keys());
  }
}

/**
 * Global extractor registry
 */
export const extractorRegistry = new ExtractorRegistry();
