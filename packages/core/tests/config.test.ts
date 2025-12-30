import { describe, it, expect, beforeEach, afterEach } from "vitest";
import * as fs from "fs";
import * as path from "path";
import * as os from "os";
import {
  discoverConfig,
  discoverPolicies,
  discoverAssets,
  getEnvironmentConfig,
  getCurrentEnvironment,
  createDefaultConfig,
  CONFIG_FILE_NAMES,
  CONFIG_ENV_VAR,
} from "../src/config";
import type { AigrcConfig, PolicyFile, AssetCard } from "../src/schemas";

describe("Configuration Discovery", () => {
  let tempDir: string;
  let originalEnv: NodeJS.ProcessEnv;

  beforeEach(() => {
    // Create temp directory for tests
    tempDir = fs.mkdtempSync(path.join(os.tmpdir(), "aigrc-test-"));
    // Save original env
    originalEnv = { ...process.env };
  });

  afterEach(() => {
    // Clean up temp directory
    fs.rmSync(tempDir, { recursive: true, force: true });
    // Restore env
    process.env = originalEnv;
  });

  describe("discoverConfig", () => {
    it("should find config in current directory", () => {
      const configPath = path.join(tempDir, ".aigrc.yaml");
      const config: AigrcConfig = {
        version: "1.0",
        name: "Test Project",
      };
      fs.writeFileSync(configPath, `version: "1.0"\nname: Test Project`);

      const result = discoverConfig({ startDir: tempDir });

      expect(result).not.toBeNull();
      expect(result!.config.version).toBe("1.0");
      expect(result!.config.name).toBe("Test Project");
      expect(result!.configPath).toBe(configPath);
      expect(result!.fromEnv).toBe(false);
    });

    it("should find config in parent directory", () => {
      const childDir = path.join(tempDir, "child", "nested");
      fs.mkdirSync(childDir, { recursive: true });

      const configPath = path.join(tempDir, ".aigrc.yaml");
      fs.writeFileSync(configPath, `version: "1.0"\nname: Parent Config`);

      const result = discoverConfig({ startDir: childDir });

      expect(result).not.toBeNull();
      expect(result!.config.name).toBe("Parent Config");
      expect(result!.configPath).toBe(configPath);
    });

    it("should prefer explicit configPath", () => {
      const explicitPath = path.join(tempDir, "custom.yaml");
      fs.writeFileSync(explicitPath, `version: "1.0"\nname: Explicit Config`);

      // Also create a .aigrc.yaml that should be ignored
      fs.writeFileSync(
        path.join(tempDir, ".aigrc.yaml"),
        `version: "1.0"\nname: Default Config`
      );

      const result = discoverConfig({
        startDir: tempDir,
        configPath: explicitPath,
      });

      expect(result).not.toBeNull();
      expect(result!.config.name).toBe("Explicit Config");
    });

    it("should respect AIGRC_CONFIG_PATH environment variable", () => {
      const envPath = path.join(tempDir, "env-config.yaml");
      fs.writeFileSync(envPath, `version: "1.0"\nname: Env Config`);

      process.env[CONFIG_ENV_VAR] = envPath;

      const result = discoverConfig({ startDir: tempDir });

      expect(result).not.toBeNull();
      expect(result!.config.name).toBe("Env Config");
      expect(result!.fromEnv).toBe(true);
    });

    it("should return null when no config found", () => {
      const result = discoverConfig({ startDir: tempDir, maxDepth: 1 });
      expect(result).toBeNull();
    });

    it("should respect maxDepth", () => {
      const deepDir = path.join(tempDir, "a", "b", "c", "d");
      fs.mkdirSync(deepDir, { recursive: true });
      fs.writeFileSync(
        path.join(tempDir, ".aigrc.yaml"),
        `version: "1.0"`
      );

      // With maxDepth 2, shouldn't find config 4 levels up
      const resultShallow = discoverConfig({ startDir: deepDir, maxDepth: 2 });
      expect(resultShallow).toBeNull();

      // With maxDepth 5, should find it
      const resultDeep = discoverConfig({ startDir: deepDir, maxDepth: 5 });
      expect(resultDeep).not.toBeNull();
    });

    it("should try all config file names", () => {
      for (const fileName of CONFIG_FILE_NAMES) {
        // Clean up any existing configs
        for (const name of CONFIG_FILE_NAMES) {
          const p = path.join(tempDir, name);
          if (fs.existsSync(p)) fs.unlinkSync(p);
        }

        fs.writeFileSync(
          path.join(tempDir, fileName),
          `version: "1.0"\nname: "${fileName}"`
        );

        const result = discoverConfig({ startDir: tempDir });
        expect(result).not.toBeNull();
        expect(result!.config.name).toBe(fileName);
      }
    });
  });

  describe("discoverPolicies", () => {
    it("should discover policies in default path", () => {
      const policyDir = path.join(tempDir, ".aigrc", "policies");
      fs.mkdirSync(policyDir, { recursive: true });

      const policy: PolicyFile = {
        version: "1.0",
        id: "test-policy",
        name: "Test Policy",
        rules: [],
        applies_to: ["*"],
      };
      fs.writeFileSync(
        path.join(policyDir, "test.yaml"),
        `version: "1.0"\nid: test-policy\nname: Test Policy`
      );

      const result = discoverPolicies({ baseDir: tempDir });

      expect(result.policies.size).toBe(1);
      expect(result.policies.has("test-policy")).toBe(true);
      expect(result.loadedPaths).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should use config policy paths", () => {
      const customPolicyDir = path.join(tempDir, "custom-policies");
      fs.mkdirSync(customPolicyDir, { recursive: true });

      fs.writeFileSync(
        path.join(customPolicyDir, "custom.yaml"),
        `version: "1.0"\nid: custom-policy\nname: Custom Policy`
      );

      const config: AigrcConfig = {
        version: "1.0",
        runtime: {
          policy_paths: ["custom-policies"],
        },
      };

      const result = discoverPolicies({ baseDir: tempDir, config });

      expect(result.policies.has("custom-policy")).toBe(true);
    });

    it("should handle invalid policy files", () => {
      const policyDir = path.join(tempDir, ".aigrc", "policies");
      fs.mkdirSync(policyDir, { recursive: true });

      // Write invalid policy
      fs.writeFileSync(
        path.join(policyDir, "invalid.yaml"),
        `version: "2.0"\nid: invalid`
      );

      const result = discoverPolicies({ baseDir: tempDir });

      expect(result.policies.size).toBe(0);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0].path).toContain("invalid.yaml");
    });

    it("should load from additional paths", () => {
      const additionalDir = path.join(tempDir, "extra-policies");
      fs.mkdirSync(additionalDir, { recursive: true });

      fs.writeFileSync(
        path.join(additionalDir, "extra.yaml"),
        `version: "1.0"\nid: extra-policy\nname: Extra Policy`
      );

      const result = discoverPolicies({
        baseDir: tempDir,
        additionalPaths: [additionalDir],
      });

      expect(result.policies.has("extra-policy")).toBe(true);
    });
  });

  describe("discoverAssets", () => {
    const validAssetYaml = `
id: aigrc-2024-12345678
name: Test Asset
version: "1.0.0"
created: "2025-01-15T10:30:00Z"
updated: "2025-01-15T10:30:00Z"
ownership:
  owner:
    name: Test Owner
    email: test@example.com
technical:
  type: agent
classification:
  riskLevel: minimal
  riskFactors:
    autonomousDecisions: false
    customerFacing: false
    toolExecution: false
    externalDataAccess: false
    piiProcessing: "no"
    highStakesDecisions: false
intent:
  linked: false
governance:
  status: draft
  approvals: []
`;

    it("should discover assets in default path", () => {
      const assetDir = path.join(tempDir, ".aigrc", "assets");
      fs.mkdirSync(assetDir, { recursive: true });

      fs.writeFileSync(path.join(assetDir, "test-asset.yaml"), validAssetYaml);

      const result = discoverAssets({ baseDir: tempDir });

      expect(result.assets.size).toBe(1);
      expect(result.assets.has("aigrc-2024-12345678")).toBe(true);
      expect(result.loadedPaths).toHaveLength(1);
      expect(result.errors).toHaveLength(0);
    });

    it("should use config asset paths", () => {
      const customAssetDir = path.join(tempDir, "custom-assets");
      fs.mkdirSync(customAssetDir, { recursive: true });

      fs.writeFileSync(
        path.join(customAssetDir, "custom-asset.yaml"),
        validAssetYaml
      );

      const config: AigrcConfig = {
        version: "1.0",
        runtime: {
          asset_paths: ["custom-assets"],
        },
      };

      const result = discoverAssets({ baseDir: tempDir, config });

      expect(result.assets.has("aigrc-2024-12345678")).toBe(true);
    });

    it("should handle invalid asset files", () => {
      const assetDir = path.join(tempDir, ".aigrc", "assets");
      fs.mkdirSync(assetDir, { recursive: true });

      // Write invalid asset (missing required fields)
      fs.writeFileSync(
        path.join(assetDir, "invalid.yaml"),
        `id: invalid-format\nname: Invalid`
      );

      const result = discoverAssets({ baseDir: tempDir });

      expect(result.assets.size).toBe(0);
      expect(result.errors).toHaveLength(1);
    });
  });

  describe("getEnvironmentConfig", () => {
    it("should return base config when no environment overrides", () => {
      const config: AigrcConfig = {
        version: "1.0",
        name: "Test",
        runtime: {
          verification_failure_mode: "SANDBOX",
        },
      };

      const result = getEnvironmentConfig(config, "production");

      expect(result.runtime?.verification_failure_mode).toBe("SANDBOX");
    });

    it("should merge environment overrides", () => {
      const config: AigrcConfig = {
        version: "1.0",
        name: "Test",
        runtime: {
          verification_failure_mode: "SANDBOX",
          default_policy: "default",
        },
        environments: {
          production: {
            runtime: {
              verification_failure_mode: "FAIL",
            },
          },
        },
      };

      const result = getEnvironmentConfig(config, "production");

      // Override applied
      expect(result.runtime?.verification_failure_mode).toBe("FAIL");
      // Base preserved
      expect(result.runtime?.default_policy).toBe("default");
    });
  });

  describe("getCurrentEnvironment", () => {
    it("should use AIGRC_ENV first", () => {
      process.env.AIGRC_ENV = "staging";
      process.env.NODE_ENV = "production";

      expect(getCurrentEnvironment()).toBe("staging");
    });

    it("should fall back to NODE_ENV", () => {
      delete process.env.AIGRC_ENV;
      process.env.NODE_ENV = "production";

      expect(getCurrentEnvironment()).toBe("production");
    });

    it("should default to development", () => {
      delete process.env.AIGRC_ENV;
      delete process.env.NODE_ENV;

      expect(getCurrentEnvironment()).toBe("development");
    });
  });

  describe("createDefaultConfig", () => {
    it("should create valid default config", () => {
      const config = createDefaultConfig();

      expect(config.version).toBe("1.0");
      expect(config.runtime).toBeDefined();
      expect(config.integrations).toBeDefined();
    });
  });
});
