/**
 * AIGRC MCP Resources
 *
 * Resources expose data for AI assistants to read.
 */

import { AIGRCConfig } from "../config.js";
import { Services } from "../services/index.js";

export interface ResourceDefinition {
  uri: string;
  name: string;
  description: string;
  mimeType: string;
}

export interface ResourceContent {
  contents: Array<{
    uri: string;
    mimeType: string;
    text: string;
  }>;
}

/**
 * Get all available resources
 */
export async function getResources(
  services: Services,
  config: AIGRCConfig
): Promise<ResourceDefinition[]> {
  const resources: ResourceDefinition[] = [
    {
      uri: "aigrc://cards",
      name: "Asset Cards",
      description: "List of all registered AI asset cards",
      mimeType: "application/json",
    },
    {
      uri: "aigrc://config",
      name: "Configuration",
      description: "AIGRC configuration including active profiles",
      mimeType: "application/json",
    },
    {
      uri: "aigrc://profiles",
      name: "Compliance Profiles",
      description: "Available compliance profiles",
      mimeType: "application/json",
    },
  ];

  // Add dynamic card resources
  const cards = await services.cards.list();
  for (const card of cards) {
    const id = card.id || card.name;
    resources.push({
      uri: `aigrc://cards/${id}`,
      name: card.name,
      description: `Asset card: ${card.description || card.technical.type}`,
      mimeType: "application/json",
    });

    // Add compliance resource for each card
    resources.push({
      uri: `aigrc://compliance/${id}`,
      name: `Compliance: ${card.name}`,
      description: `Compliance status across all profiles`,
      mimeType: "application/json",
    });

    // Add crosswalk resource for each card
    resources.push({
      uri: `aigrc://crosswalk/${id}`,
      name: `Crosswalk: ${card.name}`,
      description: `Cross-framework mapping`,
      mimeType: "application/json",
    });

    // Add red team resource if enabled
    if (config.redTeamEnabled) {
      resources.push({
        uri: `aigrc://redteam/${id}`,
        name: `Red Team: ${card.name}`,
        description: `Red team status and findings`,
        mimeType: "application/json",
      });
    }
  }

  // Add profile resources
  const profiles = services.profiles.list();
  for (const profile of profiles) {
    resources.push({
      uri: `aigrc://profiles/${profile.id}`,
      name: profile.name,
      description: profile.description,
      mimeType: "application/json",
    });
  }

  return resources;
}

/**
 * Read a resource by URI
 */
export async function readResource(
  uri: string,
  services: Services,
  config: AIGRCConfig
): Promise<ResourceContent> {
  const parsed = parseResourceUri(uri);

  switch (parsed.type) {
    case "cards": {
      if (parsed.id) {
        const card = await services.cards.get(parsed.id);
        if (!card) {
          throw new Error(`Asset card not found: ${parsed.id}`);
        }
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(card, null, 2),
            },
          ],
        };
      }

      const cards = await services.cards.list();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              cards.map((c) => ({
                id: c.id || c.name,
                name: c.name,
                type: c.technical.type,
                framework: c.technical.framework,
                riskLevel: c.classification?.riskLevel,
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case "config": {
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              {
                workspace: config.workspace,
                cardsDir: config.cardsDir,
                profiles: config.profiles,
                redTeamEnabled: config.redTeamEnabled,
                logLevel: config.logLevel,
              },
              null,
              2
            ),
          },
        ],
      };
    }

    case "profiles": {
      if (parsed.id) {
        const profile = services.profiles.get(parsed.id);
        if (!profile) {
          throw new Error(`Profile not found: ${parsed.id}`);
        }
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(profile, null, 2),
            },
          ],
        };
      }

      const profiles = services.profiles.list();
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(
              profiles.map((p) => ({
                id: p.id,
                name: p.name,
                version: p.version,
                jurisdiction: p.jurisdiction,
                active: config.profiles.includes(p.id),
              })),
              null,
              2
            ),
          },
        ],
      };
    }

    case "compliance": {
      if (!parsed.id) {
        throw new Error("Asset ID required for compliance resource");
      }

      const card = await services.cards.get(parsed.id);
      if (!card) {
        throw new Error(`Asset card not found: ${parsed.id}`);
      }

      const statuses = services.compliance.checkAllProfiles(card);
      const result: Record<string, unknown> = {
        assetId: parsed.id,
        profiles: {},
        overallCompliance: true,
      };

      for (const status of statuses) {
        (result.profiles as Record<string, unknown>)[status.profileId] = {
          compliant: status.compliant,
          percentage: status.percentage,
          gaps: status.gaps.length,
        };
        if (!status.compliant) {
          result.overallCompliance = false;
        }
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    }

    case "crosswalk": {
      if (!parsed.id) {
        throw new Error("Asset ID required for crosswalk resource");
      }

      const card = await services.cards.get(parsed.id);
      if (!card) {
        throw new Error(`Asset card not found: ${parsed.id}`);
      }

      const crosswalk = services.crosswalk.getCrosswalk(card);
      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(crosswalk, null, 2),
          },
        ],
      };
    }

    case "redteam": {
      if (!config.redTeamEnabled) {
        throw new Error("Red team integration is not enabled");
      }

      if (!parsed.id) {
        throw new Error("Asset ID required for red team resource");
      }

      const status = await services.redTeam.getStatus(parsed.id);

      if (parsed.subpath === "findings") {
        const findings = await services.redTeam.getFindings(parsed.id);
        return {
          contents: [
            {
              uri,
              mimeType: "application/json",
              text: JSON.stringify(findings, null, 2),
            },
          ],
        };
      }

      return {
        contents: [
          {
            uri,
            mimeType: "application/json",
            text: JSON.stringify(status, null, 2),
          },
        ],
      };
    }

    default:
      throw new Error(`Unknown resource type: ${uri}`);
  }
}

interface ParsedUri {
  type: string;
  id?: string;
  subpath?: string;
}

function parseResourceUri(uri: string): ParsedUri {
  // Remove aigrc:// prefix
  const path = uri.replace("aigrc://", "");
  const parts = path.split("/");

  return {
    type: parts[0],
    id: parts[1],
    subpath: parts[2],
  };
}
