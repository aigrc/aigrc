/**
 * CA-Initiated Live Verification Service
 *
 * Performs live verification of agent governance capabilities
 * to ensure CGA certification requirements are continuously met.
 */

import { cga } from "@aigrc/core";
import { CADatabase, CertificateRecord } from "../db/client.js";

export interface LiveVerificationConfig {
  /** Kill switch test timeout in milliseconds */
  killSwitchTimeoutMs: number;
  /** Health check interval for continuous monitoring */
  healthCheckIntervalMs: number;
  /** Maximum consecutive failures before revocation */
  maxConsecutiveFailures: number;
  /** Enabled verification checks */
  enabledChecks: {
    killSwitch: boolean;
    healthEndpoint: boolean;
    policyEndpoint: boolean;
  };
}

export interface VerificationTarget {
  certificateId: string;
  agentId: string;
  endpoints: {
    killSwitch?: string;
    health?: string;
    policy?: string;
  };
}

export interface LiveVerificationResult {
  certificateId: string;
  timestamp: string;
  passed: boolean;
  checks: {
    name: string;
    passed: boolean;
    latencyMs?: number;
    error?: string;
  }[];
  overallLatencyMs: number;
}

export interface LiveVerificationServiceOptions {
  db: CADatabase;
  config: LiveVerificationConfig;
}

/**
 * Live Verification Service
 *
 * Performs CA-initiated verification of agent governance capabilities.
 */
export class LiveVerificationService {
  private db: CADatabase;
  private config: LiveVerificationConfig;
  private consecutiveFailures: Map<string, number> = new Map();

  constructor(options: LiveVerificationServiceOptions) {
    this.db = options.db;
    this.config = options.config;
  }

  /**
   * Verify a single certificate's agent
   */
  async verify(target: VerificationTarget): Promise<LiveVerificationResult> {
    const startTime = Date.now();
    const checks: LiveVerificationResult["checks"] = [];

    // Kill switch verification
    if (this.config.enabledChecks.killSwitch && target.endpoints.killSwitch) {
      const killSwitchResult = await this.verifyKillSwitch(
        target.endpoints.killSwitch
      );
      checks.push(killSwitchResult);
    }

    // Health endpoint verification
    if (this.config.enabledChecks.healthEndpoint && target.endpoints.health) {
      const healthResult = await this.verifyHealthEndpoint(
        target.endpoints.health
      );
      checks.push(healthResult);
    }

    // Policy endpoint verification
    if (this.config.enabledChecks.policyEndpoint && target.endpoints.policy) {
      const policyResult = await this.verifyPolicyEndpoint(
        target.endpoints.policy
      );
      checks.push(policyResult);
    }

    const passed = checks.every((c) => c.passed);
    const overallLatencyMs = Date.now() - startTime;

    // Track consecutive failures
    if (!passed) {
      const failures = (this.consecutiveFailures.get(target.certificateId) ?? 0) + 1;
      this.consecutiveFailures.set(target.certificateId, failures);

      if (failures >= this.config.maxConsecutiveFailures) {
        await this.handleMaxFailures(target.certificateId);
      }
    } else {
      this.consecutiveFailures.delete(target.certificateId);
    }

    // Log verification
    this.db.logVerification({
      certificate_id: target.certificateId,
      agent_id: target.agentId,
      request_ip: null,
      request_action: "live_verification",
      request_timestamp: new Date().toISOString(),
      result: passed ? "valid" : "invalid",
      result_details: JSON.stringify(checks),
      duration_ms: overallLatencyMs,
    });

    return {
      certificateId: target.certificateId,
      timestamp: new Date().toISOString(),
      passed,
      checks,
      overallLatencyMs,
    };
  }

  /**
   * Verify kill switch endpoint
   */
  private async verifyKillSwitch(endpoint: string): Promise<{
    name: string;
    passed: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(
        () => controller.abort(),
        this.config.killSwitchTimeoutMs
      );

      // Send test command (not actual kill, just verification)
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CGA-Verification": "true",
        },
        body: JSON.stringify({
          command: "TEST",
          timestamp: new Date().toISOString(),
          nonce: Math.random().toString(36).substring(7),
        }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: "kill_switch",
          passed: false,
          latencyMs,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json() as { acknowledged?: boolean };

      // Check for acknowledgment
      if (data.acknowledged !== true) {
        return {
          name: "kill_switch",
          passed: false,
          latencyMs,
          error: "No acknowledgment received",
        };
      }

      // Check latency SLA (60s for SILVER+)
      if (latencyMs > 60000) {
        return {
          name: "kill_switch",
          passed: false,
          latencyMs,
          error: `Latency ${latencyMs}ms exceeds 60s SLA`,
        };
      }

      return {
        name: "kill_switch",
        passed: true,
        latencyMs,
      };
    } catch (error) {
      return {
        name: "kill_switch",
        passed: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify health endpoint
   */
  private async verifyHealthEndpoint(endpoint: string): Promise<{
    name: string;
    passed: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: "GET",
        headers: {
          "X-CGA-Verification": "true",
        },
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: "health_endpoint",
          passed: false,
          latencyMs,
          error: `HTTP ${response.status}`,
        };
      }

      const data = await response.json() as { status?: string };

      // Check for healthy status
      if (data.status !== "healthy" && data.status !== "ok") {
        return {
          name: "health_endpoint",
          passed: false,
          latencyMs,
          error: `Unhealthy status: ${data.status ?? "unknown"}`,
        };
      }

      return {
        name: "health_endpoint",
        passed: true,
        latencyMs,
      };
    } catch (error) {
      return {
        name: "health_endpoint",
        passed: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Verify policy endpoint
   */
  private async verifyPolicyEndpoint(endpoint: string): Promise<{
    name: string;
    passed: boolean;
    latencyMs?: number;
    error?: string;
  }> {
    const startTime = Date.now();

    try {
      const response = await fetch(endpoint, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-CGA-Verification": "true",
        },
        body: JSON.stringify({
          action: "test:verification",
          resource: "cga:verification",
        }),
      });

      const latencyMs = Date.now() - startTime;

      if (!response.ok) {
        return {
          name: "policy_endpoint",
          passed: false,
          latencyMs,
          error: `HTTP ${response.status}`,
        };
      }

      // Policy endpoint should respond with decision
      const data = await response.json() as { decision?: unknown };

      if (data.decision === undefined) {
        return {
          name: "policy_endpoint",
          passed: false,
          latencyMs,
          error: "No decision returned",
        };
      }

      return {
        name: "policy_endpoint",
        passed: true,
        latencyMs,
      };
    } catch (error) {
      return {
        name: "policy_endpoint",
        passed: false,
        latencyMs: Date.now() - startTime,
        error: error instanceof Error ? error.message : "Unknown error",
      };
    }
  }

  /**
   * Handle max consecutive failures
   */
  private async handleMaxFailures(certificateId: string): Promise<void> {
    // Auto-revoke certificate due to governance failures
    this.db.transaction(() => {
      this.db.updateCertificateStatus(
        certificateId,
        "revoked",
        "Automatic revocation: failed live verification"
      );

      this.db.addRevocation(
        certificateId,
        "Live verification failed multiple times",
        "system",
        undefined
      );

      this.db.audit(
        "certificate_auto_revoked",
        "certificate",
        certificateId,
        "system",
        undefined,
        JSON.stringify({
          reason: "live_verification_failures",
          consecutiveFailures: this.config.maxConsecutiveFailures,
        })
      );
    });

    // Clear failure counter
    this.consecutiveFailures.delete(certificateId);
  }

  /**
   * Batch verify multiple certificates
   */
  async verifyBatch(
    targets: VerificationTarget[]
  ): Promise<LiveVerificationResult[]> {
    const results: LiveVerificationResult[] = [];

    for (const target of targets) {
      const result = await this.verify(target);
      results.push(result);

      // Small delay between checks to avoid overwhelming agents
      await new Promise((resolve) => setTimeout(resolve, 100));
    }

    return results;
  }

  /**
   * Get verification targets from database
   */
  getVerificationTargets(level?: cga.CGALevel): VerificationTarget[] {
    // This would query certificates with endpoint metadata
    // For now, return empty (would need schema update for endpoints)
    return [];
  }

  /**
   * Get failure count for certificate
   */
  getFailureCount(certificateId: string): number {
    return this.consecutiveFailures.get(certificateId) ?? 0;
  }
}
