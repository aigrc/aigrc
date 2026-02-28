/**
 * Policy Bundle Store — Storage layer for organization policy bundles
 *
 * Provides an interface for loading active policy bundles used by the
 * PolicyEvaluator to evaluate governance events against org policy.
 *
 * Two implementations:
 * - InMemoryPolicyBundleStore — for testing and development
 * - SupabasePolicyBundleStore — production (graceful fallback if table doesn't exist)
 */

import type { SupabaseClient } from "@supabase/supabase-js";

// ─────────────────────────────────────────────────────────────────
// TYPES
// ─────────────────────────────────────────────────────────────────

/**
 * A rule within a policy bundle.
 */
export interface PolicyRule {
  /** Unique rule identifier */
  id: string;
  /** Human-readable rule name */
  name: string;
  /** Whether violation is blocking or warning-only */
  severity: "blocking" | "warning";
  /** Description of what the rule checks */
  description: string;
  /** Recommended remediation action */
  remediation: string;
  /** Event types this rule applies to (empty = all types) */
  appliesTo: string[];
  /** Built-in check function name */
  check: string;
}

/**
 * An active waiver that suppresses a specific rule violation.
 */
export interface PolicyWaiver {
  /** Rule ID being waived */
  ruleId: string;
  /** Who authorized the waiver */
  waivedBy: string;
  /** ISO 8601 expiration timestamp */
  expiresAt: string;
  /** Reason for the waiver */
  reason: string;
}

/**
 * A complete policy bundle for an organization.
 */
export interface PolicyBundle {
  /** Bundle identifier */
  id: string;
  /** Organization this bundle belongs to */
  orgId: string;
  /** Policy rules to evaluate */
  rules: PolicyRule[];
  /** Conformance target level */
  conformanceTarget?: "BRONZE" | "SILVER" | "GOLD";
  /** Active waivers that suppress rule violations */
  waivers: PolicyWaiver[];
}

/**
 * Interface for loading policy bundles.
 */
export interface PolicyBundleStore {
  /** Get the active policy bundle for an organization. Returns null if none active. */
  getActiveBundle(orgId: string): Promise<PolicyBundle | null>;
}

// ─────────────────────────────────────────────────────────────────
// IN-MEMORY IMPLEMENTATION (testing/development)
// ─────────────────────────────────────────────────────────────────

/**
 * In-memory policy bundle store for testing and development.
 * Bundles are set programmatically.
 */
export class InMemoryPolicyBundleStore implements PolicyBundleStore {
  private readonly bundles: Map<string, PolicyBundle> = new Map();

  /**
   * Set the active bundle for an organization.
   */
  setBundle(orgId: string, bundle: PolicyBundle): void {
    this.bundles.set(orgId, bundle);
  }

  /**
   * Remove the bundle for an organization.
   */
  removeBundle(orgId: string): void {
    this.bundles.delete(orgId);
  }

  /**
   * Clear all bundles.
   */
  clear(): void {
    this.bundles.clear();
  }

  async getActiveBundle(orgId: string): Promise<PolicyBundle | null> {
    return this.bundles.get(orgId) ?? null;
  }
}

// ─────────────────────────────────────────────────────────────────
// SUPABASE IMPLEMENTATION (production)
// ─────────────────────────────────────────────────────────────────

/**
 * Supabase-backed policy bundle store.
 * Gracefully returns null if the policy_bundles table doesn't exist.
 */
export class SupabasePolicyBundleStore implements PolicyBundleStore {
  private readonly supabase: SupabaseClient;

  constructor(supabase: SupabaseClient) {
    this.supabase = supabase;
  }

  async getActiveBundle(orgId: string): Promise<PolicyBundle | null> {
    try {
      const { data, error } = await this.supabase
        .from("policy_bundles")
        .select("*")
        .eq("org_id", orgId)
        .eq("active", true)
        .single();

      if (error || !data) {
        return null;
      }

      return {
        id: data.id,
        orgId: data.org_id,
        rules: data.rules ?? [],
        conformanceTarget: data.conformance_target ?? undefined,
        waivers: data.waivers ?? [],
      };
    } catch {
      // Table doesn't exist or other error — graceful fallback
      return null;
    }
  }
}
