import * as crypto from "crypto";
import type { KillSwitchCommand } from "@aigrc/core";

// ─────────────────────────────────────────────────────────────────
// KILL SWITCH SIGNATURE VERIFICATION (AIG-74)
// Cryptographic verification of kill switch commands
// Supports Ed25519 and RSA signatures
// ─────────────────────────────────────────────────────────────────

/**
 * Supported signature algorithms
 */
export type SignatureAlgorithm = "Ed25519" | "RSA-SHA256" | "ECDSA-P256";

/**
 * Public key configuration
 */
export interface PublicKeyConfig {
  /** Algorithm used for this key */
  algorithm: SignatureAlgorithm;
  /** PEM-encoded public key */
  publicKey: string;
  /** Optional key ID for key rotation */
  keyId?: string;
}

/**
 * Signature verifier configuration
 */
export interface SignatureVerifierConfig {
  /** List of trusted public keys */
  trustedKeys: PublicKeyConfig[];
  /** Whether to require signatures (false = development mode) */
  requireSignature?: boolean;
  /** Maximum age of commands in seconds (prevents old commands) */
  maxCommandAgeSeconds?: number;
}

/**
 * Signature verification result
 */
export interface VerificationResult {
  /** Whether signature is valid */
  valid: boolean;
  /** Error message if verification failed */
  error?: string;
  /** Which key was used for verification */
  keyId?: string;
  /** Algorithm used */
  algorithm?: SignatureAlgorithm;
}

/**
 * Signature Verifier
 *
 * Verifies cryptographic signatures on kill switch commands.
 */
export class SignatureVerifier {
  private readonly config: SignatureVerifierConfig;
  private readonly keyMap: Map<string, PublicKeyConfig>;

  constructor(config: SignatureVerifierConfig) {
    this.config = {
      requireSignature: true,
      maxCommandAgeSeconds: 300, // 5 minutes default
      ...config,
    };

    // Build key map for fast lookup
    this.keyMap = new Map();
    for (const key of config.trustedKeys) {
      const keyId = key.keyId ?? this.generateKeyId(key.publicKey);
      this.keyMap.set(keyId, key);
    }

    if (this.keyMap.size === 0) {
      console.warn("[KillSwitch:Signature] No trusted keys configured");
    }
  }

  /**
   * Verify a kill switch command signature
   */
  public verify(command: KillSwitchCommand): VerificationResult {
    // Check if signature is required
    if (!this.config.requireSignature) {
      console.warn("[KillSwitch:Signature] Signature verification disabled (development mode)");
      return { valid: true };
    }

    // Check if signature exists
    if (!command.signature || command.signature.length === 0) {
      return {
        valid: false,
        error: "Missing signature",
      };
    }

    // Check command age
    if (this.config.maxCommandAgeSeconds) {
      const ageResult = this.checkCommandAge(command);
      if (!ageResult.valid) {
        return ageResult;
      }
    }

    // Parse signature format: "ALGORITHM:BASE64_SIGNATURE[:KEY_ID]"
    const signatureParts = command.signature.split(":");
    if (signatureParts.length < 2) {
      return {
        valid: false,
        error: "Invalid signature format (expected ALGORITHM:SIGNATURE[:KEY_ID])",
      };
    }

    const [algorithmStr, signatureB64, keyId] = signatureParts;
    const algorithm = algorithmStr as SignatureAlgorithm;

    // Find matching public key
    const publicKeyConfig = this.findPublicKey(algorithm, keyId);
    if (!publicKeyConfig) {
      return {
        valid: false,
        error: keyId
          ? `No trusted key found for key ID: ${keyId}`
          : `No trusted key found for algorithm: ${algorithm}`,
      };
    }

    // Verify signature
    try {
      const signatureBuffer = Buffer.from(signatureB64, "base64");
      const message = this.getCanonicalMessage(command);

      const valid = this.verifySignature(
        message,
        signatureBuffer,
        publicKeyConfig.publicKey,
        algorithm
      );

      return {
        valid,
        keyId: publicKeyConfig.keyId,
        algorithm,
        error: valid ? undefined : "Signature verification failed",
      };
    } catch (error) {
      return {
        valid: false,
        error: `Signature verification error: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Check command age
   */
  private checkCommandAge(command: KillSwitchCommand): VerificationResult {
    try {
      const commandTime = new Date(command.timestamp).getTime();
      const now = Date.now();
      const ageSeconds = (now - commandTime) / 1000;

      if (ageSeconds < 0) {
        return {
          valid: false,
          error: "Command timestamp is in the future",
        };
      }

      if (ageSeconds > this.config.maxCommandAgeSeconds!) {
        return {
          valid: false,
          error: `Command too old (${Math.round(ageSeconds)}s > ${this.config.maxCommandAgeSeconds}s)`,
        };
      }

      return { valid: true };
    } catch (error) {
      return {
        valid: false,
        error: `Invalid timestamp: ${error instanceof Error ? error.message : String(error)}`,
      };
    }
  }

  /**
   * Find a trusted public key
   */
  private findPublicKey(
    algorithm: SignatureAlgorithm,
    keyId?: string
  ): PublicKeyConfig | undefined {
    // If key ID provided, look up directly
    if (keyId) {
      const key = this.keyMap.get(keyId);
      if (key && key.algorithm === algorithm) {
        return key;
      }
      return undefined;
    }

    // Otherwise, find first key matching algorithm
    for (const key of this.keyMap.values()) {
      if (key.algorithm === algorithm) {
        return key;
      }
    }

    return undefined;
  }

  /**
   * Get canonical message for signing/verification
   *
   * Canonical format ensures consistent signatures:
   * {command_id}\n{type}\n{timestamp}\n{reason}\n{issued_by}\n{targets}
   */
  private getCanonicalMessage(command: KillSwitchCommand): string {
    const targets = [
      command.instance_id ?? "",
      command.asset_id ?? "",
      command.organization ?? "",
    ]
      .filter((t) => t.length > 0)
      .join(",");

    return [
      command.command_id,
      command.type,
      command.timestamp,
      command.reason,
      command.issued_by,
      targets,
    ].join("\n");
  }

  /**
   * Verify signature using Node.js crypto
   */
  private verifySignature(
    message: string,
    signature: Buffer,
    publicKey: string,
    algorithm: SignatureAlgorithm
  ): boolean {
    const messageBuffer = Buffer.from(message, "utf-8");

    switch (algorithm) {
      case "Ed25519":
        return crypto.verify(null, messageBuffer, publicKey, signature);

      case "RSA-SHA256":
        return crypto.verify("sha256", messageBuffer, publicKey, signature);

      case "ECDSA-P256":
        return crypto.verify("sha256", messageBuffer, publicKey, signature);

      default:
        throw new Error(`Unsupported algorithm: ${algorithm}`);
    }
  }

  /**
   * Generate a key ID from public key
   */
  private generateKeyId(publicKey: string): string {
    const hash = crypto.createHash("sha256").update(publicKey).digest("hex");
    return hash.substring(0, 16);
  }

  /**
   * Add a trusted key
   */
  public addTrustedKey(key: PublicKeyConfig): void {
    const keyId = key.keyId ?? this.generateKeyId(key.publicKey);
    this.keyMap.set(keyId, key);
    console.log(`[KillSwitch:Signature] Added trusted key: ${keyId} (${key.algorithm})`);
  }

  /**
   * Remove a trusted key
   */
  public removeTrustedKey(keyId: string): void {
    this.keyMap.delete(keyId);
    console.log(`[KillSwitch:Signature] Removed trusted key: ${keyId}`);
  }

  /**
   * Get all trusted key IDs
   */
  public getTrustedKeyIds(): string[] {
    return Array.from(this.keyMap.keys());
  }
}

/**
 * Sign a kill switch command (for testing/admin tools)
 *
 * @param command Command to sign
 * @param privateKey PEM-encoded private key
 * @param algorithm Signature algorithm
 * @param keyId Optional key ID
 */
export function signCommand(
  command: KillSwitchCommand,
  privateKey: string,
  algorithm: SignatureAlgorithm,
  keyId?: string
): string {
  // Build canonical message
  const targets = [
    command.instance_id ?? "",
    command.asset_id ?? "",
    command.organization ?? "",
  ]
    .filter((t) => t.length > 0)
    .join(",");

  const message = [
    command.command_id,
    command.type,
    command.timestamp,
    command.reason,
    command.issued_by,
    targets,
  ].join("\n");

  const messageBuffer = Buffer.from(message, "utf-8");

  // Sign message
  let signature: Buffer;
  switch (algorithm) {
    case "Ed25519":
      signature = crypto.sign(null, messageBuffer, privateKey);
      break;
    case "RSA-SHA256":
      signature = crypto.sign("sha256", messageBuffer, privateKey);
      break;
    case "ECDSA-P256":
      signature = crypto.sign("sha256", messageBuffer, privateKey);
      break;
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }

  // Format signature
  const signatureB64 = signature.toString("base64");
  return keyId ? `${algorithm}:${signatureB64}:${keyId}` : `${algorithm}:${signatureB64}`;
}

/**
 * Generate a key pair for testing
 */
export function generateKeyPair(
  algorithm: SignatureAlgorithm = "Ed25519"
): { publicKey: string; privateKey: string } {
  const publicKeyEncoding = { type: "spki" as const, format: "pem" as const };
  const privateKeyEncoding = { type: "pkcs8" as const, format: "pem" as const };

  switch (algorithm) {
    case "Ed25519":
      return crypto.generateKeyPairSync("ed25519", {
        publicKeyEncoding,
        privateKeyEncoding,
      });
    case "RSA-SHA256":
      return crypto.generateKeyPairSync("rsa", {
        modulusLength: 2048,
        publicKeyEncoding,
        privateKeyEncoding,
      });
    case "ECDSA-P256":
      return crypto.generateKeyPairSync("ec", {
        namedCurve: "prime256v1",
        publicKeyEncoding,
        privateKeyEncoding,
      });
    default:
      throw new Error(`Unsupported algorithm: ${algorithm}`);
  }
}
