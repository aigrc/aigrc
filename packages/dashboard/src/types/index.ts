/**
 * AIGRC Dashboard Type Definitions
 *
 * Core types for the governance dashboard, aligned with @aigrc/core schemas.
 */

// ============================================================================
// Risk Classification Types
// ============================================================================

export type RiskLevel = 'minimal' | 'limited' | 'high' | 'unacceptable';

export type ComplianceStatus = 'compliant' | 'partial' | 'noncompliant';

export interface RiskFactors {
  autonomousDecisionMaking: boolean;
  customerFacing: boolean;
  toolExecution: boolean;
  externalDataAccess: boolean;
  piiProcessing: boolean;
  highStakesDeterminations: boolean;
}

// ============================================================================
// Asset Card Types
// ============================================================================

export interface AssetCardOwner {
  name: string;
  email: string;
  team?: string;
  department?: string;
}

export interface AssetCardTechnical {
  framework: string;
  version?: string;
  language: string;
  modelType?: string;
  deploymentEnvironment?: string;
}

export interface AssetCard {
  id: string;
  name: string;
  description: string;
  owner: AssetCardOwner;
  technical: AssetCardTechnical;
  riskFactors: RiskFactors;
  riskLevel: RiskLevel;
  complianceProfiles: string[];
  goldenThreadHash?: string;
  createdAt: string;
  updatedAt: string;
  status: 'draft' | 'active' | 'archived';
}

// ============================================================================
// Detection Types
// ============================================================================

export interface DetectedFramework {
  name: string;
  version?: string;
  language: 'python' | 'javascript' | 'typescript';
  confidence: number;
  filePath: string;
  lineNumber?: number;
}

export interface DetectionResult {
  scanId: string;
  projectPath: string;
  frameworks: DetectedFramework[];
  modelFiles: string[];
  suggestedRiskLevel: RiskLevel;
  scanDuration: number;
  timestamp: string;
}

// ============================================================================
// Policy Types
// ============================================================================

export interface PolicyRule {
  id: string;
  name: string;
  description: string;
  severity: 'info' | 'warning' | 'error' | 'critical';
  enabled: boolean;
}

export interface Policy {
  id: string;
  name: string;
  description: string;
  version: string;
  rules: PolicyRule[];
  complianceProfile: string;
  createdAt: string;
  updatedAt: string;
}

export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: PolicyRule['severity'];
  message: string;
  assetId: string;
  filePath?: string;
  lineNumber?: number;
  timestamp: string;
}

// ============================================================================
// Compliance Types
// ============================================================================

export interface ComplianceProfile {
  id: string;
  name: string;
  description: string;
  standard: string; // e.g., 'eu-ai-act', 'nist-ai-rmf', 'cmmc'
  version: string;
  controls: ComplianceControl[];
}

export interface ComplianceControl {
  id: string;
  name: string;
  description: string;
  category: string;
  status: ComplianceStatus;
  evidence?: string[];
  lastAssessed?: string;
}

export interface ComplianceAssessment {
  id: string;
  profileId: string;
  assetId: string;
  overallStatus: ComplianceStatus;
  controlResults: {
    controlId: string;
    status: ComplianceStatus;
    findings: string[];
  }[];
  assessedAt: string;
  assessedBy: string;
}

// ============================================================================
// Runtime Governance Types (AIGOS)
// ============================================================================

export interface RuntimeAgent {
  instanceId: string;
  assetId: string;
  name: string;
  status: 'active' | 'suspended' | 'terminated';
  operatingMode: 'normal' | 'sandbox' | 'restricted';
  capabilities: string[];
  budgetRemaining: number;
  budgetTotal: number;
  parentId?: string;
  createdAt: string;
  lastActivity: string;
}

export interface KillSwitchCommand {
  id: string;
  agentInstanceId: string;
  command: 'terminate' | 'pause' | 'resume';
  reason: string;
  issuedBy: string;
  issuedAt: string;
  executedAt?: string;
  status: 'pending' | 'executed' | 'failed';
}

export interface PolicyDecision {
  id: string;
  agentInstanceId: string;
  action: string;
  resource: string;
  decision: 'allow' | 'deny';
  reason: string;
  cost?: number;
  timestamp: string;
  evaluationTimeMs: number;
}

// ============================================================================
// User and Organization Types
// ============================================================================

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
  organizationId: string;
  permissions: string[];
  createdAt: string;
  lastLogin?: string;
}

export type UserRole =
  | 'super_admin'
  | 'owner'
  | 'admin'
  | 'manager'
  | 'user'
  | 'viewer';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  settings: OrganizationSettings;
  createdAt: string;
}

export interface OrganizationSettings {
  defaultRiskThreshold: RiskLevel;
  complianceProfiles: string[];
  notificationsEnabled: boolean;
  auditLoggingEnabled: boolean;
}

// ============================================================================
// Dashboard Analytics Types
// ============================================================================

export interface DashboardMetrics {
  totalAssets: number;
  assetsByRiskLevel: Record<RiskLevel, number>;
  complianceScore: number;
  activeAgents: number;
  policyViolationsLast24h: number;
  detectionScansLast7d: number;
}

export interface TimeSeriesDataPoint {
  timestamp: string;
  value: number;
}

export interface ComplianceTrend {
  profileId: string;
  profileName: string;
  dataPoints: TimeSeriesDataPoint[];
}

// ============================================================================
// API Response Types
// ============================================================================

export interface PaginatedResponse<T> {
  data: T[];
  total: number;
  page: number;
  pageSize: number;
  hasMore: boolean;
}

export interface ApiError {
  code: string;
  message: string;
  details?: Record<string, unknown>;
}

export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: ApiError;
}
