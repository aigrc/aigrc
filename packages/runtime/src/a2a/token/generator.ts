/**
 * Governance Token Generator - SPEC-PRT-003
 *
 * Generates JWT tokens for agent-to-agent authentication.
 * Tokens include identity, governance, control, capabilities, and lineage claims.
 */

import * as jose from "jose";
import type { RiskLevel, RuntimeIdentity } from "@aigrc/core";

// Token header type
export const AIGOS_TOKEN_TYPE = "AIGOS-GOV+jwt" as const;

// Default TTL: 5 minutes
export const DEFAULT_TTL_SECONDS = 300;

// Supported algorithms
export type TokenAlgorithm = "ES256" | "RS256";

/**
 * Identity claims in the token
 */
export interface TokenIdentityClaims {
  instance_id: string;
  asset_id: string;
  asset_name: string;
  asset_version: string;
}

/**
 * Golden thread information
 */
export interface TokenGoldenThread {
  hash: string;
  verified: boolean;
  ticket_id?: string;
}

/**
 * Governance claims in the token
 */
export interface TokenGovernanceClaims {
  risk_level: RiskLevel;
  golden_thread: TokenGoldenThread;
  mode: "NORMAL" | "SANDBOX" | "RESTRICTED";
}

/**
 * Kill switch status
 */
export interface TokenKillSwitch {
  enabled: boolean;
  channel: "sse" | "polling" | "file";
}

/**
 * Control claims in the token
 */
export interface TokenControlClaims {
  kill_switch: TokenKillSwitch;
  paused: boolean;
  termination_pending: boolean;
}

/**
 * Capability claims in the token
 */
export interface TokenCapabilityClaims {
  hash: string;
  tools: string[];
  max_budget_usd: number | null;
  can_spawn: boolean;
  max_child_depth: number;
}

/**
 * Lineage claims in the token
 */
export interface TokenLineageClaims {
  generation_depth: number;
  parent_instance_id: string | null;
  root_instance_id: string;
}

/**
 * AIGOS-specific claims in the token payload
 */
export interface AigosTokenClaims {
  version: string;
  identity: TokenIdentityClaims;
  governance: TokenGovernanceClaims;
  control: TokenControlClaims;
  capabilities: TokenCapabilityClaims;
  lineage: TokenLineageClaims;
}

/**
 * Full token payload structure
 */
export interface GovernanceTokenPayload {
  // Standard JWT claims
  iss: string;
  sub: string;
  aud: string | string[];
  exp: number;
  iat: number;
  nbf: number;
  jti: string;

  // AIGOS-specific claims
  aigos: AigosTokenClaims;
}

/**
 * Options for generating a governance token
 */
export interface TokenGenerationOptions {
  /** Signing algorithm (default: ES256) */
  algorithm?: TokenAlgorithm;
  /** Token TTL in seconds (default: 300 = 5 minutes) */
  ttlSeconds?: number;
  /** Target audience */
  audience?: string | string[];
  /** Key ID for key rotation */
  keyId?: string;
}

/**
 * Input for generating a token from runtime identity
 */
export interface TokenGenerationInput {
  identity: RuntimeIdentity;
  goldenThread: TokenGoldenThread;
  mode: "NORMAL" | "SANDBOX" | "RESTRICTED";
  killSwitch: TokenKillSwitch;
  paused?: boolean;
  terminationPending?: boolean;
  capabilities: {
    hash: string;
    tools: string[];
    maxBudgetUsd: number | null;
    canSpawn: boolean;
    maxChildDepth: number;
  };
}

/**
 * Result of token generation
 */
export interface TokenGenerationResult {
  token: string;
  payload: GovernanceTokenPayload;
  expiresAt: Date;
}

/**
 * Interface for governance token generator
 */
export interface IGovernanceTokenGenerator {
  /**
   * Generate a governance token
   */
  generate(
    input: TokenGenerationInput,
    options?: TokenGenerationOptions
  ): Promise<TokenGenerationResult>;

  /**
   * Get the public key for token verification
   */
  getPublicKey(): Promise<jose.JWK>;
}

/**
 * Creates a governance token generator
 */
export function createGovernanceTokenGenerator(config: {
  privateKey: jose.KeyLike | Uint8Array;
  publicKey: jose.KeyLike;
  keyId: string;
  issuer?: string;
}): IGovernanceTokenGenerator {
  const { privateKey, publicKey, keyId, issuer = "aigos-runtime" } = config;

  return {
    async generate(
      input: TokenGenerationInput,
      options: TokenGenerationOptions = {}
    ): Promise<TokenGenerationResult> {
      const {
        algorithm = "ES256",
        ttlSeconds = DEFAULT_TTL_SECONDS,
        audience = "aigos-agents",
        keyId: optKeyId,
      } = options;

      const now = Math.floor(Date.now() / 1000);
      const exp = now + ttlSeconds;
      const jti = generateTokenId();

      const payload: GovernanceTokenPayload = {
        iss: issuer,
        sub: input.identity.instance_id,
        aud: audience,
        iat: now,
        nbf: now,
        exp,
        jti,
        aigos: {
          version: "1.0",
          identity: {
            instance_id: input.identity.instance_id,
            asset_id: input.identity.asset_id,
            asset_name: input.identity.asset_name,
            asset_version: input.identity.asset_version,
          },
          governance: {
            risk_level: input.identity.risk_level,
            golden_thread: input.goldenThread,
            mode: input.mode,
          },
          control: {
            kill_switch: input.killSwitch,
            paused: input.paused ?? false,
            termination_pending: input.terminationPending ?? false,
          },
          capabilities: {
            hash: input.capabilities.hash,
            tools: input.capabilities.tools,
            max_budget_usd: input.capabilities.maxBudgetUsd,
            can_spawn: input.capabilities.canSpawn,
            max_child_depth: input.capabilities.maxChildDepth,
          },
          lineage: {
            generation_depth: input.identity.lineage.generation_depth,
            parent_instance_id: input.identity.lineage.parent_instance_id,
            root_instance_id: input.identity.lineage.root_instance_id,
          },
        },
      };

      const token = await new jose.SignJWT(payload as unknown as jose.JWTPayload)
        .setProtectedHeader({
          alg: algorithm,
          typ: AIGOS_TOKEN_TYPE,
          kid: optKeyId ?? keyId,
        })
        .sign(privateKey);

      return {
        token,
        payload,
        expiresAt: new Date(exp * 1000),
      };
    },

    async getPublicKey(): Promise<jose.JWK> {
      return jose.exportJWK(publicKey);
    },
  };
}

/**
 * Generate a unique token ID
 */
function generateTokenId(): string {
  const timestamp = Date.now().toString(36);
  const random = Math.random().toString(36).substring(2, 10);
  return `aigos-${timestamp}-${random}`;
}

/**
 * Generate an ES256 key pair for token signing
 */
export async function generateES256KeyPair(): Promise<{
  privateKey: jose.KeyLike;
  publicKey: jose.KeyLike;
  keyId: string;
}> {
  const { privateKey, publicKey } = await jose.generateKeyPair("ES256");
  const keyId = `aigos-es256-${Date.now().toString(36)}`;

  return { privateKey, publicKey, keyId };
}

/**
 * Generate an RS256 key pair for token signing
 */
export async function generateRS256KeyPair(): Promise<{
  privateKey: jose.KeyLike;
  publicKey: jose.KeyLike;
  keyId: string;
}> {
  const { privateKey, publicKey } = await jose.generateKeyPair("RS256");
  const keyId = `aigos-rs256-${Date.now().toString(36)}`;

  return { privateKey, publicKey, keyId };
}
