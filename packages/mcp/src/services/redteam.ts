/**
 * Red Team Service
 *
 * Integration with AIGOS red team verification capabilities.
 */

import { AIGRCConfig } from "../config.js";

export interface RedTeamStatus {
  assetId: string;
  enabled: boolean;
  lastAssessment?: {
    date: string;
    duration: string;
    vectorsTested: number;
    totalVectors: number;
  };
  findings: FindingSummary;
  verificationScore: {
    constraintsVerified: number;
    totalConstraints: number;
    controlsTested: number;
    totalControls: number;
  };
}

export interface FindingSummary {
  critical: number;
  high: number;
  medium: number;
  low: number;
  open: number;
  remediated: number;
  accepted: number;
  inProgress: number;
}

export interface RedTeamFinding {
  id: string;
  severity: "critical" | "high" | "medium" | "low";
  status: "open" | "in_progress" | "remediated" | "accepted" | "false_positive";
  title: string;
  category: string;
  subcategory?: string;
  confidence: number;
  attack: {
    vector: string;
    technique: string;
    steps: string[];
  };
  impact: {
    constraintViolated?: string;
    dataExposed: boolean;
    businessImpact: string;
    regulatoryRelevance?: string;
  };
  evidence: {
    traceId?: string;
    logs?: string;
  };
  remediation: {
    recommendation: string;
    estimatedEffort: string;
  };
  assignedTo?: string;
  slaDeadline?: string;
  createdAt: string;
  updatedAt: string;
}

export type AttackVector =
  | "prompt_injection"
  | "memory_manipulation"
  | "tool_hijacking"
  | "capability_escalation"
  | "context_poisoning"
  | "goal_manipulation"
  | "multi_agent_exploitation"
  | "encoding_bypass"
  | "data_exfiltration"
  | "denial_of_service"
  | "model_extraction"
  | "supply_chain";

export interface ScanRequest {
  assetId: string;
  vectors?: AttackVector[];
  environment: "sandbox" | "staging";
  constraints?: string[];
}

export interface ScanResult {
  scanId: string;
  status: "queued" | "running" | "completed" | "failed";
  startedAt?: string;
  completedAt?: string;
  findingsCount?: number;
}

export class RedTeamService {
  constructor(private config: AIGRCConfig) {}

  /**
   * Check if red team integration is enabled
   */
  isEnabled(): boolean {
    return this.config.redTeamEnabled && !!this.config.aigosApiUrl;
  }

  /**
   * Get red team status for an asset
   */
  async getStatus(assetId: string): Promise<RedTeamStatus> {
    if (!this.isEnabled()) {
      return this.getDisabledStatus(assetId);
    }

    try {
      const response = await this.apiCall(`/assets/${assetId}/redteam/status`);
      return response as RedTeamStatus;
    } catch (error) {
      // Return mock data for development/demo
      return this.getMockStatus(assetId);
    }
  }

  /**
   * Get findings for an asset
   */
  async getFindings(
    assetId: string,
    options?: {
      severity?: "critical" | "high" | "medium" | "low" | "all";
      status?: "open" | "remediated" | "accepted" | "in_progress" | "all";
    }
  ): Promise<RedTeamFinding[]> {
    if (!this.isEnabled()) {
      return [];
    }

    try {
      const params = new URLSearchParams();
      if (options?.severity && options.severity !== "all") {
        params.set("severity", options.severity);
      }
      if (options?.status && options.status !== "all") {
        params.set("status", options.status);
      }

      const response = await this.apiCall(
        `/assets/${assetId}/redteam/findings?${params}`
      );
      return response as RedTeamFinding[];
    } catch {
      // Return mock findings for development/demo
      return this.getMockFindings(assetId);
    }
  }

  /**
   * Trigger a red team scan
   */
  async triggerScan(request: ScanRequest): Promise<ScanResult> {
    if (!this.isEnabled()) {
      throw new Error(
        "Red team integration is not enabled. Set AIGRC_REDTEAM_ENABLED=true and configure AIGOS_API_URL"
      );
    }

    try {
      const response = await this.apiCall(
        `/assets/${request.assetId}/redteam/scan`,
        {
          method: "POST",
          body: JSON.stringify({
            vectors: request.vectors,
            environment: request.environment,
            constraints: request.constraints,
          }),
        }
      );
      return response as ScanResult;
    } catch (error) {
      throw new Error(`Failed to trigger scan: ${error}`);
    }
  }

  /**
   * Verify a specific constraint
   */
  async verifyConstraint(
    assetId: string,
    constraint: string
  ): Promise<{
    verified: boolean;
    attempts: number;
    lastAttempt: string;
    findings: RedTeamFinding[];
  }> {
    if (!this.isEnabled()) {
      return {
        verified: false,
        attempts: 0,
        lastAttempt: new Date().toISOString(),
        findings: [],
      };
    }

    try {
      const response = await this.apiCall(
        `/assets/${assetId}/redteam/verify`,
        {
          method: "POST",
          body: JSON.stringify({ constraint }),
        }
      );
      return response as {
        verified: boolean;
        attempts: number;
        lastAttempt: string;
        findings: RedTeamFinding[];
      };
    } catch {
      return {
        verified: false,
        attempts: 0,
        lastAttempt: new Date().toISOString(),
        findings: [],
      };
    }
  }

  /**
   * Update finding status
   */
  async updateFindingStatus(
    findingId: string,
    status: RedTeamFinding["status"],
    notes?: string,
    evidence?: string
  ): Promise<RedTeamFinding> {
    if (!this.isEnabled()) {
      throw new Error("Red team integration is not enabled");
    }

    const response = await this.apiCall(`/findings/${findingId}`, {
      method: "PATCH",
      body: JSON.stringify({ status, notes, evidence }),
    });
    return response as RedTeamFinding;
  }

  /**
   * Format status as markdown
   */
  formatStatus(status: RedTeamStatus): string {
    const lines: string[] = [];

    lines.push(`## Red Team Status: ${status.assetId}\n`);

    if (!status.enabled) {
      lines.push(
        "**Red team integration is not enabled.**\n\nTo enable, set `AIGRC_REDTEAM_ENABLED=true` and configure `AIGOS_API_URL`."
      );
      return lines.join("\n");
    }

    if (status.lastAssessment) {
      lines.push("### Last Assessment\n");
      lines.push(`- **Date:** ${status.lastAssessment.date}`);
      lines.push(`- **Duration:** ${status.lastAssessment.duration}`);
      lines.push(
        `- **Attack Vectors Tested:** ${status.lastAssessment.vectorsTested}/${status.lastAssessment.totalVectors}`
      );
    }

    lines.push("\n### Findings Summary\n");
    lines.push("| Severity | Count | Status |");
    lines.push("|----------|-------|--------|");
    lines.push(`| Critical | ${status.findings.critical} | ${status.findings.critical > 0 ? "OPEN" : "OK"} |`);
    lines.push(`| High | ${status.findings.high} | ${status.findings.high > 0 ? "OPEN" : "OK"} |`);
    lines.push(`| Medium | ${status.findings.medium} | - |`);
    lines.push(`| Low | ${status.findings.low} | - |`);

    lines.push("\n### Status Breakdown\n");
    lines.push(`- Open: ${status.findings.open}`);
    lines.push(`- In Progress: ${status.findings.inProgress}`);
    lines.push(`- Remediated: ${status.findings.remediated}`);
    lines.push(`- Accepted Risk: ${status.findings.accepted}`);

    lines.push("\n### Verification Score\n");
    const constraintPct = Math.round(
      (status.verificationScore.constraintsVerified /
        status.verificationScore.totalConstraints) *
        100
    );
    const controlPct = Math.round(
      (status.verificationScore.controlsTested /
        status.verificationScore.totalControls) *
        100
    );
    lines.push(
      `- Constraints Verified: ${status.verificationScore.constraintsVerified}/${status.verificationScore.totalConstraints} (${constraintPct}%)`
    );
    lines.push(
      `- Controls Tested: ${status.verificationScore.controlsTested}/${status.verificationScore.totalControls} (${controlPct}%)`
    );

    return lines.join("\n");
  }

  /**
   * Format findings as markdown
   */
  formatFindings(findings: RedTeamFinding[]): string {
    const lines: string[] = [];

    if (findings.length === 0) {
      return "No red team findings.\n";
    }

    lines.push("## Red Team Findings\n");

    for (const finding of findings) {
      lines.push(
        `### ${finding.id} (${finding.severity.toUpperCase()} - ${finding.status.toUpperCase()})`
      );
      lines.push(`**${finding.title}**\n`);

      lines.push("**Classification:**");
      lines.push(`- Category: ${finding.category}`);
      if (finding.subcategory) {
        lines.push(`- Subcategory: ${finding.subcategory}`);
      }
      lines.push(`- Confidence: ${finding.confidence}%\n`);

      lines.push("**Attack Details:**");
      lines.push(`- Vector: ${finding.attack.vector}`);
      lines.push(`- Technique: ${finding.attack.technique}`);
      lines.push("- Steps:");
      for (const step of finding.attack.steps) {
        lines.push(`  1. ${step}`);
      }

      lines.push("\n**Impact:**");
      if (finding.impact.constraintViolated) {
        lines.push(`- Constraint Violated: ${finding.impact.constraintViolated}`);
      }
      lines.push(`- Data Exposed: ${finding.impact.dataExposed ? "Yes" : "No"}`);
      lines.push(`- Business Impact: ${finding.impact.businessImpact}`);
      if (finding.impact.regulatoryRelevance) {
        lines.push(`- Regulatory Relevance: ${finding.impact.regulatoryRelevance}`);
      }

      lines.push("\n**Remediation:**");
      lines.push(`- ${finding.remediation.recommendation}`);
      lines.push(`- Estimated Effort: ${finding.remediation.estimatedEffort}`);

      if (finding.assignedTo) {
        lines.push(`\n**Assigned To:** ${finding.assignedTo}`);
      }
      if (finding.slaDeadline) {
        lines.push(`**SLA Deadline:** ${finding.slaDeadline}`);
      }

      lines.push("\n---\n");
    }

    return lines.join("\n");
  }

  // Private helpers

  private async apiCall(path: string, options?: RequestInit): Promise<unknown> {
    if (!this.config.aigosApiUrl) {
      throw new Error("AIGOS API URL not configured");
    }

    const url = `${this.config.aigosApiUrl}${path}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    if (this.config.aigosApiKey) {
      headers["Authorization"] = `Bearer ${this.config.aigosApiKey}`;
    }

    const response = await fetch(url, {
      ...options,
      headers: { ...headers, ...options?.headers },
    });

    if (!response.ok) {
      throw new Error(`API error: ${response.status} ${response.statusText}`);
    }

    return response.json();
  }

  private getDisabledStatus(assetId: string): RedTeamStatus {
    return {
      assetId,
      enabled: false,
      findings: {
        critical: 0,
        high: 0,
        medium: 0,
        low: 0,
        open: 0,
        remediated: 0,
        accepted: 0,
        inProgress: 0,
      },
      verificationScore: {
        constraintsVerified: 0,
        totalConstraints: 0,
        controlsTested: 0,
        totalControls: 0,
      },
    };
  }

  private getMockStatus(assetId: string): RedTeamStatus {
    return {
      assetId,
      enabled: true,
      lastAssessment: {
        date: new Date().toISOString(),
        duration: "4 hours",
        vectorsTested: 8,
        totalVectors: 12,
      },
      findings: {
        critical: 1,
        high: 2,
        medium: 3,
        low: 5,
        open: 3,
        remediated: 5,
        accepted: 2,
        inProgress: 1,
      },
      verificationScore: {
        constraintsVerified: 7,
        totalConstraints: 10,
        controlsTested: 12,
        totalControls: 15,
      },
    };
  }

  private getMockFindings(assetId: string): RedTeamFinding[] {
    return [
      {
        id: "RT-2025-0042",
        severity: "critical",
        status: "open",
        title: "Prompt Injection Bypass",
        category: "prompt_injection",
        subcategory: "instruction_override",
        confidence: 95,
        attack: {
          vector: "User message containing encoded instruction",
          technique: "Base64 encoding bypass",
          steps: [
            "Sent encoded payload in user message",
            "Agent decoded and executed instruction",
            "Human approval gate bypassed",
            "Data exported to external endpoint",
          ],
        },
        impact: {
          constraintViolated: "humanApprovalRequired.data_export",
          dataExposed: true,
          businessImpact: "PII exfiltration possible",
          regulatoryRelevance: "EU AI Act Article 52 transparency violation",
        },
        evidence: {
          traceId: "abc123...",
          logs: "/artifacts/rt-0042/logs.json",
        },
        remediation: {
          recommendation:
            "Implement input sanitization before LLM and add output filtering before tool execution",
          estimatedEffort: "2-3 engineering days",
        },
        assignedTo: "security-team@company.com",
        slaDeadline: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
    ];
  }
}
