/**
 * Governance Token Validator - SPEC-PRT-003
 *
 * Validates JWT tokens for agent-to-agent authentication.
 * Verifies signature, expiration, and AIGOS-specific claims.
 */

import * as jose from "jose";
import type { RiskLevel } from "@aigrc/core";
import {
  AIGOS_TOKEN_TYPE,
  type GovernanceTokenPayload,
  type AigosTokenClaims,
} from "./generator.js";

/**
 * Validation error codes per SPEC-PRT-003
 */
export type TokenValidationErrorCode =
  | "INVALID_SIGNATURE"
  | "EXPIRED"
  | "NOT_YET_VALID"
  | "INVALID_ISSUER"
  | "INVALID_AUDIENCE"
  | "MISSING_CLAIMS"
  | "INVALID_TOKEN_TYPE"
  | "RISK_TOO_HIGH"
  | "KILL_SWITCH_DISABLED"
  | "AGENT_PAUSED"
  | "TERMINATION_PENDING"
  | "INVALID_LINEAGE"
  | "CAPABILITY_MISMATCH";

/**
 * Result of token validation
 */
export interface TokenValidationResult {
  valid: boolean;
  payload?: GovernanceTokenPayload;
  error?: {
    code: TokenValidationErrorCode;
    message: string;
  };
}

/**
 * Options for token validation
 */
export interface TokenValidationOptions {
  /** Expected issuer */
  issuer?: string;
  /** Expected audience */
  audience?: string | string[];
  /** Maximum acceptable risk level */
  maxRiskLevel?: RiskLevel;
  /** Require kill switch to be enabled */
  requireKillSwitch?: boolean;
  /** Clock tolerance in seconds for exp/nbf checks */
  clockToleranceSeconds?: number;
}

/**
 * Interface for governance token validator
 */
export interface IGovernanceTokenValidator {
  /**
   * Validate a governance token
   */
  validate(
    token: string,
    options?: TokenValidationOptions
  ): Promise<TokenValidationResult>;

  /**
   * Add a public key to the validator
   */
  addPublicKey(keyId: string, key: jose.KeyLike): void;

  /**
   * Remove a public key from the validator
   */
  removePublicKey(keyId: string): void;
}

// Risk level ordering for comparison
const RISK_LEVEL_ORDER: Record<RiskLevel, number> = {
  minimal: 0,
  limited: 1,
  high: 2,
  unacceptable: 3,
};

/**
 * Creates a governance token validator
 */
export function createGovernanceTokenValidator(config?: {
  publicKeys?: Map<string, jose.KeyLike>;
  defaultIssuer?: string;
}): IGovernanceTokenValidator {
  const publicKeys = new Map<string, jose.KeyLike>(config?.publicKeys);
  const defaultIssuer = config?.defaultIssuer ?? "aigos-runtime";

  return {
    async validate(
      token: string,
      options: TokenValidationOptions = {}
    ): Promise<TokenValidationResult> {
      const {
        issuer = defaultIssuer,
        audience = "aigos-agents",
        maxRiskLevel,
        requireKillSwitch = false,
        clockToleranceSeconds = 30,
      } = options;

      try {
        // Decode header to get key ID and verify token type
        const protectedHeader = jose.decodeProtectedHeader(token);

        if (protectedHeader.typ !== AIGOS_TOKEN_TYPE) {
          return {
            valid: false,
            error: {
              code: "INVALID_TOKEN_TYPE",
              message: `Expected token type ${AIGOS_TOKEN_TYPE}, got ${protectedHeader.typ}`,
            },
          };
        }

        const keyId = protectedHeader.kid;
        if (!keyId || !publicKeys.has(keyId)) {
          return {
            valid: false,
            error: {
              code: "INVALID_SIGNATURE",
              message: `Unknown key ID: ${keyId}`,
            },
          };
        }

        const publicKey = publicKeys.get(keyId)!;

        // Verify signature and standard claims
        let payload: jose.JWTPayload;
        try {
          const result = await jose.jwtVerify(token, publicKey, {
            issuer,
            audience,
            clockTolerance: clockToleranceSeconds,
          });
          payload = result.payload;
        } catch (err) {
          if (err instanceof jose.errors.JWTExpired) {
            return {
              valid: false,
              error: {
                code: "EXPIRED",
                message: "Token has expired",
              },
            };
          }
          if (err instanceof jose.errors.JWTClaimValidationFailed) {
            const message = (err as Error).message;
            if (message.includes("iss")) {
              return {
                valid: false,
                error: {
                  code: "INVALID_ISSUER",
                  message: `Invalid issuer: ${message}`,
                },
              };
            }
            if (message.includes("aud")) {
              return {
                valid: false,
                error: {
                  code: "INVALID_AUDIENCE",
                  message: `Invalid audience: ${message}`,
                },
              };
            }
            if (message.includes("nbf")) {
              return {
                valid: false,
                error: {
                  code: "NOT_YET_VALID",
                  message: "Token is not yet valid",
                },
              };
            }
          }
          return {
            valid: false,
            error: {
              code: "INVALID_SIGNATURE",
              message: `Signature verification failed: ${(err as Error).message}`,
            },
          };
        }

        // Validate AIGOS-specific claims
        const aigos = payload.aigos as AigosTokenClaims | undefined;
        if (!aigos) {
          return {
            valid: false,
            error: {
              code: "MISSING_CLAIMS",
              message: "Missing aigos claims in token",
            },
          };
        }

        // Validate required claim structure
        if (!aigos.identity || !aigos.governance || !aigos.control || !aigos.capabilities || !aigos.lineage) {
          return {
            valid: false,
            error: {
              code: "MISSING_CLAIMS",
              message: "Incomplete aigos claims structure",
            },
          };
        }

        // Check risk level
        if (maxRiskLevel) {
          const tokenRiskLevel = aigos.governance.risk_level;
          if (RISK_LEVEL_ORDER[tokenRiskLevel] > RISK_LEVEL_ORDER[maxRiskLevel]) {
            return {
              valid: false,
              error: {
                code: "RISK_TOO_HIGH",
                message: `Token risk level ${tokenRiskLevel} exceeds maximum ${maxRiskLevel}`,
              },
            };
          }
        }

        // Check kill switch requirement
        if (requireKillSwitch && !aigos.control.kill_switch.enabled) {
          return {
            valid: false,
            error: {
              code: "KILL_SWITCH_DISABLED",
              message: "Agent must have kill switch enabled",
            },
          };
        }

        // Check if agent is paused
        if (aigos.control.paused) {
          return {
            valid: false,
            error: {
              code: "AGENT_PAUSED",
              message: "Agent is currently paused",
            },
          };
        }

        // Check if termination is pending
        if (aigos.control.termination_pending) {
          return {
            valid: false,
            error: {
              code: "TERMINATION_PENDING",
              message: "Agent has termination pending",
            },
          };
        }

        // Validate lineage
        if (aigos.lineage.generation_depth < 0) {
          return {
            valid: false,
            error: {
              code: "INVALID_LINEAGE",
              message: "Invalid generation depth",
            },
          };
        }

        return {
          valid: true,
          payload: payload as unknown as GovernanceTokenPayload,
        };
      } catch (err) {
        return {
          valid: false,
          error: {
            code: "INVALID_SIGNATURE",
            message: `Token validation failed: ${(err as Error).message}`,
          },
        };
      }
    },

    addPublicKey(keyId: string, key: jose.KeyLike): void {
      publicKeys.set(keyId, key);
    },

    removePublicKey(keyId: string): void {
      publicKeys.delete(keyId);
    },
  };
}

/**
 * Extract claims from a token without validating signature
 * Useful for debugging or logging
 */
export function decodeTokenClaims(token: string): GovernanceTokenPayload | null {
  try {
    const payload = jose.decodeJwt(token);
    return payload as unknown as GovernanceTokenPayload;
  } catch {
    return null;
  }
}

/**
 * Extract header from a token
 */
export function decodeTokenHeader(token: string): jose.ProtectedHeaderParameters | null {
  try {
    return jose.decodeProtectedHeader(token);
  } catch {
    return null;
  }
}
