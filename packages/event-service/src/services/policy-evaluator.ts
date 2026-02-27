/**
 * Policy Evaluator — Evaluates governance events against org policy bundles
 *
 * When specific event types (asset.created, asset.updated, scan.completed,
 * classification.changed) are pushed, evaluates the event against the org's
 * active policy bundle and returns:
 * - PolicyViolation[] for blocking/warning rules
 * - ComplianceGap[] relative to conformance target
 * - GovernanceWarning[] for non-blocking issues
 * - Suggestion[] from analysis
 *
 * Per EVT-001 §12.5 — PushResponse Feedback
 */

import type { GovernanceEvent } from "@aigrc/events";
import type {
  PolicyBundleStore,
  PolicyBundle,
  PolicyRule,
} from "./policy-bundle-store.js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * Policy violation found during evaluation.
 */
export interface PolicyViolation {
  ruleId: string;
  ruleName: string;
  severity: "blocking" | "warning";
  description: string;
  remediation: string;
}

/**
 * Active waiver applied to suppress a violation.
 */
export interface ActiveWaiver {
  ruleId: string;
  waivedBy: string;
  expiresAt: string;
  reason: string;
}

/**
 * Policy evaluation result.
 */
export interface PolicyResult {
  evaluated: boolean;
  passed: boolean;
  bundleId: string;
  violations: PolicyViolation[];
  waivers: ActiveWaiver[];
}

/**
 * Non-blocking governance warning.
 */
export interface GovernanceWarning {
  code: string;
  message: string;
  asset: string;
  severity: "info" | "warning" | "urgent";
  action?: string;
}

/**
 * Platform suggestion.
 */
export interface Suggestion {
  code: string;
  message: string;
  confidence: number;
  source: "fleet-analysis" | "regulatory-update" | "best-practice";
}

/**
 * Complete evaluation result returned by PolicyEvaluator.
 */
export interface EvaluationResult {
  policyResult: PolicyResult;
  complianceGaps: PolicyViolation[];
  warnings: GovernanceWarning[];
  suggestions: Suggestion[];
}

// ─────────────────────────────────────────────────────────────────
// CONSTANTS
// ─────────────────────────────────────────────────────────────────

/**
 * Event types that trigger policy evaluation.
 */
const EVALUATED_EVENT_TYPES = new Set([
  "aigrc.asset.created",
  "aigrc.asset.updated",
  "aigrc.scan.completed",
  "aigrc.classification.changed",
]);

/** Orphan deadline warning threshold — 7 days */
const ORPHAN_DEADLINE_WARNING_DAYS = 7;

/** Linked thread staleness threshold — 30 days */
const LINKED_THREAD_STALE_DAYS = 30;

// ─────────────────────────────────────────────────────────────────
// POLICY EVALUATOR
// ─────────────────────────────────────────────────────────────────

export class PolicyEvaluator {
  private readonly bundleStore: PolicyBundleStore;

  constructor(bundleStore: PolicyBundleStore) {
    this.bundleStore = bundleStore;
  }

  /**
   * Evaluate a governance event against the org's active policy bundle.
   *
   * Returns null if:
   * - No active policy bundle exists for the org
   * - The event type is not one of the evaluated types
   */
  async evaluate(
    event: GovernanceEvent,
    orgId: string,
  ): Promise<EvaluationResult | null> {
    // Only evaluate specific event types
    if (!EVALUATED_EVENT_TYPES.has(event.type)) {
      return null;
    }

    // Load active policy bundle
    const bundle = await this.bundleStore.getActiveBundle(orgId);
    if (!bundle) {
      return null;
    }

    // Run evaluation
    const violations = this.evaluateRules(event, bundle);
    const activeWaivers = this.findActiveWaivers(violations, bundle);
    const effectiveViolations = this.applyWaivers(violations, activeWaivers);
    const complianceGaps = this.checkConformanceGaps(event, bundle);
    const warnings = this.checkWarnings(event);
    const suggestions = this.generateSuggestions(event);

    // Determine if all policies passed (no blocking violations after waivers)
    const hasBlockingViolation = effectiveViolations.some(
      (v) => v.severity === "blocking",
    );

    return {
      policyResult: {
        evaluated: true,
        passed: !hasBlockingViolation,
        bundleId: bundle.id,
        violations: effectiveViolations,
        waivers: activeWaivers,
      },
      complianceGaps,
      warnings,
      suggestions,
    };
  }

  // ─── Internal Evaluation Methods ────────────────────────────────

  /**
   * Evaluate all applicable rules against the event.
   */
  private evaluateRules(
    event: GovernanceEvent,
    bundle: PolicyBundle,
  ): PolicyViolation[] {
    const violations: PolicyViolation[] = [];

    for (const rule of bundle.rules) {
      // Skip rules that don't apply to this event type
      if (
        rule.appliesTo.length > 0 &&
        !rule.appliesTo.includes(event.type)
      ) {
        continue;
      }

      const violated = this.runCheck(rule.check, event, bundle);
      if (violated) {
        violations.push({
          ruleId: rule.id,
          ruleName: rule.name,
          severity: rule.severity,
          description: rule.description,
          remediation: rule.remediation,
        });
      }
    }

    return violations;
  }

  /**
   * Run a built-in rule check against the event.
   * Returns true if the rule is violated.
   */
  private runCheck(
    check: string,
    event: GovernanceEvent,
    bundle: PolicyBundle,
  ): boolean {
    switch (check) {
      case "golden-thread-required":
        // Check that golden thread is linked (not orphan)
        return event.goldenThread.type === "orphan";

      case "golden-thread-linked":
        // Check that golden thread is linked with active status
        return (
          event.goldenThread.type !== "linked" ||
          event.goldenThread.status !== "active"
        );

      case "signature-required":
        // Check that event has a cryptographic signature
        return !event.signature;

      case "high-criticality-needs-signature":
        // High/critical events must have signatures
        return (
          (event.criticality === "high" || event.criticality === "critical") &&
          !event.signature
        );

      case "data-not-empty":
        // Data must have at least one meaningful field
        return Object.keys(event.data).length === 0;

      case "previous-hash-chain":
        // Events should reference previous hash for chain integrity
        return !event.previousHash;

      case "correlation-id-required":
        // Events should have correlation IDs for traceability
        return !event.correlationId;

      default:
        // Unknown check — don't flag as violation
        return false;
    }
  }

  /**
   * Find active waivers that suppress violations.
   */
  private findActiveWaivers(
    violations: PolicyViolation[],
    bundle: PolicyBundle,
  ): ActiveWaiver[] {
    const now = new Date();
    const activeWaivers: ActiveWaiver[] = [];

    for (const waiver of bundle.waivers) {
      const expiresAt = new Date(waiver.expiresAt);
      if (expiresAt <= now) continue; // Expired waiver

      // Check if this waiver matches any violation
      const matchesViolation = violations.some(
        (v) => v.ruleId === waiver.ruleId,
      );
      if (matchesViolation) {
        activeWaivers.push({
          ruleId: waiver.ruleId,
          waivedBy: waiver.waivedBy,
          expiresAt: waiver.expiresAt,
          reason: waiver.reason,
        });
      }
    }

    return activeWaivers;
  }

  /**
   * Remove violations that are covered by active waivers.
   */
  private applyWaivers(
    violations: PolicyViolation[],
    waivers: ActiveWaiver[],
  ): PolicyViolation[] {
    const waivedRuleIds = new Set(waivers.map((w) => w.ruleId));
    return violations.filter((v) => !waivedRuleIds.has(v.ruleId));
  }

  /**
   * Check conformance gaps relative to the org's target level.
   */
  private checkConformanceGaps(
    event: GovernanceEvent,
    bundle: PolicyBundle,
  ): PolicyViolation[] {
    const gaps: PolicyViolation[] = [];
    const target = bundle.conformanceTarget;
    if (!target) return gaps;

    // SILVER+ requires signatures
    if (
      (target === "SILVER" || target === "GOLD") &&
      !event.signature
    ) {
      gaps.push({
        ruleId: "CONFORMANCE_SIGNATURE",
        ruleName: `${target} conformance: signature required`,
        severity: "warning",
        description: `${target} conformance requires cryptographic signatures on all events`,
        remediation: "Configure event signing with HMAC or asymmetric keys",
      });
    }

    // GOLD requires previous hash chain
    if (target === "GOLD" && !event.previousHash) {
      gaps.push({
        ruleId: "CONFORMANCE_CHAIN",
        ruleName: "GOLD conformance: hash chain required",
        severity: "warning",
        description:
          "GOLD conformance requires linking events via previousHash for chain integrity",
        remediation:
          "Set previousHash to the hash of the most recent event for this asset",
      });
    }

    // SILVER+ requires correlation IDs
    if (
      (target === "SILVER" || target === "GOLD") &&
      !event.correlationId
    ) {
      gaps.push({
        ruleId: "CONFORMANCE_CORRELATION",
        ruleName: `${target} conformance: correlationId recommended`,
        severity: "warning",
        description: `${target} conformance recommends correlationId for traceability`,
        remediation:
          "Set correlationId to group related events (e.g., all events from one CI run)",
      });
    }

    return gaps;
  }

  /**
   * Check for non-blocking governance warnings.
   */
  private checkWarnings(event: GovernanceEvent): GovernanceWarning[] {
    const warnings: GovernanceWarning[] = [];
    const now = new Date();

    // Orphan golden thread — check deadline proximity
    if (event.goldenThread.type === "orphan") {
      const deadline = new Date(event.goldenThread.remediationDeadline);
      const daysUntilDeadline = Math.ceil(
        (deadline.getTime() - now.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysUntilDeadline <= 0) {
        warnings.push({
          code: "ORPHAN_OVERDUE",
          message: `Orphan remediation deadline has passed (${event.goldenThread.remediationDeadline})`,
          asset: event.assetId,
          severity: "urgent",
          action:
            "Link this asset to a business authorization immediately or request a deadline extension",
        });
      } else if (daysUntilDeadline <= ORPHAN_DEADLINE_WARNING_DAYS) {
        warnings.push({
          code: "ORPHAN_DEADLINE_APPROACHING",
          message: `Orphan remediation deadline in ${daysUntilDeadline} day(s) (${event.goldenThread.remediationDeadline})`,
          asset: event.assetId,
          severity: "warning",
          action:
            "Link this asset to a business authorization before the deadline",
        });
      }
    }

    // Linked golden thread — check staleness
    if (event.goldenThread.type === "linked" && event.goldenThread.verifiedAt) {
      const verifiedAt = new Date(event.goldenThread.verifiedAt);
      const daysSinceVerification = Math.floor(
        (now.getTime() - verifiedAt.getTime()) / (24 * 60 * 60 * 1000),
      );

      if (daysSinceVerification > LINKED_THREAD_STALE_DAYS) {
        warnings.push({
          code: "THREAD_STALE",
          message: `Golden thread verification is ${daysSinceVerification} days old (threshold: ${LINKED_THREAD_STALE_DAYS} days)`,
          asset: event.assetId,
          severity: "warning",
          action:
            "Re-verify the golden thread link to ensure the business authorization is still active",
        });
      }
    }

    // Linked thread with non-active status
    if (
      event.goldenThread.type === "linked" &&
      event.goldenThread.status !== "active" &&
      event.goldenThread.status !== "completed"
    ) {
      warnings.push({
        code: "THREAD_INACTIVE",
        message: `Golden thread status is "${event.goldenThread.status}" — may need attention`,
        asset: event.assetId,
        severity: "info",
        action:
          "Review the linked work item status and update if needed",
      });
    }

    return warnings;
  }

  /**
   * Generate platform suggestions based on event analysis.
   */
  private generateSuggestions(event: GovernanceEvent): Suggestion[] {
    const suggestions: Suggestion[] = [];

    // Suggest linking orphan events
    if (event.goldenThread.type === "orphan") {
      suggestions.push({
        code: "SUGGEST_LINK_THREAD",
        message:
          "Consider linking this asset to a business authorization ticket for full traceability",
        confidence: 0.9,
        source: "best-practice",
      });
    }

    // Suggest adding correlation IDs if missing
    if (!event.correlationId) {
      suggestions.push({
        code: "SUGGEST_CORRELATION_ID",
        message:
          "Adding a correlationId helps group related events and improves audit trail analysis",
        confidence: 0.7,
        source: "best-practice",
      });
    }

    // Suggest signature for high-criticality events
    if (
      (event.criticality === "high" || event.criticality === "critical") &&
      !event.signature
    ) {
      suggestions.push({
        code: "SUGGEST_SIGN_HIGH_CRIT",
        message:
          "High/critical events benefit from cryptographic signatures for non-repudiation",
        confidence: 0.85,
        source: "best-practice",
      });
    }

    return suggestions;
  }
}
