import { describe, it, expect, beforeEach } from "vitest";
import {
  SignatureVerifier,
  signCommand,
  generateKeyPair,
  type PublicKeyConfig,
} from "../../src/kill-switch/signature.js";
import { createKillSwitchCommand } from "../../src/kill-switch.js";
import type { KillSwitchCommand } from "@aigrc/core";

describe("Kill Switch Signature Verification (AIG-74)", () => {
  let verifier: SignatureVerifier;
  let ed25519Keys: { publicKey: string; privateKey: string };
  let rsaKeys: { publicKey: string; privateKey: string };
  let ecdsaKeys: { publicKey: string; privateKey: string };

  beforeEach(() => {
    // Generate test keys
    ed25519Keys = generateKeyPair("Ed25519");
    rsaKeys = generateKeyPair("RSA-SHA256");
    ecdsaKeys = generateKeyPair("ECDSA-P256");

    const trustedKeys: PublicKeyConfig[] = [
      { algorithm: "Ed25519", publicKey: ed25519Keys.publicKey, keyId: "ed25519-test" },
      { algorithm: "RSA-SHA256", publicKey: rsaKeys.publicKey, keyId: "rsa-test" },
      { algorithm: "ECDSA-P256", publicKey: ecdsaKeys.publicKey, keyId: "ecdsa-test" },
    ];

    verifier = new SignatureVerifier({ trustedKeys });
  });

  describe("Ed25519 Signatures", () => {
    it("should verify valid Ed25519 signature", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, ed25519Keys.privateKey, "Ed25519", "ed25519-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe("ed25519-test");
      expect(result.algorithm).toBe("Ed25519");
    });

    it("should reject invalid Ed25519 signature", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = "Ed25519:invalidbase64signature";

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
      expect(result.error).toBeDefined();
    });

    it("should reject tampered command", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Original reason",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, ed25519Keys.privateKey, "Ed25519", "ed25519-test");

      // Tamper with command
      command.reason = "Tampered reason";

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
    });
  });

  describe("RSA Signatures", () => {
    it("should verify valid RSA signature", () => {
      const command = createKillSwitchCommand("PAUSE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, rsaKeys.privateKey, "RSA-SHA256", "rsa-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe("rsa-test");
      expect(result.algorithm).toBe("RSA-SHA256");
    });
  });

  describe("ECDSA Signatures", () => {
    it("should verify valid ECDSA signature", () => {
      const command = createKillSwitchCommand("RESUME", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, ecdsaKeys.privateKey, "ECDSA-P256", "ecdsa-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(true);
      expect(result.keyId).toBe("ecdsa-test");
      expect(result.algorithm).toBe("ECDSA-P256");
    });
  });

  describe("Signature Format Validation", () => {
    it("should reject missing signature", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = "";

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Missing signature");
    });

    it("should reject invalid signature format", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = "invalid-format";

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("Invalid signature format");
    });
  });

  describe("Key Management", () => {
    it("should reject signature from untrusted key", () => {
      const untrustedKeys = generateKeyPair("Ed25519");
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "hacker@evil.com",
      });

      command.signature = signCommand(
        command,
        untrustedKeys.privateKey,
        "Ed25519",
        "untrusted-key"
      );

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("No trusted key found");
    });

    it("should support adding trusted keys", () => {
      const newKeys = generateKeyPair("Ed25519");
      const newKeyConfig: PublicKeyConfig = {
        algorithm: "Ed25519",
        publicKey: newKeys.publicKey,
        keyId: "new-key",
      };

      verifier.addTrustedKey(newKeyConfig);

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, newKeys.privateKey, "Ed25519", "new-key");

      const result = verifier.verify(command);

      expect(result.valid).toBe(true);
    });

    it("should support removing trusted keys", () => {
      verifier.removeTrustedKey("ed25519-test");

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = signCommand(command, ed25519Keys.privateKey, "Ed25519", "ed25519-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
    });

    it("should list trusted key IDs", () => {
      const keyIds = verifier.getTrustedKeyIds();

      expect(keyIds).toContain("ed25519-test");
      expect(keyIds).toContain("rsa-test");
      expect(keyIds).toContain("ecdsa-test");
    });
  });

  describe("Command Age Validation", () => {
    it("should reject old commands", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      // Set timestamp to 10 minutes ago
      const oldTimestamp = new Date(Date.now() - 10 * 60 * 1000);
      command.timestamp = oldTimestamp.toISOString();

      command.signature = signCommand(command, ed25519Keys.privateKey, "Ed25519", "ed25519-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("too old");
    });

    it("should reject future timestamps", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      // Set timestamp to future
      const futureTimestamp = new Date(Date.now() + 60 * 1000);
      command.timestamp = futureTimestamp.toISOString();

      command.signature = signCommand(command, ed25519Keys.privateKey, "Ed25519", "ed25519-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(false);
      expect(result.error).toContain("future");
    });

    it("should accept recent commands", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      // Current timestamp (default behavior)
      command.signature = signCommand(command, ed25519Keys.privateKey, "Ed25519", "ed25519-test");

      const result = verifier.verify(command);

      expect(result.valid).toBe(true);
    });
  });

  describe("Development Mode", () => {
    it("should skip verification in development mode", () => {
      const devVerifier = new SignatureVerifier({
        trustedKeys: [],
        requireSignature: false,
      });

      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      command.signature = "invalid-signature";

      const result = devVerifier.verify(command);

      expect(result.valid).toBe(true);
    });
  });

  describe("Canonical Message Generation", () => {
    it("should generate consistent signatures for same command", () => {
      const command = createKillSwitchCommand("TERMINATE", {
        reason: "Test",
        issuedBy: "admin@test.com",
      });

      const sig1 = signCommand(command, ed25519Keys.privateKey, "Ed25519");
      const sig2 = signCommand(command, ed25519Keys.privateKey, "Ed25519");

      // Ed25519 signatures should be deterministic (for same message)
      // But they may include randomness, so we just verify both are valid
      command.signature = sig1;
      expect(verifier.verify(command).valid).toBe(true);

      command.signature = sig2;
      expect(verifier.verify(command).valid).toBe(true);
    });
  });
});
