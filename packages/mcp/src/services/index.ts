/**
 * AIGRC MCP Services Layer
 *
 * Services provide the business logic for tools, resources, and prompts.
 */

import { AIGRCConfig } from "../config.js";
import { ScannerService } from "./scanner.js";
import { CardsService } from "./cards.js";
import { ClassifyService } from "./classify.js";
import { ProfileService } from "./profiles.js";
import { ComplianceService } from "./compliance.js";
import { CrosswalkService } from "./crosswalk.js";
import { RedTeamService } from "./redteam.js";
import { ReportsService } from "./reports.js";
import { CheckpointService, createCheckpointService } from "./checkpoint.js";
import { PolicyService, createPolicyService } from "./policy.js";
import { GoldenThreadService, createGoldenThreadService } from "./golden-thread.js";

export interface Services {
  scanner: ScannerService;
  cards: CardsService;
  classify: ClassifyService;
  profiles: ProfileService;
  compliance: ComplianceService;
  crosswalk: CrosswalkService;
  redTeam: RedTeamService;
  reports: ReportsService;
  checkpoint: CheckpointService;
  policy: PolicyService;
  goldenThread: GoldenThreadService;
}

/**
 * Create all services with shared configuration
 */
export function createServices(config: AIGRCConfig): Services {
  const scanner = new ScannerService(config);
  const cards = new CardsService(config);
  const classify = new ClassifyService(config);
  const profiles = new ProfileService(config);
  const compliance = new ComplianceService(config, profiles);
  const crosswalk = new CrosswalkService(config, profiles);
  const redTeam = new RedTeamService(config);
  const reports = new ReportsService(config, cards, compliance, redTeam);
  const policy = createPolicyService(config);

  // Create golden thread service
  const goldenThread = createGoldenThreadService(config, cards);

  // Services that need access to other services
  const baseServices: Omit<Services, "checkpoint"> = {
    scanner,
    cards,
    classify,
    profiles,
    compliance,
    crosswalk,
    redTeam,
    reports,
    policy,
    goldenThread,
  };

  // Create checkpoint service with reference to other services
  const checkpoint = createCheckpointService(baseServices as Services, config);

  return {
    ...baseServices,
    checkpoint,
  };
}

// Re-export service classes
export { ScannerService } from "./scanner.js";
export { CardsService } from "./cards.js";
export { ClassifyService } from "./classify.js";
export { ProfileService } from "./profiles.js";
export { ComplianceService } from "./compliance.js";
export { CrosswalkService } from "./crosswalk.js";
export { RedTeamService } from "./redteam.js";
export { ReportsService } from "./reports.js";
export { CheckpointService, createCheckpointService } from "./checkpoint.js";
export { PolicyService, createPolicyService } from "./policy.js";
export { GoldenThreadService, createGoldenThreadService } from "./golden-thread.js";
