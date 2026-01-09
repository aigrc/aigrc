/**
 * URL/HTML Content Extractor
 *
 * Extracts text content from web URLs and HTML documents.
 * Uses native fetch API for HTTP requests and parses HTML to extract text.
 *
 * @module @aigrc/i2e-bridge/extractors/url
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

/**
 * Simple HTML parser that extracts text content
 * This is a lightweight implementation that doesn't require DOM dependencies
 */
function extractTextFromHtml(html: string): {
  text: string;
  title?: string;
  metadata: Record<string, string>;
} {
  const metadata: Record<string, string> = {};

  // Extract title
  const titleMatch = html.match(/<title[^>]*>([^<]*)<\/title>/i);
  const title = titleMatch ? decodeHtmlEntities(titleMatch[1].trim()) : undefined;

  // Extract meta tags
  const metaRegex = /<meta\s+(?:[^>]*?\s+)?(?:name|property)=["']([^"']+)["'][^>]*?\s+content=["']([^"']+)["'][^>]*>/gi;
  let metaMatch;
  while ((metaMatch = metaRegex.exec(html)) !== null) {
    const [, name, content] = metaMatch;
    metadata[name.toLowerCase()] = decodeHtmlEntities(content);
  }

  // Remove script and style content
  let text = html
    .replace(/<script\b[^<]*(?:(?!<\/script>)<[^<]*)*<\/script>/gi, "")
    .replace(/<style\b[^<]*(?:(?!<\/style>)<[^<]*)*<\/style>/gi, "")
    .replace(/<noscript\b[^<]*(?:(?!<\/noscript>)<[^<]*)*<\/noscript>/gi, "");

  // Extract main content if available
  const mainContent = extractMainContent(text);
  if (mainContent) {
    text = mainContent;
  }

  // Remove HTML tags
  text = text.replace(/<[^>]+>/g, " ");

  // Decode HTML entities
  text = decodeHtmlEntities(text);

  // Clean up whitespace
  text = text
    .replace(/\s+/g, " ")
    .replace(/\n\s*\n/g, "\n\n")
    .trim();

  return { text, title, metadata };
}

/**
 * Attempts to extract main content area from HTML
 */
function extractMainContent(html: string): string | null {
  // Try common content containers
  const contentSelectors = [
    /<main[^>]*>([\s\S]*?)<\/main>/i,
    /<article[^>]*>([\s\S]*?)<\/article>/i,
    /<div[^>]*class="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*id="[^"]*content[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*class="[^"]*main[^"]*"[^>]*>([\s\S]*?)<\/div>/i,
    /<div[^>]*role="main"[^>]*>([\s\S]*?)<\/div>/i,
  ];

  for (const regex of contentSelectors) {
    const match = html.match(regex);
    if (match && match[1] && match[1].length > 200) {
      return match[1];
    }
  }

  return null;
}

/**
 * Decodes common HTML entities
 */
function decodeHtmlEntities(text: string): string {
  const entities: Record<string, string> = {
    "&nbsp;": " ",
    "&amp;": "&",
    "&lt;": "<",
    "&gt;": ">",
    "&quot;": '"',
    "&apos;": "'",
    "&#39;": "'",
    "&mdash;": "—",
    "&ndash;": "–",
    "&bull;": "•",
    "&copy;": "©",
    "&reg;": "®",
    "&trade;": "™",
    "&hellip;": "…",
  };

  let result = text;
  for (const [entity, char] of Object.entries(entities)) {
    result = result.replace(new RegExp(entity, "gi"), char);
  }

  // Handle numeric entities
  result = result.replace(/&#(\d+);/g, (_, num) =>
    String.fromCharCode(parseInt(num, 10))
  );
  result = result.replace(/&#x([0-9a-fA-F]+);/g, (_, hex) =>
    String.fromCharCode(parseInt(hex, 16))
  );

  return result;
}

/**
 * URL/HTML Document Extractor
 *
 * Extracts text from web URLs and local HTML files for policy analysis.
 */
export class UrlExtractor extends BaseDocumentExtractor {
  name = "url";
  supportedTypes: PolicySourceType[] = ["url"];

  /**
   * URL extraction is always available (uses native fetch)
   */
  isAvailable(): boolean {
    return true;
  }

  /**
   * Extracts text content from a URL or HTML file
   */
  async extract(source: PolicySourceInput): Promise<ExtractionResult> {
    const validationError = this.validateSource(source);
    if (validationError) {
      return createErrorResult(source, validationError);
    }

    try {
      let html: string;
      let fetchedUrl: string | undefined;

      if (source.uri.startsWith("http://") || source.uri.startsWith("https://")) {
        // Fetch from URL
        const result = await this.fetchUrl(source.uri);
        html = result.html;
        fetchedUrl = result.finalUrl;
      } else if (source.uri.endsWith(".html") || source.uri.endsWith(".htm")) {
        // Read local HTML file
        html = await readFile(source.uri, "utf-8");
      } else {
        return createErrorResult(
          source,
          "URL source must be http(s):// or a local .html/.htm file"
        );
      }

      // Extract text from HTML
      const { text, title, metadata } = extractTextFromHtml(html);
      const contentHash = await computeContentHash(text);

      // Generate warnings
      const warnings: string[] = [];
      if (fetchedUrl && fetchedUrl !== source.uri) {
        warnings.push(`Redirected to: ${fetchedUrl}`);
      }
      if (text.length < 200) {
        warnings.push(
          `Very little text extracted (${text.length} chars). ` +
          "Page may be heavily JavaScript-dependent or contain mostly images."
        );
      }

      return createSuccessResult(source, text, contentHash, {
        warnings,
        documentMetadata: {
          title: source.title || title,
          author: metadata["author"],
          modifiedAt: metadata["last-modified"] || metadata["article:modified_time"],
        },
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      return createErrorResult(source, `Failed to fetch URL: ${message}`);
    }
  }

  /**
   * Fetches content from a URL with redirect handling
   */
  private async fetchUrl(url: string): Promise<{ html: string; finalUrl: string }> {
    const response = await fetch(url, {
      headers: {
        "User-Agent": "AIGRC Policy Bridge/1.0",
        "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
      redirect: "follow",
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Check content type
    const contentType = response.headers.get("content-type") || "";
    if (!contentType.includes("text/html") && !contentType.includes("application/xhtml")) {
      throw new Error(
        `Expected HTML content, got: ${contentType}. ` +
        "For PDF or DOCX files, use the appropriate extractor."
      );
    }

    const html = await response.text();
    return {
      html,
      finalUrl: response.url,
    };
  }
}

// Create and register the extractor
export const urlExtractor = new UrlExtractor();
extractorRegistry.register(urlExtractor);
