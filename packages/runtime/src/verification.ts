import {
  type RuntimeIdentity,
  type AssetCard,
  type GoldenThread,
  type GoldenThreadComponents,
  verifyGoldenThreadHashSync,
  computeGoldenThreadHashSync,
  extractGoldenThreadComponents,
} from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// GOLDEN THREAD VERIFICATION (SPEC-RT-002 / AIG-40)
// Runtime verification of Golden Thread integrity
// ─────────────────────────────────────────────────────────────────

/** Verification failure reason */
export type VerificationFailureReason =
  | "missing_golden_thread"
  | "hash_mismatch"
  | "expired_approval"
  | "missing_ticket"
  | "verification_disabled"
  | "external_verification_failed";

/** Verification result */
export interface GoldenThreadVerificationResult {
  /** Whether verification passed */
  verified: boolean;
  /** Reason for failure if not verified */
  reason?: VerificationFailureReason;
  /** Human-readable message */
  message: string;
  /** Computed hash (if computed) */
  computedHash?: string;
  /** Expected hash (if available) */
  expectedHash?: string;
  /** Verification timestamp */
  verifiedAt: string;
}

/** Verification options */
export interface VerificationOptions {
  /** Skip verification entirely (for testing/dev) */
  skipVerification?: boolean;
  /** Allow expired approvals (within grace period) */
  allowExpiredApprovals?: boolean;
  /** Approval expiry grace period in days */
  approvalGracePeriodDays?: number;
  /** External verification callback (e.g., to check ticket system) */
  externalVerifier?: (components: GoldenThreadComponents) => Promise<boolean>;
}

/**
 * Verifies the Golden Thread for a runtime identity.
 *
 * This checks:
 * 1. That a Golden Thread exists
 * 2. That the hash matches the computed hash
 * 3. Optional: That the approval hasn't expired
 * 4. Optional: External verification (e.g., ticket system check)
 *
 * @param identity The runtime identity to verify
 * @param options Verification options
 * @returns Verification result
 */
export function verifyRuntimeGoldenThread(
  identity: RuntimeIdentity,
  options: VerificationOptions = {}
): GoldenThreadVerificationResult {
  const now = new Date().toISOString();

  // Handle skip verification
  if (options.skipVerification) {
    return {
      verified: true,
      message: "Verification skipped (disabled)",
      verifiedAt: now,
    };
  }

  // Check for Golden Thread presence
  if (!identity.golden_thread) {
    return {
      verified: false,
      reason: "missing_golden_thread",
      message: "No Golden Thread found in identity",
      verifiedAt: now,
    };
  }

  // Check for missing ticket
  if (identity.golden_thread.ticket_id === "MISSING") {
    return {
      verified: false,
      reason: "missing_ticket",
      message: "Golden Thread has placeholder ticket ID",
      verifiedAt: now,
    };
  }

  // Verify hash
  const components: GoldenThreadComponents = {
    ticket_id: identity.golden_thread.ticket_id,
    approved_by: identity.golden_thread.approved_by,
    approved_at: identity.golden_thread.approved_at,
  };

  const hashResult = computeGoldenThreadHashSync(components);
  const expectedHash = identity.golden_thread_hash;

  if (hashResult.hash !== expectedHash) {
    return {
      verified: false,
      reason: "hash_mismatch",
      message: "Golden Thread hash mismatch - data may have been tampered with",
      computedHash: hashResult.hash,
      expectedHash,
      verifiedAt: now,
    };
  }

  // Check approval expiry if enabled
  if (!options.allowExpiredApprovals) {
    const graceDays = options.approvalGracePeriodDays ?? 365;
    const approvalDate = new Date(identity.golden_thread.approved_at);
    const expiryDate = new Date(approvalDate);
    expiryDate.setDate(expiryDate.getDate() + graceDays);

    if (new Date() > expiryDate) {
      return {
        verified: false,
        reason: "expired_approval",
        message: `Golden Thread approval expired on ${expiryDate.toISOString()}`,
        computedHash: hashResult.hash,
        expectedHash,
        verifiedAt: now,
      };
    }
  }

  return {
    verified: true,
    message: "Golden Thread verified successfully",
    computedHash: hashResult.hash,
    expectedHash,
    verifiedAt: now,
  };
}

/**
 * Verifies the Golden Thread for an asset card.
 *
 * @param asset The asset card to verify
 * @param options Verification options
 * @returns Verification result
 */
export function verifyAssetGoldenThread(
  asset: AssetCard,
  options: VerificationOptions = {}
): GoldenThreadVerificationResult {
  const now = new Date().toISOString();

  if (options.skipVerification) {
    return {
      verified: true,
      message: "Verification skipped (disabled)",
      verifiedAt: now,
    };
  }

  // Extract components
  const components = extractGoldenThreadComponents(asset);

  if (!components) {
    return {
      verified: false,
      reason: "missing_golden_thread",
      message: "Could not extract Golden Thread from asset card",
      verifiedAt: now,
    };
  }

  // Check if we have an expected hash to verify against
  if (asset.golden_thread?.hash) {
    const verificationResult = verifyGoldenThreadHashSync(
      components,
      asset.golden_thread.hash
    );

    if (!verificationResult.verified) {
      return {
        verified: false,
        reason: "hash_mismatch",
        message: "Golden Thread hash mismatch",
        computedHash: verificationResult.computed,
        expectedHash: verificationResult.expected,
        verifiedAt: now,
      };
    }

    return {
      verified: true,
      message: "Golden Thread verified successfully",
      computedHash: verificationResult.computed,
      expectedHash: verificationResult.expected,
      verifiedAt: now,
    };
  }

  // No hash to verify, but components exist - compute and return
  const hashResult = computeGoldenThreadHashSync(components);
  return {
    verified: true,
    message: "Golden Thread components valid (no hash to verify)",
    computedHash: hashResult.hash,
    verifiedAt: now,
  };
}

/**
 * Async verification with external verifier support.
 *
 * @param identity The runtime identity to verify
 * @param options Verification options including external verifier
 * @returns Verification result
 */
export async function verifyRuntimeGoldenThreadAsync(
  identity: RuntimeIdentity,
  options: VerificationOptions = {}
): Promise<GoldenThreadVerificationResult> {
  // First do basic verification
  const basicResult = verifyRuntimeGoldenThread(identity, {
    ...options,
    // Don't call external verifier in sync version
  });

  if (!basicResult.verified) {
    return basicResult;
  }

  // If external verifier is provided, call it
  if (options.externalVerifier && identity.golden_thread) {
    const components: GoldenThreadComponents = {
      ticket_id: identity.golden_thread.ticket_id,
      approved_by: identity.golden_thread.approved_by,
      approved_at: identity.golden_thread.approved_at,
    };

    try {
      const externalResult = await options.externalVerifier(components);
      if (!externalResult) {
        return {
          verified: false,
          reason: "external_verification_failed",
          message: "External verification failed (ticket system check)",
          computedHash: basicResult.computedHash,
          expectedHash: basicResult.expectedHash,
          verifiedAt: new Date().toISOString(),
        };
      }
    } catch (error) {
      return {
        verified: false,
        reason: "external_verification_failed",
        message: `External verification error: ${error instanceof Error ? error.message : String(error)}`,
        computedHash: basicResult.computedHash,
        expectedHash: basicResult.expectedHash,
        verifiedAt: new Date().toISOString(),
      };
    }
  }

  return basicResult;
}

/**
 * Creates a verification report for audit purposes.
 */
export interface VerificationReport {
  /** Identity instance ID */
  instanceId: string;
  /** Asset ID */
  assetId: string;
  /** Verification result */
  result: GoldenThreadVerificationResult;
  /** Identity risk level */
  riskLevel: string;
  /** Identity operating mode */
  mode: string;
  /** Verification method used */
  method: "sync" | "async" | "skipped";
}

/**
 * Creates a verification report for an identity.
 */
export function createVerificationReport(
  identity: RuntimeIdentity,
  result: GoldenThreadVerificationResult,
  method: "sync" | "async" | "skipped" = "sync"
): VerificationReport {
  return {
    instanceId: identity.instance_id,
    assetId: identity.asset_id,
    result,
    riskLevel: identity.risk_level,
    mode: identity.mode,
    method,
  };
}
