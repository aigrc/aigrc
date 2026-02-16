/**
 * A2A Token Generator (AIGOS-901)
 *
 * Generates JWT governance tokens for agent-to-agent authentication.
 * Implements SPEC-PRT-003 token format.
 */

import type {
  RuntimeIdentity,
  GovernanceTokenPayload,
  CapabilitiesManifest,
} from "@aigrc/core";

import type {
  TokenGenerator,
  TokenGeneratorConfig,
  GenerateTokenOptions,
  GeneratedToken,
  SigningKey,
  SigningAlgorithm,
  A2AEvent,
  A2AEventHandler,
} from "./types.js";

import {
  JWT_TYPE,
  DEFAULT_TOKEN_TTL_SECONDS,
} from "./types.js";

// ─────────────────────────────────────────────────────────────────
// DEFAULT CONFIGURATION
// ─────────────────────────────────────────────────────────────────

const DEFAULT_CONFIG: TokenGeneratorConfig = {
  signingKey: {
    kid: "default",
    alg: "HS256",
    secret: undefined, // Must be provided
  },
  defaultTtlSeconds: DEFAULT_TOKEN_TTL_SECONDS,
  issuer: "aigos-runtime",
  defaultAudience: "aigos-agents",
  includeControlClaims: true,
  includeCapabilityHash: true,
};

// ─────────────────────────────────────────────────────────────────
// JWT UTILITIES
// ─────────────────────────────────────────────────────────────────

/**
 * Base64URL encode
 */
function base64UrlEncode(data: string | ArrayBuffer): string {
  const bytes = typeof data === "string"
    ? new TextEncoder().encode(data)
    : new Uint8Array(data);

  const base64 = btoa(String.fromCharCode(...bytes));
  return base64
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

/**
 * Generate a UUID v4
 */
function generateUUID(): string {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  // Fallback for environments without crypto.randomUUID
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

/**
 * Compute SHA-256 hash of capabilities manifest
 */
async function computeCapabilityHash(manifest: CapabilitiesManifest): Promise<string> {
  const canonical = JSON.stringify({
    allowed_tools: [...manifest.allowed_tools].sort(),
    denied_tools: [...manifest.denied_tools].sort(),
    allowed_domains: [...manifest.allowed_domains].sort(),
    denied_domains: [...manifest.denied_domains].sort(),
    max_cost_per_session: manifest.max_cost_per_session,
    max_cost_per_day: manifest.max_cost_per_day,
    may_spawn_children: manifest.may_spawn_children,
    max_child_depth: manifest.max_child_depth,
  });

  const data = new TextEncoder().encode(canonical);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return "sha256:" + hashArray.map((b) => b.toString(16).padStart(2, "0")).join("");
}

/**
 * Sign JWT payload with the configured algorithm
 */
async function signJWT(
  header: Record<string, unknown>,
  payload: Record<string, unknown>,
  key: SigningKey
): Promise<string> {
  const headerB64 = base64UrlEncode(JSON.stringify(header));
  const payloadB64 = base64UrlEncode(JSON.stringify(payload));
  const signingInput = `${headerB64}.${payloadB64}`;

  let signature: string;

  switch (key.alg) {
    case "HS256": {
      if (!key.secret) {
        throw new Error("HS256 requires a secret");
      }
      const keyData = new TextEncoder().encode(key.secret);
      const cryptoKey = await crypto.subtle.importKey(
        "raw",
        keyData,
        { name: "HMAC", hash: "SHA-256" },
        false,
        ["sign"]
      );
      const sigBuffer = await crypto.subtle.sign(
        "HMAC",
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );
      signature = base64UrlEncode(sigBuffer);
      break;
    }

    case "ES256": {
      if (!key.privateKey) {
        throw new Error("ES256 requires a private key");
      }
      let cryptoKey: CryptoKey;
      if (typeof key.privateKey === "object" && key.privateKey !== null && "type" in (key.privateKey as object)) {
        cryptoKey = key.privateKey as CryptoKey;
      } else {
        // Import PEM key
        const keyStr = key.privateKey as string;
        const pemContents = keyStr
          .replace(/-----BEGIN PRIVATE KEY-----/g, "")
          .replace(/-----END PRIVATE KEY-----/g, "")
          .replace(/\s/g, "");
        const keyBuffer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
        cryptoKey = await crypto.subtle.importKey(
          "pkcs8",
          keyBuffer,
          { name: "ECDSA", namedCurve: "P-256" },
          false,
          ["sign"]
        );
      }
      const sigBuffer = await crypto.subtle.sign(
        { name: "ECDSA", hash: "SHA-256" },
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );
      signature = base64UrlEncode(sigBuffer);
      break;
    }

    case "RS256": {
      if (!key.privateKey) {
        throw new Error("RS256 requires a private key");
      }
      let cryptoKey: CryptoKey;
      if (typeof key.privateKey === "object" && key.privateKey !== null && "type" in (key.privateKey as object)) {
        cryptoKey = key.privateKey as CryptoKey;
      } else {
        // Import PEM key
        const keyStr = key.privateKey as string;
        const pemContents = keyStr
          .replace(/-----BEGIN PRIVATE KEY-----/g, "")
          .replace(/-----END PRIVATE KEY-----/g, "")
          .replace(/\s/g, "");
        const keyBuffer = Uint8Array.from(atob(pemContents), (c) => c.charCodeAt(0));
        cryptoKey = await crypto.subtle.importKey(
          "pkcs8",
          keyBuffer,
          { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" },
          false,
          ["sign"]
        );
      }
      const sigBuffer = await crypto.subtle.sign(
        "RSASSA-PKCS1-v1_5",
        cryptoKey,
        new TextEncoder().encode(signingInput)
      );
      signature = base64UrlEncode(sigBuffer);
      break;
    }

    default:
      throw new Error(`Unsupported algorithm: ${key.alg}`);
  }

  return `${signingInput}.${signature}`;
}

// ─────────────────────────────────────────────────────────────────
// TOKEN GENERATOR CLASS
// ─────────────────────────────────────────────────────────────────

/**
 * A2A Token Generator
 *
 * Generates JWT governance tokens for agent-to-agent authentication.
 */
export class A2ATokenGenerator implements TokenGenerator {
  private config: TokenGeneratorConfig;
  private eventHandlers: A2AEventHandler[] = [];

  constructor(config: Partial<TokenGeneratorConfig>) {
    // Validate required fields
    if (!config.signingKey?.secret && !config.signingKey?.privateKey) {
      throw new Error("TokenGenerator requires a signing key (secret or privateKey)");
    }

    this.config = {
      ...DEFAULT_CONFIG,
      ...config,
      signingKey: {
        ...DEFAULT_CONFIG.signingKey,
        ...config.signingKey,
      },
    };
  }

  /**
   * Generate a governance token for the given identity
   */
  async generate(options: GenerateTokenOptions): Promise<GeneratedToken> {
    const { identity } = options;
    const now = Math.floor(Date.now() / 1000);
    const ttl = options.ttlSeconds ?? this.config.defaultTtlSeconds;
    const jti = generateUUID();

    // Build the payload
    const payload: GovernanceTokenPayload = {
      // Standard JWT claims
      iss: this.config.issuer as "aigos-runtime",
      sub: identity.instance_id,
      aud: options.audience ?? this.config.defaultAudience,
      exp: now + ttl,
      iat: now,
      nbf: now,
      jti,

      // AIGOS claims
      aigos: {
        identity: {
          instance_id: identity.instance_id,
          asset_id: identity.asset_id,
          asset_name: identity.asset_name,
          asset_version: identity.asset_version,
        },
        governance: {
          risk_level: identity.risk_level,
          golden_thread: {
            hash: identity.golden_thread_hash,
            verified: identity.verified,
            ticket_id: identity.golden_thread.ticket_id,
          },
          mode: identity.mode,
        },
        control: this.config.includeControlClaims
          ? {
              kill_switch: options.killSwitch ?? { enabled: true, channel: "sse" },
              paused: options.paused ?? false,
              termination_pending: options.terminationPending ?? false,
            }
          : {
              kill_switch: { enabled: false, channel: "sse" },
              paused: false,
              termination_pending: false,
            },
        capabilities: {
          hash: this.config.includeCapabilityHash
            ? await computeCapabilityHash(identity.capabilities_manifest)
            : "",
          tools: identity.capabilities_manifest.allowed_tools.slice(0, 10), // Limit for token size
          max_budget_usd: identity.capabilities_manifest.max_cost_per_session ?? null,
          can_spawn: identity.capabilities_manifest.may_spawn_children,
          max_child_depth: identity.capabilities_manifest.max_child_depth,
        },
        lineage: {
          generation_depth: identity.lineage.generation_depth,
          parent_instance_id: identity.lineage.parent_instance_id,
          root_instance_id: identity.lineage.root_instance_id,
        },
      },
    };

    // Build JWT header
    const header = {
      alg: this.config.signingKey.alg,
      typ: JWT_TYPE,
      kid: this.config.signingKey.kid,
    };

    // Sign the token
    const token = await signJWT(header, payload, this.config.signingKey);

    const result: GeneratedToken = {
      token,
      payload,
      jti,
      expiresAt: payload.exp,
      issuedAt: payload.iat,
    };

    // Emit event
    this.emitEvent({
      type: "token.generated",
      timestamp: new Date().toISOString(),
      instanceId: identity.instance_id,
      jti,
      audience: payload.aud,
      expiresAt: payload.exp,
    });

    return result;
  }

  /**
   * Get the signing key ID
   */
  getKeyId(): string {
    return this.config.signingKey.kid;
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

  private emitEvent(event: A2AEvent): void {
    for (const handler of this.eventHandlers) {
      try {
        handler(event);
      } catch (error) {
        console.error("A2A event handler error:", error);
      }
    }
  }
}

// ─────────────────────────────────────────────────────────────────
// FACTORY FUNCTION
// ─────────────────────────────────────────────────────────────────

/**
 * Create an A2A token generator
 */
export function createTokenGenerator(
  config: Partial<TokenGeneratorConfig>
): A2ATokenGenerator {
  return new A2ATokenGenerator(config);
}
