/**
 * Type declarations for pdf-parse
 * @see https://www.npmjs.com/package/pdf-parse
 */

declare module "pdf-parse" {
  interface PDFInfo {
    Title?: string;
    Author?: string;
    Subject?: string;
    Keywords?: string;
    Creator?: string;
    Producer?: string;
    CreationDate?: string;
    ModDate?: string;
    [key: string]: unknown;
  }

  interface PDFMetadata {
    _metadata?: Record<string, unknown>;
  }

  interface PDFData {
    /** Number of pages */
    numpages: number;
    /** Number of rendered pages */
    numrender: number;
    /** PDF info dict */
    info: PDFInfo;
    /** PDF metadata */
    metadata: PDFMetadata | null;
    /** Extracted text content */
    text: string;
    /** PDF.js version */
    version: string;
  }

  interface PDFOptions {
    /** Max number of pages to parse */
    max?: number;
    /** PDF.js version */
    version?: string;
    /** Custom page render function */
    pagerender?: (pageData: unknown) => Promise<string>;
  }

  function pdfParse(dataBuffer: Buffer, options?: PDFOptions): Promise<PDFData>;

  export = pdfParse;
}
