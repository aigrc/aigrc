// Detection engine - placeholder for now

export interface DetectionResult {
  filePath: string;
  line: number;
  match: string;
  registryCard: string;
  confidence: "high" | "medium" | "low";
  implies: string[];
}

export interface ScanOptions {
  directory: string;
  recursive?: boolean;
  extensions?: string[];
  ignorePatterns?: string[];
}

// Placeholder - full implementation coming
export function scan(options: ScanOptions): DetectionResult[] {
  console.log("Scanning:", options.directory);
  return [];
}