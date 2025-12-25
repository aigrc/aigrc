/**
 * Cards Service
 *
 * Manages asset card CRUD operations.
 */

import {
  type AssetCard,
  AssetCardSchema,
  loadAssetCard,
  saveAssetCard,
  createAssetCard,
  validateAssetCard,
  generateAssetId,
} from "@aigrc/core";
import { AIGRCConfig } from "../config.js";
import * as fs from "fs/promises";
import * as path from "path";
import { glob } from "glob";

export interface CardFilter {
  riskLevel?: "minimal" | "limited" | "high" | "unacceptable";
  profile?: string;
  classification?: string;
  type?: string;
  framework?: string;
}

export class CardsService {
  constructor(private config: AIGRCConfig) {}

  /**
   * Get the cards directory path
   */
  private getCardsPath(directory?: string): string {
    const base = directory || this.config.workspace;
    return path.resolve(base, this.config.cardsDir);
  }

  /**
   * List all asset cards
   */
  async list(directory?: string, filter?: CardFilter): Promise<AssetCard[]> {
    const cardsPath = this.getCardsPath(directory);

    try {
      await fs.access(cardsPath);
    } catch {
      return [];
    }

    const pattern = path.join(cardsPath, "*.yaml").replace(/\\/g, "/");
    const files = await glob(pattern);
    const cards: AssetCard[] = [];

    for (const file of files) {
      try {
        const card = loadAssetCard(file);
        if (this.matchesFilter(card, filter)) {
          cards.push(card);
        }
      } catch (error) {
        // Skip invalid cards
        console.error(`Failed to parse card: ${file}`, error);
      }
    }

    // Sort by risk level (highest first)
    const riskOrder = { unacceptable: 0, high: 1, limited: 2, minimal: 3 };
    cards.sort(
      (a, b) =>
        (riskOrder[a.classification.riskLevel] || 4) -
        (riskOrder[b.classification.riskLevel] || 4)
    );

    return cards;
  }

  /**
   * Get a specific asset card by ID
   */
  async get(id: string, directory?: string): Promise<AssetCard | null> {
    const cardsPath = this.getCardsPath(directory);

    // Try direct file match first
    const cardFile = path.join(cardsPath, `${id}.yaml`);
    try {
      return loadAssetCard(cardFile);
    } catch {
      // Try finding by name or ID pattern
      const pattern = path.join(cardsPath, "*.yaml").replace(/\\/g, "/");
      const files = await glob(pattern);

      for (const file of files) {
        try {
          const card = loadAssetCard(file);
          if (card.name === id || card.id === id) {
            return card;
          }
        } catch {
          continue;
        }
      }

      return null;
    }
  }

  /**
   * Create a new asset card
   */
  async create(
    options: {
      name: string;
      description?: string;
      owner: { name: string; email: string; team?: string };
      type: "model" | "agent" | "api_client" | "framework" | "pipeline";
      framework?: string;
      riskFactors?: {
        autonomousDecisions?: boolean;
        customerFacing?: boolean;
        toolExecution?: boolean;
        externalDataAccess?: boolean;
        piiProcessing?: "yes" | "no" | "unknown";
        highStakesDecisions?: boolean;
      };
    },
    directory?: string
  ): Promise<string> {
    const cardsPath = this.getCardsPath(directory);

    // Ensure directory exists
    await fs.mkdir(cardsPath, { recursive: true });

    // Create the card using core function
    const card = createAssetCard({
      name: options.name,
      description: options.description,
      owner: options.owner,
      technical: {
        type: options.type,
        framework: options.framework,
      },
      riskFactors: options.riskFactors,
    });

    // Save to file
    const cardFile = path.join(cardsPath, `${card.id}.yaml`);
    saveAssetCard(card, cardFile);

    return card.id;
  }

  /**
   * Update an existing asset card
   */
  async update(
    id: string,
    updates: Partial<AssetCard>,
    directory?: string
  ): Promise<AssetCard> {
    const existing = await this.get(id, directory);
    if (!existing) {
      throw new Error(`Asset card not found: ${id}`);
    }

    const updated: AssetCard = {
      ...existing,
      ...updates,
      updated: new Date().toISOString(),
    };

    // Validate
    const validation = validateAssetCard(updated);
    if (!validation.valid) {
      throw new Error(`Invalid asset card: ${validation.errors?.join(", ")}`);
    }

    // Save
    const cardsPath = this.getCardsPath(directory);
    const cardFile = path.join(cardsPath, `${id}.yaml`);
    saveAssetCard(updated, cardFile);

    return updated;
  }

  /**
   * Delete an asset card
   */
  async delete(id: string, directory?: string): Promise<boolean> {
    const cardsPath = this.getCardsPath(directory);
    const cardFile = path.join(cardsPath, `${id}.yaml`);

    try {
      await fs.unlink(cardFile);
      return true;
    } catch {
      return false;
    }
  }

  /**
   * Validate an asset card
   */
  validate(card: unknown): { valid: boolean; errors: string[] } {
    const result = validateAssetCard(card);
    return {
      valid: result.valid,
      errors: result.errors || [],
    };
  }

  /**
   * Format cards as markdown
   */
  formatCardsList(cards: AssetCard[]): string {
    if (cards.length === 0) {
      return "No asset cards found.\n";
    }

    const lines: string[] = [];
    lines.push("## Asset Cards\n");
    lines.push(`**Total:** ${cards.length} asset(s)\n`);
    lines.push("| Name | Type | Framework | Risk Level | Status |");
    lines.push("|------|------|-----------|------------|--------|");

    for (const card of cards) {
      const euCategory = card.classification.euAiAct?.category || "-";
      lines.push(
        `| ${card.name} | ${card.technical.type} | ${card.technical.framework || "-"} | ${card.classification.riskLevel} | ${card.governance.status} |`
      );
    }

    return lines.join("\n");
  }

  /**
   * Format single card as markdown
   */
  formatCard(card: AssetCard): string {
    const lines: string[] = [];

    lines.push(`## ${card.name}\n`);
    lines.push(`**ID:** ${card.id}`);
    lines.push(`**Version:** ${card.version}`);
    lines.push(`**Status:** ${card.governance.status}`);
    lines.push(`**Owner:** ${card.ownership.owner.name} <${card.ownership.owner.email}>\n`);

    if (card.description) {
      lines.push(`**Description:** ${card.description}\n`);
    }

    lines.push("### Technical Details\n");
    lines.push(`- **Type:** ${card.technical.type}`);
    if (card.technical.framework) {
      lines.push(`- **Framework:** ${card.technical.framework}`);
    }
    if (card.technical.frameworkVersion) {
      lines.push(`- **Framework Version:** ${card.technical.frameworkVersion}`);
    }

    lines.push("\n### Risk Factors\n");
    const rf = card.classification.riskFactors;
    lines.push(`- Autonomous Decisions: ${rf.autonomousDecisions ? "Yes" : "No"}`);
    lines.push(`- Customer Facing: ${rf.customerFacing ? "Yes" : "No"}`);
    lines.push(`- Tool Execution: ${rf.toolExecution ? "Yes" : "No"}`);
    lines.push(`- External Data Access: ${rf.externalDataAccess ? "Yes" : "No"}`);
    lines.push(`- PII Processing: ${rf.piiProcessing}`);
    lines.push(`- High-Stakes Decisions: ${rf.highStakesDecisions ? "Yes" : "No"}`);

    lines.push("\n### Classification\n");
    lines.push(`- **Risk Level:** ${card.classification.riskLevel.toUpperCase()}`);
    if (card.classification.euAiAct) {
      lines.push(`- **EU AI Act Category:** ${card.classification.euAiAct.category}`);
      if (card.classification.euAiAct.transparencyRequired) {
        lines.push(`- **Transparency Required:** Yes`);
      }
    }

    if (card.classification.requiredArtifacts?.length) {
      lines.push("\n### Required Artifacts\n");
      for (const artifact of card.classification.requiredArtifacts) {
        const status = artifact.status === "complete" ? "[OK]" : artifact.status === "pending" ? "[PENDING]" : "[N/A]";
        lines.push(`- ${status} ${artifact.type}`);
      }
    }

    if (card.intent.linked) {
      lines.push("\n### Intent (Golden Thread)\n");
      if (card.intent.ticketId) {
        lines.push(`- **Ticket:** ${card.intent.ticketId}`);
      }
      if (card.intent.businessJustification) {
        lines.push(`- **Justification:** ${card.intent.businessJustification}`);
      }
      if (card.intent.riskTolerance) {
        lines.push(`- **Risk Tolerance:** ${card.intent.riskTolerance}`);
      }
    }

    if (card.constraints) {
      lines.push("\n### Constraints\n");
      if (card.constraints.runtime) {
        if (card.constraints.runtime.maxIterations) {
          lines.push(`- Max Iterations: ${card.constraints.runtime.maxIterations}`);
        }
        if (card.constraints.runtime.timeoutSeconds) {
          lines.push(`- Timeout: ${card.constraints.runtime.timeoutSeconds}s`);
        }
      }
      if (card.constraints.humanApprovalRequired?.length) {
        lines.push(`- Human Approval Required: ${card.constraints.humanApprovalRequired.join(", ")}`);
      }
    }

    return lines.join("\n");
  }

  /**
   * Check if card matches filter
   */
  private matchesFilter(card: AssetCard, filter?: CardFilter): boolean {
    if (!filter) return true;

    if (filter.riskLevel && card.classification.riskLevel !== filter.riskLevel) {
      return false;
    }

    if (filter.type && card.technical.type !== filter.type) {
      return false;
    }

    if (filter.framework && card.technical.framework !== filter.framework) {
      return false;
    }

    return true;
  }
}
