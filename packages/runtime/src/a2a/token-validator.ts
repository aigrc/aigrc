/**
 * A2A Token Validator (AIGOS-902)
 *
 * Validates JWT governance tokens from other agents.
 * Implements SPEC-PRT-003 token validation.
 */

import {
  GovernanceTokenPayloadSchema,
  type GovernanceTokenPayload,
} from "@aigrc/core";

import type {
  TokenValidator,
  TokenValidatorConfig,
  TokenValidationResult,
  TokenValidationErrorCode,
  TokenValidationWarning,
  SigningKey,
  A2AEvent,
  A2AEventHandler,
} from "./types.js";

import {
  JWT_TYPE,
  DEFAULT_MAX_CLOCK_SKEW_SECONDS,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TokenValidatorConfig = {
  trustedKeys: new Map(),
  maxClockSkewSeconds: DEFAULT_MAX_CLOCK_SKEW_SECONDS,
  requiredIssuer: "aigos-runtime",
  requiredAudience: ["aigos-agents"],
  validateControlClaims: true,
  rejectPausedAgents: true,
  rejectTerminationPending: true,
};

// ─────────────────────────────────────────────────────────────────
// JWT UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Base64URL decode
 */
function base64UrlDecode(str: string): string {
  // Pad with '=' to make the length a multiple of 4
  let padded = str.replace(/-/g, "+").replace(/_/g, "/");
  const padding = (4 - (padded.length % 4)) % 4;
  padded += "=".repeat(padding);

  const bytes = atob(padded);
  return bytes;
}

/**
 * Base64URL decode to ArrayBuffer
 */
function base64UrlDecodeBuffer(str: string): ArrayBuffer {
  const decoded = base64UrlDecode(str);
  const bytes = new Uint8Array(decoded.length);
  for (let i = 0; i < decoded.length; i++) {
    bytes[i] = decoded.charCodeAt(i);
  }
  return bytes.buffer;
}

/**
 * Parse JWT without verification (for header inspection)
 */
function parseJWT(token: string): {
  header: Record<string, unknown>;
  payload: Record<string, unknown>;
  signature: string;
  signingInput: string;
} | null {
  const parts = token.split(".");
  if (parts.length !== 3) {
    return null;
  }

  try {
    const header = JSON.parse(base64UrlDecode(parts[0]));
    const payload = JSON.parse(base64UrlDecode(parts[1]));
    return {
      header,
      payload,
      signature: parts[2],
      signingInput: `${parts[0]}.${parts[1]}`,
    };
  } catch {
    return null;
  }
}

/**
 * Verify JWT signature
 */
async function verifySignature(
  signingInput: string,
  signature: string,
  key: SigningKey
): Promise<boolean> {
  const signatureBuffer = base64UrlDecodeBuffer(signature);
  const dataBuffer = new TextEncoder().encode(signingInput);

  switch (key.alg) {
    case "HS256": {
      if (!key.secret) {
        return false;
      }
      const keyData = new TextEncoder().encode(key.secret);
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["verify"]
      );
      return crypto.subtle.verify("HMAC", cryptoKey, signatureBuffer, dataBuffer);
    }

    case "ES256": {
      if (!key.publicKey) {
        return false;
      }
      let cryptoKey: CryptoKey;
      if (typeof key.publicKey === "object" && key.publicKey !== null && "type" in (key.publicKey as object)) {
        cryptoKey = key.publicKey as CryptoKey;
      } else {
        // Import PEM key
        const keyStr = key.publicKey as string;
        const pemContents = keyStr
          .replace(/-----BEGIN PUBLIC KEY-----/g, "")
          .replace(/-----END PUBLIC KEY-----/g, "")
          .replace(/\s/g, "");
        const keyBuffer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
        cryptoKey = await crypto.subtle.importKey(
          "spki",
          keyBuffer,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["verify"]
        );
      }
      return crypto.subtle.verify(
        { name: "ECDSA", hash: "SHA-256" },
        cryptoKey,
        signatureBuffer,
        dataBuffer
      );
    }

    case "RS256": {
      if (!key.publicKey) {
        return false;
      }
      let cryptoKey: CryptoKey;
      if (typeof key.publicKey === "object" && key.publicKey !== null && "type" in (key.publicKey as object)) {
        cryptoKey = key.publicKey as CryptoKey;
      } else {
        // Import PEM key
        const keyStr = key.publicKey as string;
        const pemContents = keyStr
          .replace(/-----BEGIN PUBLIC KEY-----/g, "")
          .replace(/-----END PUBLIC KEY-----/g, "")
          .replace(/\s/g, "");
        const keyBuffer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
        cryptoKey = await crypto.subtle.importKey(
          "spki",
          keyBuffer,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["verify"]
        );
      }
      return crypto.subtle.verify(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        signatureBuffer,
        dataBuffer
      );
    }

    default:
      return false;
  }
}

// ─────────────────────────────────────────────────────────────────
// TOKEN VALIDATOR CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Token Validator
 *
 * Validates JWT governance tokens from other agents.
 */
export class A2ATokenValidator implements TokenValidator {
  private config: TokenValidatorConfig;
  private eventHandlers: A2AEventHandler[] = [];
  private keyCache: Map<string, SigningKey> = new Map();
  private lastKeyRefresh: number = 0;
  private keyRefreshInterval: number = 3600000; // 1 hour

  constructor(config: Partial<TokenValidatorConfig>) {
    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      trustedKeys: new Map([
        ...DEFAULT_CONFIG.trustedKeys,
        ...(config.trustedKeys ?? new Map()),
      ]),
    };

    // Initialize key cache from config
    for (const [kid, key] of this.config.trustedKeys) {
      this.keyCache.set(kid, key);
    }
  }

  /**
   * Validate a governance token
   */
  async validate(token: string): Promise<TokenValidationResult> {
    // Parse the token
    const parsed = parseJWT(token);
    if (!parsed) {
      return this.failure("INVALID_FORMAT", "Invalid JWT format");
    }

    const { header, payload, signature, signingInput } = parsed;

    // Validate header
    if (header.typ !== JWT_TYPE && header.typ !== "JWT") {
      return this.failure("INVALID_FORMAT", `Invalid token type: ${header.typ}`);
    }

    const alg = header.alg as string;
    if (!["HS256", "ES256", "RS256"].includes(alg)) {
      return this.failure("INVALID_FORMAT", `Unsupported algorithm: ${alg}`);
    }

    // Get the signing key
    const kid = header.kid as string;
    let key = this.keyCache.get(kid);

    // Try to refresh keys if not found and JWKS is configured
    if (!key && this.config.jwksEndpoint) {
      await this.refreshKeys();
      key = this.keyCache.get(kid);
    }

    if (!key) {
      return this.failure("KEY_NOT_FOUND", `Signing key not found: ${kid}`);
    }

    // Verify signature
    const signatureValid = await verifySignature(signingInput, signature, key);
    if (!signatureValid) {
      this.emitEvent({
        type: "token.validation_failed",
        timestamp: new Date().toISOString(),
        instanceId: (payload as GovernanceTokenPayload).sub ?? "unknown",
        errorCode: "INVALID_SIGNATURE",
        errorMessage: "Signature verification failed",
      });
      return this.failure("INVALID_SIGNATURE", "Signature verification failed");
    }

    // Validate timestamp claims
    const now = Math.floor(Date.now() / 1000);
    const skew = this.config.maxClockSkewSeconds;

    const exp = payload.exp as number;
    if (exp && exp + skew < now) {
      return this.failure("EXPIRED", "Token has expired");
    }

    const nbf = payload.nbf as number;
    if (nbf && nbf - skew > now) {
      return this.failure("NOT_YET_VALID", "Token is not yet valid");
    }

    // Validate issuer
    const iss = payload.iss as string;
    if (iss !== this.config.requiredIssuer) {
      return this.failure("INVALID_ISSUER", `Invalid issuer: ${iss}`);
    }

    // Validate audience
    const aud = payload.aud as string | string[];
    const audArray = Array.isArray(aud) ? aud : [aud];
    const hasValidAudience = this.config.requiredAudience.some((reqAud) =>
      audArray.includes(reqAud)
    );
    if (!hasValidAudience) {
      return this.failure(
        "INVALID_AUDIENCE",
        `Invalid audience: ${JSON.stringify(aud)}`
      );
    }

    // Validate AIGOS claims structure
    const aigosPayload = payload as unknown;
    const parseResult = GovernanceTokenPayloadSchema.safeParse(aigosPayload);
    if (!parseResult.success) {
      return this.failure(
        "INVALID_CLAIMS",
        `Invalid AIGOS claims: ${parseResult.error.message}`
      );
    }

    const validPayload = parseResult.data;
    const warnings: TokenValidationWarning[] = [];

    // Validate control claims if configured
    if (this.config.validateControlClaims) {
      if (this.config.rejectPausedAgents && validPayload.aigos.control.paused) {
        return this.failure("PAUSED_AGENT", "Agent is paused");
      }

      if (
        this.config.rejectTerminationPending &&
        validPayload.aigos.control.termination_pending
      ) {
        return this.failure(
          "TERMINATION_PENDING",
          "Agent termination is pending"
        );
      }

      // Warn if kill switch is disabled
      if (!validPayload.aigos.control.kill_switch.enabled) {
        warnings.push({
          code: "KILL_SWITCH_DISABLED",
          message: "Agent does not have kill switch enabled",
        });
      }
    }

    // Warn if not verified
    if (!validPayload.aigos.governance.golden_thread.verified) {
      warnings.push({
        code: "GOLDEN_THREAD_NOT_VERIFIED",
        message: "Agent Golden Thread is not verified",
      });
    }

    // Emit success event
    this.emitEvent({
      type: "token.validated",
      timestamp: new Date().toISOString(),
      instanceId: validPayload.sub,
      jti: validPayload.jti,
      issuerInstanceId: validPayload.aigos.identity.instance_id,
      issuerAssetId: validPayload.aigos.identity.asset_id,
    });

    return {
      valid: true,
      payload: validPayload,
      warnings: warnings.length > 0 ? warnings : undefined,
    };
  }

  /**
   * Refresh keys from JWKS endpoint
   */
  async refreshKeys(): Promise<void> {
    if (!this.config.jwksEndpoint) {
      return;
    }

    // Rate limit refreshes
    const now = Date.now();
    if (now - this.lastKeyRefresh < 60000) {
      // Minimum 1 minute between refreshes
      return;
    }

    try {
      const response = await fetch(this.config.jwksEndpoint);
      if (!response.ok) {
        throw new Error(`JWKS fetch failed: ${response.status}`);
      }

      const jwks = (await response.json()) as { keys: JWKKey[] };

      for (const jwk of jwks.keys) {
        if (jwk.use === "sig" && jwk.kid) {
          const key = await this.importJWK(jwk);
          if (key) {
            this.keyCache.set(jwk.kid, key);
          }
        }
      }

      this.lastKeyRefresh = now;
    } catch (error) {
      console.error("Failed to refresh JWKS:", error);
    }
  }

  /**
   * Add a trusted key
   */
  addTrustedKey(key: SigningKey): void {
    this.keyCache.set(key.kid, key);
    this.config.trustedKeys.set(key.kid, key);
  }

  /**
   * Remove a trusted key
   */
  removeTrustedKey(kid: string): void {
    this.keyCache.delete(kid);
    this.config.trustedKeys.delete(kid);
  }

  /**
   * Register an event handler
   */
  onEvent(handler: A2AEventHandler): () => void {
    this.eventHandlers.push(handler);
    return () => {
      const index = this.eventHandlers.indexOf(handler);
      if (index >= 0) {
        this.eventHandlers.splice(index, 1);
      }
    };
  }

  private failure(
    errorCode: TokenValidationErrorCode,
    errorMessage: string
  ): TokenValidationResult {
    return {
      valid: false,
      errorCode,
      errorMessage,
    };
  }

  private emitEvent(event: A2AEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("A2A event handler error:", error);
      }
    }
  }

  private async importJWK(jwk: JWKKey): Promise<SigningKey | null> {
    try {
      const alg = jwk.alg as "ES256" | "RS256" | undefined;

      if (jwk.kty === "EC" && alg === "ES256") {
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          jwk as JsonWebKey,
          { name: "ECDSA", namedCurve: "P-256" },
          true,
          ["verify"]
        );
        return {
          kid: jwk.kid!,
          alg: "ES256",
          publicKey,
        };
      }

      if (jwk.kty === "RSA" && alg === "RS256") {
        const publicKey = await crypto.subtle.importKey(
          "jwk",
          jwk as JsonWebKey,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          true,
          ["verify"]
        );
        return {
          kid: jwk.kid!,
          alg: "RS256",
          publicKey,
        };
      }

      return null;
    } catch (error) {
      console.error("Failed to import JWK:", error);
      return null;
    }
  }
}

/**
 * JWK key structure
 */
interface JWKKey {
  kty: string;
  use?: string;
  kid?: string;
  alg?: string;
  n?: string;
  e?: string;
  x?: string;
  y?: string;
  crv?: string;
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create an A2A token validator
 */
export function createTokenValidator(
  config: Partial<TokenValidatorConfig>
): A2ATokenValidator {
  return new A2ATokenValidator(config);
}
