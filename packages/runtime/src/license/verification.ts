// ─────────────────────────────────────────────────────────────────
// LICENSE SIGNATURE VERIFICATION (AIG-104)
// Support RS256/ES256 with JWKS key rotation
// ─────────────────────────────────────────────────────────────────

import * as jose from "jose";
import type { ParsedLicense, LicenseConfig, LicenseValidationResult, LicenseClaims } from "./types.js";
import { parseLicenseToken, parseLicenseClaims, calculateLicenseStatus } from "./parser.js";

/**
 * JWKS cache for key rotation
 */
let jwksCache: jose.JSONWebKeySet | null = null;
let jwksCacheExpiry: number = 0;
const JWKS_CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

/**
 * Fetch JWKS from endpoint with caching
 */
async function fetchJWKS(endpoint: string): Promise<jose.JSONWebKeySet> {
  const now = Date.now();
  if (jwksCache && now < jwksCacheExpiry) {
    return jwksCache;
  }

  const response = await fetch(endpoint);
  if (!response.ok) {
    throw new Error(`Failed to fetch JWKS: ${response.status} ${response.statusText}`);
  }

  jwksCache = await response.json() as jose.JSONWebKeySet;
  jwksCacheExpiry = now + JWKS_CACHE_TTL_MS;
  return jwksCache;
}

/**
 * Get verification key from JWKS
 */
async function getKeyFromJWKS(
  endpoint: string,
  keyId?: string
): Promise<jose.KeyLike | Uint8Array> {
  const jwks = await fetchJWKS(endpoint);
  const JWKS = jose.createLocalJWKSet(jwks);

  // Create a mock protected header for key lookup
  const protectedHeader: jose.JWTHeaderParameters = { alg: "RS256" };
  if (keyId) {
    protectedHeader.kid = keyId;
  }

  return JWKS(protectedHeader, { payload: "" } as jose.FlattenedJWSInput);
}

/**
 * Import public key from PEM format
 */
async function importPublicKey(publicKeyPem: string): Promise<jose.KeyLike> {
  // Detect algorithm from key format
  const isEC = publicKeyPem.includes("EC PUBLIC KEY") ||
               publicKeyPem.includes("-----BEGIN PUBLIC KEY-----");

  const algorithm = isEC ? "ES256" : "RS256";

  return jose.importSPKI(publicKeyPem, algorithm);
}

/**
 * Verify license JWT signature
 */
export async function verifyLicenseSignature(
  token: string,
  config: LicenseConfig
): Promise<{ verified: boolean; payload?: jose.JWTPayload; error?: string }> {
  try {
    let key: jose.KeyLike | Uint8Array;

    if (config.jwksEndpoint) {
      // Use JWKS for key rotation
      const { header } = parseLicenseToken(token);
      key = await getKeyFromJWKS(config.jwksEndpoint, header.kid);
    } else if (config.publicKey) {
      // Use static public key
      key = await importPublicKey(config.publicKey);
    } else {
      return {
        verified: false,
        error: "No verification key provided (jwksEndpoint or publicKey required)",
      };
    }

    const { payload } = await jose.jwtVerify(token, key, {
      issuer: "aigos-license",
      clockTolerance: 60, // 1 minute tolerance
    });

    return { verified: true, payload };
  } catch (error) {
    return {
      verified: false,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

/**
 * Full license verification with signature and claims validation
 */
export async function verifyLicense(
  token: string,
  config: LicenseConfig = {}
): Promise<LicenseValidationResult> {
  const errors: string[] = [];
  const gracePeriodDays = config.gracePeriodDays ?? 14;

  // Step 1: Verify signature
  const signatureResult = await verifyLicenseSignature(token, config);

  if (!signatureResult.verified) {
    errors.push(`Signature verification failed: ${signatureResult.error}`);

    // If offline mode is allowed, try to parse without verification
    if (config.allowOffline) {
      try {
        const { payload } = parseLicenseToken(token);
        const claims = parseLicenseClaims(payload);
        const statusInfo = calculateLicenseStatus(claims, gracePeriodDays);

        const license: ParsedLicense = {
          token,
          claims,
          status: statusInfo.status,
          expiresAt: statusInfo.expiresAt,
          daysUntilExpiration: statusInfo.daysUntilExpiration,
          signatureVerified: false,
          errors: [...errors, "Offline mode: signature not verified"],
        };

        return {
          valid: statusInfo.status === "valid" || statusInfo.status === "grace",
          license,
          errors: license.errors,
        };
      } catch (parseError) {
        errors.push(parseError instanceof Error ? parseError.message : String(parseError));
      }
    }

    return {
      valid: false,
      license: null,
      errors,
    };
  }

  // Step 2: Parse and validate claims
  let claims: LicenseClaims;
  try {
    claims = parseLicenseClaims(signatureResult.payload);
  } catch (error) {
    errors.push(error instanceof Error ? error.message : String(error));
    return {
      valid: false,
      license: null,
      errors,
    };
  }

  // Step 3: Check expiration status
  const statusInfo = calculateLicenseStatus(claims, gracePeriodDays);

  const license: ParsedLicense = {
    token,
    claims,
    status: statusInfo.status,
    expiresAt: statusInfo.expiresAt,
    daysUntilExpiration: statusInfo.daysUntilExpiration,
    signatureVerified: true,
    errors: [],
  };

  // Trigger callbacks if configured
  if (statusInfo.status === "grace" && config.onGracePeriod) {
    config.onGracePeriod(license, Math.abs(statusInfo.daysUntilExpiration));
  } else if (statusInfo.status === "expired" && config.onExpire) {
    config.onExpire(license);
  }

  const isValid = statusInfo.status === "valid" || statusInfo.status === "grace";

  return {
    valid: isValid,
    license,
    errors: isValid ? [] : [`License status: ${statusInfo.status}`],
  };
}

/**
 * Clear JWKS cache (for testing or forced refresh)
 */
export function clearJWKSCache(): void {
  jwksCache = null;
  jwksCacheExpiry = 0;
}

/**
 * Check if a token's signature algorithm is supported
 */
export function isSupportedAlgorithm(token: string): boolean {
  try {
    const { header } = parseLicenseToken(token);
    const supported = ["RS256", "RS384", "RS512", "ES256", "ES384", "ES512"];
    return supported.includes(header.alg || "");
  } catch {
    return false;
  }
}
