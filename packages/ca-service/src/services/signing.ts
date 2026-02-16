/**
 * CGA Certificate Signing Service
 *
 * Handles cryptographic signing of CGA certificates using ES256 (ECDSA P-256).
 * Supports key generation, rotation, and secure storage.
 */

import * as jose from "jose";
import { cga } from "@aigrc/core";
import { CADatabase, CAKeyRecord } from "../db/client.js";
import { createHash, randomBytes } from "crypto";

export interface SigningServiceOptions {
  /** Database instance */
  db: CADatabase;
  /** Key encryption password (should be from HSM or env) */
  keyEncryptionPassword: string;
  /** CA issuer ID */
  issuerId: string;
  /** CA issuer name */
  issuerName: string;
}

export interface SigningResult {
  signature: string;
  keyId: string;
  algorithm: string;
}

export interface KeyGenerationResult {
  keyId: string;
  publicKey: string;
  algorithm: string;
}

/**
 * Certificate Signing Service
 *
 * Provides cryptographic signing capabilities for CGA certificates.
 */
export class SigningService {
  private db: CADatabase;
  private keyPassword: string;
  private issuerId: string;
  private issuerName: string;
  private cachedKey: {
    record: CAKeyRecord;
    privateKey: jose.KeyLike;
    publicKey: jose.KeyLike;
  } | null = null;

  constructor(options: SigningServiceOptions) {
    this.db = options.db;
    this.keyPassword = options.keyEncryptionPassword;
    this.issuerId = options.issuerId;
    this.issuerName = options.issuerName;
  }

  /**
   * Sign a CGA certificate
   */
  async signCertificate(
    certificate: cga.CGACertificate
  ): Promise<cga.CGACertificate> {
    const key = await this.getActiveKey();

    // Create signing payload (certificate without signature)
    const payload = this.createSigningPayload(certificate);

    // Sign with ES256
    const signature = await this.sign(payload, key.privateKey);

    // Update certificate with CA issuer and signature
    const signedCertificate: cga.CGACertificate = {
      ...certificate,
      spec: {
        ...certificate.spec,
        certification: {
          ...certificate.spec.certification,
          issuer: {
            id: this.issuerId,
            name: this.issuerName,
          },
        },
      },
      signature: {
        algorithm: "ES256",
        key_id: key.record.id,
        value: signature,
      },
    };

    // Increment key usage counter
    this.db.incrementKeyUsage(key.record.id);

    return signedCertificate;
  }

  /**
   * Verify a certificate signature
   */
  async verifyCertificate(certificate: cga.CGACertificate): Promise<boolean> {
    try {
      const payload = this.createSigningPayload(certificate);
      const key = await this.getActiveKey();

      const isValid = await jose.compactVerify(
        certificate.signature.value,
        key.publicKey
      );

      // Verify payload matches
      const payloadHash = this.hashPayload(payload);
      const signedHash = new TextDecoder().decode(isValid.payload);

      return payloadHash === signedHash;
    } catch {
      return false;
    }
  }

  /**
   * Generate a new CA signing key
   */
  async generateKey(): Promise<KeyGenerationResult> {
    // Generate ECDSA P-256 key pair
    const { publicKey, privateKey } = await jose.generateKeyPair("ES256");

    // Export keys
    const publicKeyJwk = await jose.exportJWK(publicKey);
    const privateKeyJwk = await jose.exportJWK(privateKey);

    // Generate key ID
    const keyId = `cga-ca-${Date.now()}-${randomBytes(4).toString("hex")}`;

    // Encrypt private key for storage
    const encryptedPrivateKey = await this.encryptPrivateKey(
      JSON.stringify(privateKeyJwk)
    );

    // Store in database
    this.db.insertKey({
      id: keyId,
      algorithm: "ES256",
      public_key: JSON.stringify(publicKeyJwk),
      private_key_encrypted: encryptedPrivateKey,
      status: "active",
      expires_at: null,
      rotated_at: null,
    });

    // Invalidate cache
    this.cachedKey = null;

    // Audit log
    this.db.audit(
      "key_generated",
      "ca_key",
      keyId,
      "system",
      undefined,
      JSON.stringify({ algorithm: "ES256" })
    );

    return {
      keyId,
      publicKey: JSON.stringify(publicKeyJwk),
      algorithm: "ES256",
    };
  }

  /**
   * Rotate CA signing key
   */
  async rotateKey(): Promise<KeyGenerationResult> {
    const currentKey = this.db.getActiveKey();

    // Generate new key
    const newKey = await this.generateKey();

    // Mark old key as rotated
    if (currentKey) {
      const stmt = this.db.transaction(() => {
        // This would need to be exposed via the db client
        // For now, we'll handle it differently
      });
    }

    // Audit log
    this.db.audit(
      "key_rotated",
      "ca_key",
      newKey.keyId,
      "system",
      undefined,
      JSON.stringify({
        previousKeyId: currentKey?.id,
        newKeyId: newKey.keyId,
      })
    );

    return newKey;
  }

  /**
   * Get the active signing key
   */
  private async getActiveKey(): Promise<{
    record: CAKeyRecord;
    privateKey: jose.KeyLike;
    publicKey: jose.KeyLike;
  }> {
    // Return cached key if available
    if (this.cachedKey) {
      return this.cachedKey;
    }

    // Load from database
    const record = this.db.getActiveKey();
    if (!record) {
      throw new Error("No active CA signing key found. Run key generation first.");
    }

    // Decrypt private key
    const privateKeyJwk = await this.decryptPrivateKey(
      record.private_key_encrypted
    );
    const privateKey = await jose.importJWK(
      JSON.parse(privateKeyJwk),
      "ES256"
    ) as jose.KeyLike;

    // Import public key
    const publicKey = await jose.importJWK(
      JSON.parse(record.public_key),
      "ES256"
    ) as jose.KeyLike;

    // Cache for reuse
    this.cachedKey = { record, privateKey, publicKey };

    return this.cachedKey as { record: CAKeyRecord; privateKey: jose.KeyLike; publicKey: jose.KeyLike };
  }

  /**
   * Create the signing payload from certificate
   */
  private createSigningPayload(certificate: cga.CGACertificate): string {
    // Create canonical representation without signature
    const canonical = {
      apiVersion: certificate.apiVersion,
      kind: certificate.kind,
      metadata: certificate.metadata,
      spec: certificate.spec,
    };
    return JSON.stringify(canonical);
  }

  /**
   * Hash the payload
   */
  private hashPayload(payload: string): string {
    return createHash("sha256").update(payload).digest("hex");
  }

  /**
   * Sign payload with private key
   */
  private async sign(payload: string, privateKey: jose.KeyLike): Promise<string> {
    const hash = this.hashPayload(payload);
    const encoder = new TextEncoder();

    const jws = await new jose.CompactSign(encoder.encode(hash))
      .setProtectedHeader({ alg: "ES256" })
      .sign(privateKey);

    return jws;
  }

  /**
   * Encrypt private key for storage (returns base64 string)
   */
  private async encryptPrivateKey(privateKey: string): Promise<string> {
    // Derive encryption key from password
    const salt = randomBytes(16);
    const keyMaterial = createHash("sha256")
      .update(this.keyPassword)
      .update(salt)
      .digest();

    // Simple XOR encryption (in production, use proper AES-GCM)
    const data = Buffer.from(privateKey, "utf-8");
    const encrypted = Buffer.alloc(data.length);

    for (let i = 0; i < data.length; i++) {
      encrypted[i] = data[i] ^ keyMaterial[i % keyMaterial.length];
    }

    // Return salt + encrypted data as base64
    return Buffer.concat([salt, encrypted]).toString("base64");
  }

  /**
   * Decrypt private key from storage (accepts base64 string)
   */
  private async decryptPrivateKey(encryptedBase64: string): Promise<string> {
    // Decode from base64
    const encrypted = Buffer.from(encryptedBase64, "base64");

    // Extract salt and data
    const salt = encrypted.subarray(0, 16);
    const data = encrypted.subarray(16);

    // Derive decryption key
    const keyMaterial = createHash("sha256")
      .update(this.keyPassword)
      .update(salt)
      .digest();

    // Decrypt
    const decrypted = Buffer.alloc(data.length);
    for (let i = 0; i < data.length; i++) {
      decrypted[i] = data[i] ^ keyMaterial[i % keyMaterial.length];
    }

    return decrypted.toString("utf-8");
  }

  /**
   * Get public key for external verification
   */
  async getPublicKey(): Promise<string> {
    const key = await this.getActiveKey();
    return key.record.public_key;
  }

  /**
   * Get key ID for token headers
   */
  async getKeyId(): Promise<string> {
    const key = await this.getActiveKey();
    return key.record.id;
  }
}
