// ─────────────────────────────────────────────────────────────────
// PangoGuard — App-specific types
// ─────────────────────────────────────────────────────────────────

import type {
  ScanResult,
  ClassificationResult,
  DetectionResult,
  AssetCard,
  ConfidenceLevel,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// RISK TIERS (App Layer)
// Maps core risk levels to L0-L3 tier system
// ─────────────────────────────────────────────────────────────────

export type RiskTier = "L0" | "L1" | "L2" | "L3";
export type TierLabel = "MINIMAL" | "LIMITED" | "HIGH" | "UNACCEPTABLE";

export const TIER_MAP: Record<RiskTier, TierLabel> = {
  L0: "MINIMAL",
  L1: "LIMITED",
  L2: "HIGH",
  L3: "UNACCEPTABLE",
};

export const TIER_ICONS: Record<RiskTier, string> = {
  L0: "\u2705",  // ✅
  L1: "\u2139\uFE0F",  // ℹ️
  L2: "\u26A0\uFE0F",  // ⚠️
  L3: "\uD83D\uDEA8",  // 🚨
};

// ─────────────────────────────────────────────────────────────────
// AGENTIC PATTERN DETECTION
// ─────────────────────────────────────────────────────────────────

export interface AgenticElevation {
  /** Pattern identifier */
  pattern: string;
  /** Human-readable indicator description */
  indicator: string;
  /** Risk tier elevation: +1 or +2 */
  riskElevation: number;
  /** Whether this pattern is critically flagged */
  critical: boolean;
  /** File path where detected */
  filePath: string;
  /** Line number where detected */
  line: number;
}

// ─────────────────────────────────────────────────────────────────
// REGULATORY MAPPING
// ─────────────────────────────────────────────────────────────────

export interface EuAiActMapping {
  classification: string;
  articles: string[];
  obligations: string[];
}

export interface NistRmfMapping {
  functions: string[];
  subcategories: string[];
  actions: string[];
}

export interface Iso42001Mapping {
  clauses: string[];
  obligations: string[];
  controls: string[];
}

export interface SectorMapping {
  regulation: string;
  applicableStandards: string[];
  requirements: string[];
  triggerReason: string;
}

export interface RegulatoryMapping {
  euAiAct: EuAiActMapping;
  nistRmf: NistRmfMapping;
  iso42001: Iso42001Mapping;
  sectorSpecific?: SectorMapping[];
}

// ─────────────────────────────────────────────────────────────────
// APP SCAN RESULT (extends core ScanResult)
// ─────────────────────────────────────────────────────────────────

export interface AppScanResult {
  /** Core scan result from @aigrc/core */
  scanResult: ScanResult;
  /** Core classification result */
  classification: ClassificationResult;
  /** Mapped risk tier (L0-L3) */
  tier: RiskTier;
  /** Human-readable tier label */
  tierLabel: TierLabel;
  /** Agentic pattern elevations applied */
  agenticElevations: AgenticElevation[];
  /** Regulatory framework mapping */
  regulatoryMapping: RegulatoryMapping;
  /** Detected AI capabilities (e.g., "tool execution", "external API access") */
  detectedCapabilities: string[];
  /** Current governance status */
  governanceStatus: "ungoverned" | "card_created" | "approved";
  /** Existing asset card if found */
  existingCard?: AssetCard;
  /** Minimum confidence level that was applied as filter */
  confidenceThreshold: ConfidenceLevel;
}

// ─────────────────────────────────────────────────────────────────
// TIER CLASSIFICATION RESULT
// ─────────────────────────────────────────────────────────────────

export interface TierClassificationResult {
  tier: RiskTier;
  tierLabel: TierLabel;
  baseTier: RiskTier;
  elevatedBy: number;
  reasons: string[];
}

// ─────────────────────────────────────────────────────────────────
// WEBHOOK EVENT PAYLOADS
// ─────────────────────────────────────────────────────────────────

export interface PullRequestEventData {
  owner: string;
  repo: string;
  prNumber: number;
  headSha: string;
  action: "opened" | "synchronize" | "reopened";
  installationId: number;
}

export interface PushEventData {
  owner: string;
  repo: string;
  ref: string;
  headSha: string;
  defaultBranch: string;
  installationId: number;
  commits: Array<{
    id: string;
    added: string[];
    modified: string[];
    removed: string[];
  }>;
}

export interface InstallationEventData {
  installationId: number;
  action: "created" | "deleted" | "suspend" | "unsuspend";
  account: {
    login: string;
    type: "Organization" | "User";
  };
  repositories: Array<{
    id: number;
    name: string;
    fullName: string;
    private: boolean;
  }>;
}

// ─────────────────────────────────────────────────────────────────
// INSTRUMENTATION OUTPUT
// ─────────────────────────────────────────────────────────────────

export interface InstrumentationOutput {
  /** Target file path (e.g., .aigrc/instrumentation/xxx.governed.ts) */
  filePath: string;
  /** Generated wrapper code content */
  content: string;
  /** Detected framework */
  framework: string;
  /** Target language */
  language: "typescript" | "python";
  /** Asset ID placeholder or real ID */
  assetId: string;
}

// ─────────────────────────────────────────────────────────────────
// ISSUE CREATION
// ─────────────────────────────────────────────────────────────────

export type IssueType =
  | "ungoverned_asset"
  | "shadow_inventory"
  | "ciso_alert"
  | "weekly_report";

export interface IssueData {
  type: IssueType;
  title: string;
  body: string;
  labels: string[];
  assignees?: string[];
}

// ─────────────────────────────────────────────────────────────────
// PERSISTENCE MODELS
// ─────────────────────────────────────────────────────────────────

export interface InstallationRecord {
  id?: string;
  github_installation_id: number;
  github_org_login: string;
  github_org_type: "Organization" | "User";
  plan: Record<string, unknown>;
  installed_at: string;
  updated_at: string;
}

export interface ScanResultRecord {
  id?: string;
  installation_id: string;
  repo_full_name: string;
  pr_number?: number;
  commit_sha: string;
  scan_type: "pr_diff" | "push" | "full_repo" | "scheduled";
  detections: Record<string, unknown>;
  risk_summary: Record<string, unknown>;
  created_at: string;
}

export interface AssetInventoryRecord {
  id?: string;
  installation_id: string;
  repo_full_name: string;
  file_path: string;
  asset_type: string;
  framework: string;
  risk_tier: RiskTier;
  governance_status: "ungoverned" | "card_created" | "approved";
  first_detected_at: string;
  last_seen_at: string;
  metadata?: Record<string, unknown>;
}
