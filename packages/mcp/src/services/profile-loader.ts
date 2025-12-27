/**
 * Profile Loader Service
 *
 * Discovers and loads compliance profiles from YAML files.
 */

import { readFileSync, existsSync, readdirSync } from "fs";
import { join, dirname } from "path";
import { fileURLToPath } from "url";
import YAML from "yaml";
import {
  ComplianceProfile,
  ComplianceProfileSchema,
  validateProfile,
} from "../schemas/profile.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export interface ProfileLoaderOptions {
  /** Directory containing built-in profile YAML files */
  builtinProfilesDir?: string;
  /** Additional paths to load profiles from (files or directories) */
  customProfilePaths?: string[];
  /** Whether to log warnings for invalid profiles */
  verbose?: boolean;
}

export interface ProfileLoadResult {
  profiles: Map<string, ComplianceProfile>;
  errors: { path: string; errors: string[] }[];
}

export class ProfileLoader {
  private builtinDir: string;
  private customPaths: string[];
  private verbose: boolean;

  constructor(options: ProfileLoaderOptions = {}) {
    // Default to profiles directory relative to this file
    this.builtinDir =
      options.builtinProfilesDir || join(__dirname, "../../profiles");
    this.customPaths = options.customProfilePaths || [];
    this.verbose = options.verbose ?? false;
  }

  /**
   * Load all profiles from built-in and custom paths
   */
  loadAll(): ProfileLoadResult {
    const profiles = new Map<string, ComplianceProfile>();
    const errors: ProfileLoadResult["errors"] = [];

    // Load built-in profiles first
    if (existsSync(this.builtinDir)) {
      this.loadFromDirectory(this.builtinDir, profiles, errors);
    }

    // Load custom profiles (can override built-in)
    for (const customPath of this.customPaths) {
      if (!existsSync(customPath)) {
        if (this.verbose) {
          console.warn(`Profile path does not exist: ${customPath}`);
        }
        continue;
      }

      if (this.isYamlFile(customPath)) {
        this.loadProfileFile(customPath, profiles, errors);
      } else {
        this.loadFromDirectory(customPath, profiles, errors);
      }
    }

    return { profiles, errors };
  }

  /**
   * Load a single profile from a YAML file
   */
  loadProfile(filePath: string): ComplianceProfile | null {
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = YAML.parse(content);
      const result = validateProfile(data);

      if (result.valid) {
        return result.profile;
      }

      if (this.verbose) {
        console.warn(`Invalid profile at ${filePath}:`, result.errors);
      }
      return null;
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to load profile at ${filePath}:`, error);
      }
      return null;
    }
  }

  /**
   * Load all YAML profiles from a directory
   */
  private loadFromDirectory(
    dir: string,
    profiles: Map<string, ComplianceProfile>,
    errors: ProfileLoadResult["errors"]
  ): void {
    try {
      const files = readdirSync(dir);
      for (const file of files) {
        if (this.isYamlFile(file)) {
          this.loadProfileFile(join(dir, file), profiles, errors);
        }
      }
    } catch (error) {
      if (this.verbose) {
        console.warn(`Failed to read directory ${dir}:`, error);
      }
    }
  }

  /**
   * Load a single profile file and add to map
   */
  private loadProfileFile(
    filePath: string,
    profiles: Map<string, ComplianceProfile>,
    errors: ProfileLoadResult["errors"]
  ): void {
    try {
      const content = readFileSync(filePath, "utf-8");
      const data = YAML.parse(content);
      const result = validateProfile(data);

      if (result.valid) {
        profiles.set(result.profile.id, result.profile);
      } else {
        errors.push({ path: filePath, errors: result.errors });
        if (this.verbose) {
          console.warn(`Invalid profile at ${filePath}:`, result.errors);
        }
      }
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      errors.push({ path: filePath, errors: [message] });
      if (this.verbose) {
        console.warn(`Failed to load profile at ${filePath}:`, error);
      }
    }
  }

  /**
   * Check if a path is a YAML file
   */
  private isYamlFile(path: string): boolean {
    return path.endsWith(".yaml") || path.endsWith(".yml");
  }

  /**
   * Get the built-in profiles directory path
   */
  getBuiltinDir(): string {
    return this.builtinDir;
  }
}

/**
 * Create a profile loader with default options
 */
export function createProfileLoader(
  options?: ProfileLoaderOptions
): ProfileLoader {
  return new ProfileLoader(options);
}
