/**
 * Mock Data for AIGRC Dashboard Development
 *
 * This file provides realistic mock data for developing and testing
 * the dashboard without requiring a backend connection.
 */

import type {
  AssetCard,
  DetectionResult,
  PolicyRule,
  ComplianceAssessment,
  RuntimeAgent,
  User,
  Organization,
  DashboardMetrics,
  RiskLevel,
  ComplianceStatus,
} from '@/types';

// Helper to generate UUIDs
const uuid = () => crypto.randomUUID?.() || `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

// Mock Organizations
export const mockOrganizations: Organization[] = [
  {
    id: uuid(),
    name: 'Acme Corporation',
    slug: 'acme-corp',
    plan: 'enterprise',
    settings: {
      defaultRiskThreshold: 'high',
      requireApprovalForHighRisk: true,
      autoScanEnabled: true,
    },
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2025-01-10T14:30:00Z',
  },
];

// Mock Users
export const mockUsers: User[] = [
  {
    id: uuid(),
    email: 'sarah.chen@acme.com',
    name: 'Sarah Chen',
    role: 'admin',
    organizationId: mockOrganizations[0].id,
    permissions: ['assets:read', 'assets:write', 'policies:read', 'policies:write', 'runtime:admin'],
    createdAt: '2024-01-15T08:00:00Z',
    lastLoginAt: '2025-01-22T09:00:00Z',
  },
  {
    id: uuid(),
    email: 'james.wilson@acme.com',
    name: 'James Wilson',
    role: 'analyst',
    organizationId: mockOrganizations[0].id,
    permissions: ['assets:read', 'policies:read', 'runtime:read'],
    createdAt: '2024-03-20T10:00:00Z',
    lastLoginAt: '2025-01-21T16:45:00Z',
  },
];

// Mock Assets (AI Systems)
export const mockAssets: AssetCard[] = [
  {
    id: uuid(),
    name: 'Customer Support Chatbot',
    description: 'AI-powered customer service assistant for handling tier-1 support queries',
    type: 'agent',
    riskLevel: 'limited',
    complianceStatus: 'compliant',
    complianceScore: 92,
    frameworks: ['langchain', 'openai'],
    version: '2.1.0',
    owner: 'Sarah Chen',
    department: 'Customer Success',
    tags: ['production', 'customer-facing', 'chatbot'],
    lastScanned: '2025-01-22T08:00:00Z',
    createdAt: '2024-06-15T10:00:00Z',
    updatedAt: '2025-01-20T14:30:00Z',
  },
  {
    id: uuid(),
    name: 'Resume Screening Agent',
    description: 'Automated resume analysis and candidate ranking system for HR',
    type: 'agent',
    riskLevel: 'high',
    complianceStatus: 'partial',
    complianceScore: 68,
    frameworks: ['anthropic', 'llamaindex'],
    version: '1.3.2',
    owner: 'James Wilson',
    department: 'Human Resources',
    tags: ['staging', 'hr', 'hiring'],
    lastScanned: '2025-01-21T16:00:00Z',
    createdAt: '2024-09-01T09:00:00Z',
    updatedAt: '2025-01-21T16:00:00Z',
  },
  {
    id: uuid(),
    name: 'Financial Forecasting Model',
    description: 'ML model for quarterly revenue predictions and budget planning',
    type: 'model',
    riskLevel: 'high',
    complianceStatus: 'compliant',
    complianceScore: 88,
    frameworks: ['pytorch', 'sklearn'],
    version: '3.0.1',
    owner: 'Sarah Chen',
    department: 'Finance',
    tags: ['production', 'finance', 'forecasting'],
    lastScanned: '2025-01-22T06:00:00Z',
    createdAt: '2024-02-10T11:00:00Z',
    updatedAt: '2025-01-15T09:00:00Z',
  },
  {
    id: uuid(),
    name: 'Document Classification Pipeline',
    description: 'Automated document categorization for legal and compliance teams',
    type: 'pipeline',
    riskLevel: 'minimal',
    complianceStatus: 'compliant',
    complianceScore: 95,
    frameworks: ['huggingface', 'spacy'],
    version: '1.0.5',
    owner: 'James Wilson',
    department: 'Legal',
    tags: ['production', 'legal', 'classification'],
    lastScanned: '2025-01-22T07:30:00Z',
    createdAt: '2024-08-20T14:00:00Z',
    updatedAt: '2025-01-18T11:00:00Z',
  },
  {
    id: uuid(),
    name: 'Fraud Detection System',
    description: 'Real-time transaction monitoring and fraud alert system',
    type: 'model',
    riskLevel: 'high',
    complianceStatus: 'compliant',
    complianceScore: 91,
    frameworks: ['tensorflow', 'keras'],
    version: '4.2.0',
    owner: 'Sarah Chen',
    department: 'Risk Management',
    tags: ['production', 'security', 'real-time'],
    lastScanned: '2025-01-22T05:00:00Z',
    createdAt: '2023-11-05T08:00:00Z',
    updatedAt: '2025-01-10T10:00:00Z',
  },
  {
    id: uuid(),
    name: 'Social Scoring Prototype',
    description: 'Experimental user behavior scoring system - FLAGGED FOR REVIEW',
    type: 'agent',
    riskLevel: 'unacceptable',
    complianceStatus: 'noncompliant',
    complianceScore: 15,
    frameworks: ['openai', 'custom'],
    version: '0.1.0',
    owner: 'James Wilson',
    department: 'Research',
    tags: ['development', 'experimental', 'flagged'],
    lastScanned: '2025-01-22T10:00:00Z',
    createdAt: '2025-01-10T13:00:00Z',
    updatedAt: '2025-01-22T10:00:00Z',
  },
];

// Mock Detection Results
export const mockDetections: DetectionResult[] = [
  {
    id: uuid(),
    assetId: mockAssets[0].id,
    scanType: 'full',
    status: 'completed',
    frameworksDetected: [
      { name: 'langchain', version: '0.1.0', confidence: 0.98 },
      { name: 'openai', version: '1.12.0', confidence: 0.99 },
    ],
    riskIndicators: [
      { type: 'data_handling', severity: 'low', description: 'Processes user input directly' },
    ],
    recommendations: [
      'Add input sanitization layer',
      'Implement rate limiting',
    ],
    duration: 12500,
    createdAt: '2025-01-22T08:00:00Z',
  },
  {
    id: uuid(),
    assetId: mockAssets[1].id,
    scanType: 'full',
    status: 'completed',
    frameworksDetected: [
      { name: 'anthropic', version: '0.18.0', confidence: 0.97 },
      { name: 'llamaindex', version: '0.9.0', confidence: 0.95 },
    ],
    riskIndicators: [
      { type: 'bias_risk', severity: 'high', description: 'Hiring decisions require human oversight' },
      { type: 'data_sensitivity', severity: 'medium', description: 'Processes PII (resumes)' },
    ],
    recommendations: [
      'Implement mandatory human review for all decisions',
      'Add bias detection monitoring',
      'Ensure GDPR compliance for PII handling',
    ],
    duration: 18200,
    createdAt: '2025-01-21T16:00:00Z',
  },
];

// Mock Policy Rules
export const mockPolicies: PolicyRule[] = [
  {
    id: uuid(),
    name: 'High-Risk Human Oversight',
    description: 'All high-risk AI systems must have mandatory human oversight before final decisions',
    category: 'oversight',
    severity: 'critical',
    enabled: true,
    conditions: {
      riskLevel: ['high', 'unacceptable'],
      type: ['agent'],
    },
    actions: ['require_approval', 'notify_admin'],
    createdAt: '2024-01-20T09:00:00Z',
    updatedAt: '2025-01-05T11:00:00Z',
  },
  {
    id: uuid(),
    name: 'Production Deployment Gate',
    description: 'Systems must achieve 80% compliance score before production deployment',
    category: 'deployment',
    severity: 'high',
    enabled: true,
    conditions: {
      environment: ['production'],
      complianceScore: { min: 80 },
    },
    actions: ['block_deployment', 'notify_owner'],
    createdAt: '2024-02-15T10:00:00Z',
    updatedAt: '2024-12-20T14:00:00Z',
  },
  {
    id: uuid(),
    name: 'Unacceptable Risk Block',
    description: 'Automatically block any AI system classified as unacceptable risk',
    category: 'risk',
    severity: 'critical',
    enabled: true,
    conditions: {
      riskLevel: ['unacceptable'],
    },
    actions: ['block_immediately', 'notify_admin', 'create_incident'],
    createdAt: '2024-01-15T08:00:00Z',
    updatedAt: '2024-01-15T08:00:00Z',
  },
];

// Mock Compliance Assessments
export const mockAssessments: ComplianceAssessment[] = [
  {
    id: uuid(),
    assetId: mockAssets[0].id,
    framework: 'EU AI Act',
    status: 'compliant',
    score: 92,
    controlsTotal: 25,
    controlsPassed: 23,
    controlsFailed: 2,
    findings: [
      { control: 'ART-13', status: 'passed', description: 'Transparency requirements met' },
      { control: 'ART-14', status: 'passed', description: 'Human oversight implemented' },
      { control: 'ART-15', status: 'failed', description: 'Accuracy documentation incomplete' },
    ],
    assessedAt: '2025-01-22T08:00:00Z',
    nextAssessment: '2025-02-22T08:00:00Z',
  },
  {
    id: uuid(),
    assetId: mockAssets[1].id,
    framework: 'EU AI Act',
    status: 'partial',
    score: 68,
    controlsTotal: 30,
    controlsPassed: 20,
    controlsFailed: 10,
    findings: [
      { control: 'ART-9', status: 'failed', description: 'Risk management system incomplete' },
      { control: 'ART-10', status: 'failed', description: 'Training data governance missing' },
      { control: 'ART-14', status: 'partial', description: 'Human oversight needs strengthening' },
    ],
    assessedAt: '2025-01-21T16:00:00Z',
    nextAssessment: '2025-01-28T16:00:00Z',
  },
];

// Mock Runtime Agents
export const mockRuntimeAgents: RuntimeAgent[] = [
  {
    id: uuid(),
    assetId: mockAssets[0].id,
    instanceId: 'csc-prod-001',
    name: 'Customer Support Chatbot',
    status: 'running',
    health: 'healthy',
    uptime: 864000000, // 10 days in ms
    requestsTotal: 125430,
    requestsPerMinute: 42,
    avgLatency: 180,
    errorRate: 0.02,
    lastHeartbeat: new Date().toISOString(),
    capabilities: ['text_generation', 'tool_use'],
    policyViolations: 0,
    startedAt: '2025-01-12T08:00:00Z',
  },
  {
    id: uuid(),
    assetId: mockAssets[1].id,
    instanceId: 'rsa-stage-001',
    name: 'Resume Screening Agent',
    status: 'running',
    health: 'degraded',
    uptime: 172800000, // 2 days in ms
    requestsTotal: 892,
    requestsPerMinute: 3,
    avgLatency: 2500,
    errorRate: 0.08,
    lastHeartbeat: new Date().toISOString(),
    capabilities: ['text_generation', 'document_analysis'],
    policyViolations: 3,
    startedAt: '2025-01-20T09:00:00Z',
  },
  {
    id: uuid(),
    assetId: mockAssets[4].id,
    instanceId: 'fds-prod-001',
    name: 'Fraud Detection System',
    status: 'running',
    health: 'healthy',
    uptime: 2592000000, // 30 days in ms
    requestsTotal: 5420100,
    requestsPerMinute: 1250,
    avgLatency: 45,
    errorRate: 0.001,
    lastHeartbeat: new Date().toISOString(),
    capabilities: ['classification', 'anomaly_detection'],
    policyViolations: 0,
    startedAt: '2024-12-23T00:00:00Z',
  },
];

// Mock Dashboard Metrics
export const mockDashboardMetrics: DashboardMetrics = {
  totalAssets: mockAssets.length,
  assetsByRiskLevel: {
    minimal: 1,
    limited: 1,
    high: 3,
    unacceptable: 1,
  },
  assetsByComplianceStatus: {
    compliant: 4,
    partial: 1,
    noncompliant: 1,
  },
  averageComplianceScore: 75,
  activeRuntimeAgents: 3,
  totalPolicyViolations: 3,
  recentScans: 12,
  pendingAssessments: 2,
  riskTrend: [
    { date: '2025-01-15', score: 72 },
    { date: '2025-01-16', score: 73 },
    { date: '2025-01-17', score: 71 },
    { date: '2025-01-18', score: 74 },
    { date: '2025-01-19', score: 75 },
    { date: '2025-01-20', score: 74 },
    { date: '2025-01-21', score: 75 },
    { date: '2025-01-22', score: 75 },
  ],
  complianceTrend: [
    { date: '2025-01-15', score: 70 },
    { date: '2025-01-16', score: 72 },
    { date: '2025-01-17', score: 73 },
    { date: '2025-01-18', score: 74 },
    { date: '2025-01-19', score: 74 },
    { date: '2025-01-20', score: 75 },
    { date: '2025-01-21', score: 75 },
    { date: '2025-01-22', score: 75 },
  ],
};

// Export helper functions for filtering/querying mock data
export const mockDataHelpers = {
  getAssetById: (id: string) => mockAssets.find(a => a.id === id),
  getAssetsByRiskLevel: (level: RiskLevel) => mockAssets.filter(a => a.riskLevel === level),
  getAssetsByComplianceStatus: (status: ComplianceStatus) => mockAssets.filter(a => a.complianceStatus === status),
  getDetectionsByAssetId: (assetId: string) => mockDetections.filter(d => d.assetId === assetId),
  getAssessmentsByAssetId: (assetId: string) => mockAssessments.filter(a => a.assetId === assetId),
  getRuntimeAgentByAssetId: (assetId: string) => mockRuntimeAgents.find(r => r.assetId === assetId),
};
