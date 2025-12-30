import * as fs from "fs";
import * as path from "path";
import * as yaml from "yaml";
import type { AigrcConfig, PolicyFile } from "./schemas";
import { AigrcConfigSchema, PolicyFileSchema } from "./schemas";

// ─────────────────────────────────────────────────────────────────
// CONFIGURATION DISCOVERY (SPEC-RT-003)
// Discovers and loads AIGRC configuration files
// ─────────────────────────────────────────────────────────────────

/** Configuration file names to search for (in order of precedence) */
export const CONFIG_FILE_NAMES = [
  ".aigrc.yaml",
  ".aigrc.yml",
  "aigrc.yaml",
  "aigrc.yml",
] as const;

/** Environment variable for config path override */
export const CONFIG_ENV_VAR = "AIGRC_CONFIG_PATH";

/** Result of configuration discovery */
export interface ConfigDiscoveryResult {
  /** The discovered configuration */
  config: AigrcConfig;
  /** Absolute path to the configuration file */
  configPath: string;
  /** Directory containing the configuration */
  configDir: string;
  /** Whether this was loaded from environment variable */
  fromEnv: boolean;
}

/** Options for configuration discovery */
export interface DiscoverConfigOptions {
  /** Starting directory for search (defaults to cwd) */
  startDir?: string;
  /** Maximum directories to traverse upward (default: 10) */
  maxDepth?: number;
  /** Override config path (equivalent to AIGRC_CONFIG_PATH) */
  configPath?: string;
}

/**
 * Discovers and loads the AIGRC configuration file.
 *
 * Search order:
 * 1. Explicit configPath option
 * 2. AIGRC_CONFIG_PATH environment variable
 * 3. Walking up from startDir looking for config files
 *
 * @param options Discovery options
 * @returns Configuration result or null if not found
 */
export function discoverConfig(
  options: DiscoverConfigOptions = {}
): ConfigDiscoveryResult | null {
  const { startDir = process.cwd(), maxDepth = 10 } = options;

  // Check explicit path first
  if (options.configPath) {
    const result = loadConfigFromPath(options.configPath);
    if (result) {
      return { ...result, fromEnv: false };
    }
  }

  // Check environment variable
  const envPath = process.env[CONFIG_ENV_VAR];
  if (envPath) {
    const result = loadConfigFromPath(envPath);
    if (result) {
      return { ...result, fromEnv: true };
    }
  }

  // Walk up directory tree
  let currentDir = path.resolve(startDir);
  let depth = 0;

  while (depth < maxDepth) {
    for (const fileName of CONFIG_FILE_NAMES) {
      const filePath = path.join(currentDir, fileName);
      if (fs.existsSync(filePath)) {
        const config = loadConfigFile(filePath);
        if (config) {
          return {
            config,
            configPath: filePath,
            configDir: currentDir,
            fromEnv: false,
          };
        }
      }
    }

    const parentDir = path.dirname(currentDir);
    if (parentDir === currentDir) {
      // Reached root
      break;
    }
    currentDir = parentDir;
    depth++;
  }

  return null;
}

/**
 * Loads configuration from a specific path
 */
function loadConfigFromPath(
  configPath: string
): Omit<ConfigDiscoveryResult, "fromEnv"> | null {
  const resolvedPath = path.resolve(configPath);
  if (!fs.existsSync(resolvedPath)) {
    return null;
  }

  const config = loadConfigFile(resolvedPath);
  if (!config) {
    return null;
  }

  return {
    config,
    configPath: resolvedPath,
    configDir: path.dirname(resolvedPath),
  };
}

/**
 * Loads and parses a configuration file
 */
function loadConfigFile(filePath: string): AigrcConfig | null {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.parse(content);
    return AigrcConfigSchema.parse(parsed);
  } catch {
    return null;
  }
}

/**
 * Synchronously discovers configuration
 */
export function discoverConfigSync(
  options: DiscoverConfigOptions = {}
): ConfigDiscoveryResult | null {
  return discoverConfig(options);
}

// ─────────────────────────────────────────────────────────────────
// POLICY DISCOVERY
// ─────────────────────────────────────────────────────────────────

/** Result of policy discovery */
export interface PolicyDiscoveryResult {
  /** Loaded policies indexed by ID */
  policies: Map<string, PolicyFile>;
  /** Paths of loaded policy files */
  loadedPaths: string[];
  /** Errors encountered during loading */
  errors: PolicyLoadError[];
}

/** Error during policy loading */
export interface PolicyLoadError {
  path: string;
  error: string;
}

/** Options for policy discovery */
export interface DiscoverPoliciesOptions {
  /** Configuration to use for policy paths */
  config?: AigrcConfig;
  /** Base directory for relative paths */
  baseDir?: string;
  /** Additional paths to search */
  additionalPaths?: string[];
}

/**
 * Discovers and loads all policy files.
 *
 * @param options Discovery options
 * @returns Map of policy ID to PolicyFile
 */
export function discoverPolicies(
  options: DiscoverPoliciesOptions = {}
): PolicyDiscoveryResult {
  const {
    config,
    baseDir = process.cwd(),
    additionalPaths = [],
  } = options;

  const policies = new Map<string, PolicyFile>();
  const loadedPaths: string[] = [];
  const errors: PolicyLoadError[] = [];

  // Get search paths from config or use defaults
  const searchPaths = [
    ...(config?.runtime?.policy_paths ?? [".aigrc/policies"]),
    ...additionalPaths,
  ];

  for (const searchPath of searchPaths) {
    const absolutePath = path.isAbsolute(searchPath)
      ? searchPath
      : path.join(baseDir, searchPath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      // Load all YAML files in directory
      const files = fs.readdirSync(absolutePath);
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          const filePath = path.join(absolutePath, file);
          const result = loadPolicyFile(filePath);
          if (result.policy) {
            policies.set(result.policy.id, result.policy);
            loadedPaths.push(filePath);
          } else if (result.error) {
            errors.push({ path: filePath, error: result.error });
          }
        }
      }
    } else if (stat.isFile()) {
      // Load single file
      const result = loadPolicyFile(absolutePath);
      if (result.policy) {
        policies.set(result.policy.id, result.policy);
        loadedPaths.push(absolutePath);
      } else if (result.error) {
        errors.push({ path: absolutePath, error: result.error });
      }
    }
  }

  return { policies, loadedPaths, errors };
}

/**
 * Loads a single policy file
 */
function loadPolicyFile(
  filePath: string
): { policy: PolicyFile | null; error: string | null } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.parse(content);
    const policy = PolicyFileSchema.parse(parsed);
    return { policy, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { policy: null, error: message };
  }
}

/**
 * Loads a specific policy by ID
 */
export function loadPolicy(
  policyId: string,
  options: DiscoverPoliciesOptions = {}
): PolicyFile | null {
  const { policies } = discoverPolicies(options);
  return policies.get(policyId) ?? null;
}

// ─────────────────────────────────────────────────────────────────
// ASSET CARD DISCOVERY
// ─────────────────────────────────────────────────────────────────

import type { AssetCard } from "./schemas";
import { AssetCardSchema } from "./schemas";

/** Result of asset card discovery */
export interface AssetDiscoveryResult {
  /** Loaded asset cards indexed by ID */
  assets: Map<string, AssetCard>;
  /** Paths of loaded asset files */
  loadedPaths: string[];
  /** Errors encountered during loading */
  errors: AssetLoadError[];
}

/** Error during asset loading */
export interface AssetLoadError {
  path: string;
  error: string;
}

/** Options for asset discovery */
export interface DiscoverAssetsOptions {
  /** Configuration to use for asset paths */
  config?: AigrcConfig;
  /** Base directory for relative paths */
  baseDir?: string;
  /** Additional paths to search */
  additionalPaths?: string[];
}

/**
 * Discovers and loads all asset cards.
 *
 * @param options Discovery options
 * @returns Map of asset ID to AssetCard
 */
export function discoverAssets(
  options: DiscoverAssetsOptions = {}
): AssetDiscoveryResult {
  const {
    config,
    baseDir = process.cwd(),
    additionalPaths = [],
  } = options;

  const assets = new Map<string, AssetCard>();
  const loadedPaths: string[] = [];
  const errors: AssetLoadError[] = [];

  // Get search paths from config or use defaults
  const searchPaths = [
    ...(config?.runtime?.asset_paths ?? [".aigrc/assets"]),
    ...additionalPaths,
  ];

  for (const searchPath of searchPaths) {
    const absolutePath = path.isAbsolute(searchPath)
      ? searchPath
      : path.join(baseDir, searchPath);

    if (!fs.existsSync(absolutePath)) {
      continue;
    }

    const stat = fs.statSync(absolutePath);
    if (stat.isDirectory()) {
      // Load all YAML files in directory
      const files = fs.readdirSync(absolutePath);
      for (const file of files) {
        if (file.endsWith(".yaml") || file.endsWith(".yml")) {
          const filePath = path.join(absolutePath, file);
          const result = loadAssetFile(filePath);
          if (result.asset) {
            assets.set(result.asset.id, result.asset);
            loadedPaths.push(filePath);
          } else if (result.error) {
            errors.push({ path: filePath, error: result.error });
          }
        }
      }
    } else if (stat.isFile()) {
      // Load single file
      const result = loadAssetFile(absolutePath);
      if (result.asset) {
        assets.set(result.asset.id, result.asset);
        loadedPaths.push(absolutePath);
      } else if (result.error) {
        errors.push({ path: absolutePath, error: result.error });
      }
    }
  }

  return { assets, loadedPaths, errors };
}

/**
 * Loads a single asset card file
 */
function loadAssetFile(
  filePath: string
): { asset: AssetCard | null; error: string | null } {
  try {
    const content = fs.readFileSync(filePath, "utf-8");
    const parsed = yaml.parse(content);
    const asset = AssetCardSchema.parse(parsed);
    return { asset, error: null };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return { asset: null, error: message };
  }
}

/**
 * Loads a specific asset by ID
 */
export function loadAsset(
  assetId: string,
  options: DiscoverAssetsOptions = {}
): AssetCard | null {
  const { assets } = discoverAssets(options);
  return assets.get(assetId) ?? null;
}

/**
 * Loads an asset card from a specific file path
 */
export function loadAssetFromPath(filePath: string): AssetCard | null {
  const result = loadAssetFile(filePath);
  return result.asset;
}

// ─────────────────────────────────────────────────────────────────
// ENVIRONMENT CONFIGURATION
// ─────────────────────────────────────────────────────────────────

/**
 * Gets the effective configuration for an environment.
 * Merges base config with environment-specific overrides.
 *
 * @param config Base configuration
 * @param environment Environment name (e.g., "production", "development")
 * @returns Merged configuration
 */
export function getEnvironmentConfig(
  config: AigrcConfig,
  environment: string
): AigrcConfig {
  const envOverrides = config.environments?.[environment];
  if (!envOverrides) {
    return config;
  }

  // Build result with proper typing
  const result: AigrcConfig = { ...config };

  // Merge runtime if either exists
  if (config.runtime || envOverrides.runtime) {
    result.runtime = {
      ...config.runtime,
      ...filterUndefined(envOverrides.runtime ?? {}),
    } as AigrcConfig["runtime"];
  }

  // Merge integrations if either exists
  if (config.integrations || envOverrides.integrations) {
    result.integrations = {
      ...config.integrations,
      ...filterUndefined(envOverrides.integrations ?? {}),
    } as AigrcConfig["integrations"];
  }

  return result;
}

/**
 * Filters out undefined values from an object.
 */
function filterUndefined<T extends Record<string, unknown>>(obj: T): Partial<T> {
  const result: Partial<T> = {};
  for (const key of Object.keys(obj) as Array<keyof T>) {
    if (obj[key] !== undefined) {
      result[key] = obj[key];
    }
  }
  return result;
}

/**
 * Gets the current environment name from environment variables.
 * Checks NODE_ENV, AIGRC_ENV in order.
 */
export function getCurrentEnvironment(): string {
  return process.env.AIGRC_ENV ?? process.env.NODE_ENV ?? "development";
}

/**
 * Creates a default configuration
 */
export function createDefaultConfig(): AigrcConfig {
  return AigrcConfigSchema.parse({
    version: "1.0",
    runtime: {},
    integrations: {},
  });
}
