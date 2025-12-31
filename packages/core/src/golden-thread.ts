import type { AssetCard, Intent, GoldenThread } from "./schemas";

export interface TicketInfo {
  system: "jira" | "ado" | "github" | "gitlab";
  id: string;
  url: string;
  title: string;
  status: string;
  assignee?: string;
  reporter?: string;
  businessJustification?: string;
  riskTolerance?: "low" | "medium" | "high";
}

// ─────────────────────────────────────────────────────────────────
// GOLDEN THREAD PROTOCOL IMPLEMENTATION (SPEC-PRT-001)
// ─────────────────────────────────────────────────────────────────

export interface GoldenThreadComponents {
  ticket_id: string;
  approved_by: string;
  approved_at: string;
}

export interface GoldenThreadHashResult {
  canonical_string: string;
  hash: string;
}

export interface GoldenThreadVerificationResult {
  verified: boolean;
  computed: string;
  expected: string;
  mismatch_reason?: string;
}

/**
 * Compute the canonical string for Golden Thread hashing.
 * Format: approved_at={ISO8601}|approved_by={email}|ticket_id={id}
 * Fields are sorted alphabetically with pipe delimiters.
 *
 * Test Vector:
 * Input: ticket_id=FIN-1234, approved_by=ciso@corp.com, approved_at=2025-01-15T10:30:00Z
 * Output: "approved_at=2025-01-15T10:30:00Z|approved_by=ciso@corp.com|ticket_id=FIN-1234"
 */
export function computeCanonicalString(components: GoldenThreadComponents): string {
  // Normalize timestamp to UTC ISO 8601
  const normalizedTimestamp = normalizeTimestamp(components.approved_at);

  // Build key-value pairs sorted alphabetically by key
  const pairs = [
    `approved_at=${normalizedTimestamp}`,
    `approved_by=${components.approved_by}`,
    `ticket_id=${components.ticket_id}`,
  ];

  // Join with pipe delimiter
  return pairs.join("|");
}

/**
 * Normalize a timestamp to UTC ISO 8601 format
 */
function normalizeTimestamp(timestamp: string): string {
  const date = new Date(timestamp);
  if (isNaN(date.getTime())) {
    throw new Error(`Invalid timestamp: ${timestamp}`);
  }
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

/**
 * Compute SHA-256 hash of the Golden Thread canonical string.
 * Output format: sha256:{64 lowercase hex chars}
 *
 * Test Vector:
 * Input: FIN-1234 | ciso@corp.com | 2025-01-15T10:30:00Z
 * Output: sha256:7d865e959b2466918c9863afca942d0fb89d7c9ac0c99bafc3749504ded97730
 */
export async function computeGoldenThreadHash(
  components: GoldenThreadComponents
): Promise<GoldenThreadHashResult> {
  const canonicalString = computeCanonicalString(components);

  // Use Web Crypto API for SHA-256
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);

  // Convert to hex string
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, "0")).join("");

  return {
    canonical_string: canonicalString,
    hash: `sha256:${hashHex}`,
  };
}

/**
 * Synchronous hash computation using Node.js crypto (for Node environments)
 */
export function computeGoldenThreadHashSync(
  components: GoldenThreadComponents
): GoldenThreadHashResult {
  const canonicalString = computeCanonicalString(components);

  // Dynamic import to avoid bundling issues in browser
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const crypto = require("crypto");
  const hash = crypto.createHash("sha256").update(canonicalString).digest("hex");

  return {
    canonical_string: canonicalString,
    hash: `sha256:${hash}`,
  };
}

/**
 * Verify a Golden Thread hash against computed value.
 * Uses constant-time comparison for security.
 */
export async function verifyGoldenThreadHash(
  components: GoldenThreadComponents,
  expectedHash: string
): Promise<GoldenThreadVerificationResult> {
  const { hash: computedHash } = await computeGoldenThreadHash(components);

  // Constant-time comparison
  const verified = constantTimeEqual(computedHash, expectedHash);

  return {
    verified,
    computed: computedHash,
    expected: expectedHash,
    mismatch_reason: verified ? undefined : "Hash mismatch",
  };
}

/**
 * Synchronous hash verification
 */
export function verifyGoldenThreadHashSync(
  components: GoldenThreadComponents,
  expectedHash: string
): GoldenThreadVerificationResult {
  const { hash: computedHash } = computeGoldenThreadHashSync(components);

  const verified = constantTimeEqual(computedHash, expectedHash);

  return {
    verified,
    computed: computedHash,
    expected: expectedHash,
    mismatch_reason: verified ? undefined : "Hash mismatch",
  };
}

/**
 * Constant-time string comparison to prevent timing attacks
 */
function constantTimeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }
  return result === 0;
}

/**
 * Extract Golden Thread components from an Asset Card
 */
export function extractGoldenThreadComponents(
  asset: AssetCard
): GoldenThreadComponents | null {
  // Try to extract from golden_thread field first
  if (asset.golden_thread) {
    return {
      ticket_id: asset.golden_thread.ticket_id,
      approved_by: asset.golden_thread.approved_by,
      approved_at: asset.golden_thread.approved_at,
    };
  }

  // Fall back to intent + governance.approvals
  if (!asset.intent.ticketId) {
    return null;
  }

  // Find the most recent approval
  const approvals = asset.governance.approvals;
  if (approvals.length === 0) {
    return null;
  }

  const latestApproval = approvals.reduce((latest, current) =>
    new Date(current.date) > new Date(latest.date) ? current : latest
  );

  return {
    ticket_id: asset.intent.ticketId,
    approved_by: latestApproval.email || latestApproval.name,
    approved_at: latestApproval.date,
  };
}

/**
 * Create a complete Golden Thread object with computed hash
 */
export async function createGoldenThread(
  components: GoldenThreadComponents
): Promise<GoldenThread> {
  const { hash } = await computeGoldenThreadHash(components);

  return {
    ticket_id: components.ticket_id,
    approved_by: components.approved_by,
    approved_at: components.approved_at,
    hash,
  };
}

/**
 * Synchronous version of createGoldenThread
 */
export function createGoldenThreadSync(
  components: GoldenThreadComponents
): GoldenThread {
  const { hash } = computeGoldenThreadHashSync(components);

  return {
    ticket_id: components.ticket_id,
    approved_by: components.approved_by,
    approved_at: components.approved_at,
    hash,
  };
}

export interface LinkResult {
  success: boolean;
  intent: Intent;
  warnings?: string[];
}

export function linkAssetToTicket(asset: AssetCard, ticket: TicketInfo): LinkResult {
  const warnings: string[] = [];

  const intent: Intent = {
    linked: true,
    ticketSystem: ticket.system,
    ticketId: ticket.id,
    ticketUrl: ticket.url,
    businessJustification: ticket.businessJustification,
    riskTolerance: ticket.riskTolerance,
    importedAt: new Date().toISOString(),
  };

  // Check for risk mismatch
  if (ticket.riskTolerance && asset.classification.riskLevel) {
    const toleranceMap: Record<string, number> = { low: 0, medium: 1, high: 2 };
    const levelMap: Record<string, number> = { minimal: 0, limited: 1, high: 2, unacceptable: 3 };

    if (levelMap[asset.classification.riskLevel] > toleranceMap[ticket.riskTolerance]) {
      warnings.push(
        `Asset risk (${asset.classification.riskLevel}) exceeds ticket tolerance (${ticket.riskTolerance})`
      );
    }
  }

  return {
    success: true,
    intent,
    warnings: warnings.length > 0 ? warnings : undefined,
  };
}

export function validateGoldenThread(asset: AssetCard): {
  valid: boolean;
  healthScore: number;
  issues: string[];
} {
  const issues: string[] = [];
  let score = 100;

  if (!asset.intent.linked) {
    issues.push("Asset is not linked to any ticket");
    score -= 50;
    return { valid: false, healthScore: score, issues };
  }

  if (!asset.intent.businessJustification) {
    issues.push("Missing business justification");
    score -= 20;
  }

  if (asset.classification.riskLevel === "high" && asset.governance.approvals.length === 0) {
    issues.push("High-risk asset missing approvals");
    score -= 30;
  }

  return {
    valid: issues.length === 0,
    healthScore: Math.max(0, score),
    issues,
  };
}

// ─────────────────────────────────────────────────────────────────
// SIGNATURE VERIFICATION (AIG-33 / SPEC-PRT-001)
// Optional cryptographic signature verification for Golden Thread
// ─────────────────────────────────────────────────────────────────

/** Supported signature algorithms */
export type SignatureAlgorithm = "RSA-SHA256" | "ECDSA-P256";

/** Result of signature verification */
export interface SignatureVerificationResult {
  /** Whether signature is valid */
  verified: boolean;
  /** Algorithm used */
  algorithm: SignatureAlgorithm | null;
  /** Error message if verification failed */
  error?: string;
  /** The data that was signed (canonical string) */
  signedData?: string;
}

/** Public key for signature verification */
export interface SignaturePublicKey {
  /** Algorithm this key is for */
  algorithm: SignatureAlgorithm;
  /** PEM-encoded public key or JWK */
  key: string;
  /** Key ID for key rotation */
  keyId?: string;
}

/**
 * Parse a signature string in format: {ALGORITHM}:{BASE64_SIGNATURE}
 */
export function parseSignature(
  signature: string
): { algorithm: SignatureAlgorithm; data: Uint8Array } | null {
  const match = signature.match(/^(RSA-SHA256|ECDSA-P256):([A-Za-z0-9+/=]+)$/);
  if (!match) {
    return null;
  }

  const algorithm = match[1] as SignatureAlgorithm;
  const base64Data = match[2];

  try {
    // Decode base64 to Uint8Array
    const binaryString = atob(base64Data);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return { algorithm, data: bytes };
  } catch {
    return null;
  }
}

/**
 * Verify a Golden Thread signature using Web Crypto API.
 *
 * @param components - The Golden Thread components that were signed
 * @param signature - The signature in format {ALGORITHM}:{BASE64_SIGNATURE}
 * @param publicKey - The public key for verification
 * @returns Verification result
 */
export async function verifyGoldenThreadSignature(
  components: GoldenThreadComponents,
  signature: string,
  publicKey: SignaturePublicKey
): Promise<SignatureVerificationResult> {
  // Parse the signature
  const parsed = parseSignature(signature);
  if (!parsed) {
    return {
      verified: false,
      algorithm: null,
      error: "Invalid signature format. Expected {ALGORITHM}:{BASE64_SIGNATURE}",
    };
  }

  // Check algorithm matches
  if (parsed.algorithm !== publicKey.algorithm) {
    return {
      verified: false,
      algorithm: parsed.algorithm,
      error: `Algorithm mismatch: signature uses ${parsed.algorithm}, key is ${publicKey.algorithm}`,
    };
  }

  // Compute canonical string (the data that was signed)
  const canonicalString = computeCanonicalString(components);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);

  try {
    // Import the public key
    const cryptoKey = await importPublicKey(publicKey);

    // Verify the signature
    const algorithmParams = getVerifyAlgorithm(parsed.algorithm);
    const verified = await crypto.subtle.verify(
      algorithmParams,
      cryptoKey as Parameters<typeof crypto.subtle.verify>[1],
      parsed.data,
      data
    );

    return {
      verified,
      algorithm: parsed.algorithm,
      signedData: canonicalString,
      error: verified ? undefined : "Signature verification failed",
    };
  } catch (error) {
    return {
      verified: false,
      algorithm: parsed.algorithm,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Synchronous signature verification using Node.js crypto
 */
export function verifyGoldenThreadSignatureSync(
  components: GoldenThreadComponents,
  signature: string,
  publicKeyPem: string
): SignatureVerificationResult {
  const parsed = parseSignature(signature);
  if (!parsed) {
    return {
      verified: false,
      algorithm: null,
      error: "Invalid signature format",
    };
  }

  const canonicalString = computeCanonicalString(components);

  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const crypto = require("crypto");

    const verifier = crypto.createVerify(
      parsed.algorithm === "RSA-SHA256" ? "RSA-SHA256" : "SHA256"
    );
    verifier.update(canonicalString);
    verifier.end();

    const verified = verifier.verify(publicKeyPem, Buffer.from(parsed.data));

    return {
      verified,
      algorithm: parsed.algorithm,
      signedData: canonicalString,
      error: verified ? undefined : "Signature verification failed",
    };
  } catch (error) {
    return {
      verified: false,
      algorithm: parsed.algorithm,
      error: `Verification error: ${error instanceof Error ? error.message : String(error)}`,
    };
  }
}

/**
 * Sign Golden Thread components (for testing/tooling)
 * Note: privateKey should be a CryptoKey from Web Crypto API
 */
export async function signGoldenThread(
  components: GoldenThreadComponents,
  privateKey: unknown,
  algorithm: SignatureAlgorithm
): Promise<string> {
  const canonicalString = computeCanonicalString(components);
  const encoder = new TextEncoder();
  const data = encoder.encode(canonicalString);

  const signatureBuffer = await crypto.subtle.sign(
    getSignAlgorithm(algorithm),
    privateKey as Parameters<typeof crypto.subtle.sign>[1],
    data
  );

  // Convert to base64
  const signatureArray = new Uint8Array(signatureBuffer);
  const base64 = btoa(String.fromCharCode(...signatureArray));

  return `${algorithm}:${base64}`;
}

/**
 * Import a PEM-encoded public key for verification
 * Returns a CryptoKey from Web Crypto API
 */
async function importPublicKey(publicKey: SignaturePublicKey): Promise<unknown> {
  const pemHeader = "-----BEGIN PUBLIC KEY-----";
  const pemFooter = "-----END PUBLIC KEY-----";

  let keyData: ArrayBuffer;

  if (publicKey.key.includes(pemHeader)) {
    // PEM format
    const pemContents = publicKey.key
      .replace(pemHeader, "")
      .replace(pemFooter, "")
      .replace(/\s/g, "");
    const binaryString = atob(pemContents);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    keyData = bytes.buffer;
  } else {
    // Assume raw base64
    const binaryString = atob(publicKey.key);
    const bytes = new Uint8Array(binaryString.length);
    for (let i = 0; i < binaryString.length; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    keyData = bytes.buffer;
  }

  const algorithm =
    publicKey.algorithm === "RSA-SHA256"
      ? { name: "RSASSA-PKCS1-v1_5", hash: "SHA-256" }
      : { name: "ECDSA", namedCurve: "P-256" };

  return crypto.subtle.importKey("spki", keyData, algorithm, true, ["verify"]);
}

/** Web Crypto algorithm parameters */
type WebCryptoAlgorithmParams = { name: string; hash?: string };

/**
 * Get Web Crypto verify algorithm params
 */
function getVerifyAlgorithm(algorithm: SignatureAlgorithm): WebCryptoAlgorithmParams {
  if (algorithm === "RSA-SHA256") {
    return { name: "RSASSA-PKCS1-v1_5" };
  } else {
    return { name: "ECDSA", hash: "SHA-256" };
  }
}

/**
 * Get Web Crypto sign algorithm params
 */
function getSignAlgorithm(algorithm: SignatureAlgorithm): WebCryptoAlgorithmParams {
  return getVerifyAlgorithm(algorithm);
}