import { AssetCardSchema, type AssetCard } from "./schemas";
import { readFileSync, writeFileSync, existsSync, mkdirSync } from "fs";
import { dirname } from "path";
import YAML from "yaml";
import { randomBytes } from "crypto";

export interface CreateAssetCardOptions {
  name: string;
  description?: string;
  owner: {
    name: string;
    email: string;
    team?: string;
  };
  technical: {
    type: "model" | "agent" | "api_client" | "framework" | "pipeline";
    framework?: string;
    frameworkVersion?: string;
  };
  riskFactors?: {
    autonomousDecisions?: boolean;
    customerFacing?: boolean;
    toolExecution?: boolean;
    externalDataAccess?: boolean;
    piiProcessing?: "yes" | "no" | "unknown";
    highStakesDecisions?: boolean;
  };
}

export function generateAssetId(): string {
  const year = new Date().getFullYear();
  const random = randomBytes(4).toString("hex");
  return `aigrc-${year}-${random}`;
}

export function createAssetCard(options: CreateAssetCardOptions): AssetCard {
  const now = new Date().toISOString();
  const id = generateAssetId();

  const card: AssetCard = {
    $schema: "https://aigrc.dev/schemas/asset-card/v1",
    id,
    name: options.name,
    description: options.description,
    version: "1.0.0",
    created: now,
    updated: now,
    ownership: {
      owner: options.owner,
      team: options.owner.team,
    },
    technical: {
      type: options.technical.type,
      framework: options.technical.framework,
      frameworkVersion: options.technical.frameworkVersion,
    },
    classification: {
      riskLevel: "minimal",
      riskFactors: {
        autonomousDecisions: options.riskFactors?.autonomousDecisions ?? false,
        customerFacing: options.riskFactors?.customerFacing ?? false,
        toolExecution: options.riskFactors?.toolExecution ?? false,
        externalDataAccess: options.riskFactors?.externalDataAccess ?? false,
        piiProcessing: options.riskFactors?.piiProcessing ?? "unknown",
        highStakesDecisions: options.riskFactors?.highStakesDecisions ?? false,
      },
    },
    intent: {
      linked: false,
    },
    governance: {
      status: "draft",
      approvals: [],
    },
  };

  const result = AssetCardSchema.safeParse(card);
  if (!result.success) {
    throw new Error(`Invalid asset card: ${result.error.message}`);
  }

  return result.data;
}

export function loadAssetCard(filePath: string): AssetCard {
  if (!existsSync(filePath)) {
    throw new Error(`Asset card not found: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  const data = YAML.parse(content);

  const result = AssetCardSchema.safeParse(data);
  if (!result.success) {
    throw new Error(`Invalid asset card at ${filePath}: ${result.error.message}`);
  }

  return result.data;
}

export function saveAssetCard(card: AssetCard, filePath: string): void {
  const result = AssetCardSchema.safeParse(card);
  if (!result.success) {
    throw new Error(`Invalid asset card: ${result.error.message}`);
  }

  const dir = dirname(filePath);
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true });
  }

  card.updated = new Date().toISOString();

  const content = YAML.stringify(card, { indent: 2, lineWidth: 100 });
  writeFileSync(filePath, content, "utf-8");
}

export function validateAssetCard(card: unknown): { valid: boolean; errors?: string[] } {
  const result = AssetCardSchema.safeParse(card);
  if (result.success) {
    return { valid: true };
  }
  return {
    valid: false,
    errors: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`),
  };
}