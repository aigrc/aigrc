/**
 * Agent-to-Agent (A2A) Authentication Example
 *
 * This example demonstrates how to implement secure communication
 * between AI agents using JWT-based governance tokens.
 */

import {
  createRuntimeIdentity,
  createGovernanceTokenGenerator,
  createGovernanceTokenValidator,
  generateES256KeyPair,
} from "@aigos/runtime";
import type { AssetCard } from "@aigrc/core";

// Create a minimal asset card for examples
function createAssetCard(name: string, id: string): AssetCard {
  return {
    id,
    name,
    version: "1.0.0",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ownership: {
      owner: {
        name: "AI Team",
        email: "ai-team@example.com",
      },
    },
    technical: { type: "agent" },
    classification: {
      riskLevel: "limited",
      riskFactors: {
        autonomousDecisions: false,
        customerFacing: false,
        toolExecution: true,
        externalDataAccess: true,
        piiProcessing: "no",
        highStakesDecisions: false,
      },
    },
    intent: { linked: true, ticketId: "AI-001" },
    governance: {
      status: "approved",
      approvals: [{ role: "tech-lead", name: "Admin", date: new Date().toISOString() }],
    },
    golden_thread: {
      ticket_id: "AI-001",
      approved_by: "admin@example.com",
      approved_at: new Date().toISOString(),
    },
  } as AssetCard;
}

// Helper to create token input from identity
function createTokenInput(identity: ReturnType<typeof createRuntimeIdentity>["identity"]) {
  return {
    identity,
    goldenThread: {
      hash: identity.golden_thread_hash,
      verified: identity.verified,
      ticket_id: identity.golden_thread.ticket_id,
    },
    mode: identity.mode as "NORMAL" | "SANDBOX" | "RESTRICTED",
    killSwitch: {
      enabled: true,
      channel: "sse" as const,
    },
    capabilities: {
      hash: identity.golden_thread_hash,
      tools: identity.capabilities_manifest.allowed_tools,
      maxBudgetUsd: identity.capabilities_manifest.max_cost_per_session ?? null,
      canSpawn: identity.capabilities_manifest.may_spawn_children,
      maxChildDepth: identity.capabilities_manifest.max_child_depth,
    },
  };
}

async function main() {
  console.log("🔐 A2A Authentication Example\n");

  // ================================================================
  // AGENT A: The requesting agent
  // ================================================================
  console.log("📋 Setting up Agent A (Requester)...\n");

  const agentACard = createAssetCard("Research Agent", "aigrc-2024-aaaaaaaa");
  const { identity: agentAIdentity } = createRuntimeIdentity({
    assetCard: agentACard,
    capabilities: {
      allowed_tools: ["search_*", "read_*"],
      denied_tools: [],
      may_spawn_children: true,
      max_child_depth: 2,
      max_cost_per_session: 50,
    },
  });

  // Generate key pair for Agent A
  const agentAKeys = await generateES256KeyPair();

  // Create token generator for Agent A
  const agentAGenerator = createGovernanceTokenGenerator({
    privateKey: agentAKeys.privateKey,
    publicKey: agentAKeys.publicKey,
    keyId: agentAKeys.keyId,
    issuer: "aigos-runtime",
  });

  console.log(`✅ Agent A initialized: ${agentAIdentity.asset_name}`);
  console.log(`   Instance ID: ${agentAIdentity.instance_id}`);
  console.log(`   Key ID: ${agentAKeys.keyId}\n`);

  // ================================================================
  // AGENT B: The receiving agent
  // ================================================================
  console.log("📋 Setting up Agent B (Receiver)...\n");

  const agentBCard = createAssetCard("Data Analysis Agent", "aigrc-2024-bbbbbbbb");
  const { identity: agentBIdentity } = createRuntimeIdentity({
    assetCard: agentBCard,
    capabilities: {
      allowed_tools: ["analyze_*", "compute_*"],
      denied_tools: [],
      may_spawn_children: false,
    },
  });

  // Create validator for Agent B
  const agentBValidator = createGovernanceTokenValidator();

  // Agent B needs to know Agent A's public key
  // In production, this would come from a key registry or JWKS endpoint
  agentBValidator.addPublicKey(agentAKeys.keyId, agentAKeys.publicKey);

  console.log(`✅ Agent B initialized: ${agentBIdentity.asset_name}`);
  console.log(`   Instance ID: ${agentBIdentity.instance_id}\n`);

  // ================================================================
  // A2A HANDSHAKE: Agent A calls Agent B
  // ================================================================
  console.log("🤝 Performing A2A Handshake...\n");

  // Step 1: Agent A generates a token
  console.log("1️⃣  Agent A generates governance token...");
  const tokenInput = createTokenInput(agentAIdentity);
  const { token, expiresAt } = await agentAGenerator.generate(tokenInput, {
    audience: agentBIdentity.instance_id,
    ttlSeconds: 300, // 5 minutes
  });

  console.log(`   Token generated (expires: ${expiresAt.toISOString()})`);
  console.log(`   Token length: ${token.length} chars\n`);

  // Step 2: Agent A sends request with token in header
  // In a real scenario, this would be an HTTP request:
  // headers: { "X-AIGOS-Token": token }
  console.log("2️⃣  Agent A sends request to Agent B...");
  console.log("   Header: X-AIGOS-Token: <token>\n");

  // Step 3: Agent B validates the token
  console.log("3️⃣  Agent B validates the token...");
  const validationResult = await agentBValidator.validate(token, {
    issuer: "aigos-runtime",
    audience: agentBIdentity.instance_id,
    maxRiskLevel: "high", // Accept up to high risk
    requireKillSwitch: true,
  });

  if (validationResult.valid) {
    console.log("   ✅ Token is VALID!\n");

    const claims = validationResult.payload!.aigos;
    console.log("   📋 Caller Information:");
    console.log(`      Instance ID: ${claims.identity.instance_id}`);
    console.log(`      Asset Name: ${claims.identity.asset_name}`);
    console.log(`      Risk Level: ${claims.governance.risk_level}`);
    console.log(`      Mode: ${claims.governance.mode}`);
    console.log(`      Golden Thread Verified: ${claims.governance.golden_thread.verified}`);
    console.log(`      Kill Switch Enabled: ${claims.control.kill_switch.enabled}`);
    console.log(`      Can Spawn Children: ${claims.capabilities.can_spawn}`);
    console.log(`      Max Child Depth: ${claims.capabilities.max_child_depth}\n`);

    // Agent B can now process the request
    console.log("4️⃣  Agent B processes the request...");
    console.log("   ✅ Request processed successfully!\n");
  } else {
    console.log("   ❌ Token is INVALID!");
    console.log(`      Error: ${validationResult.error?.code}`);
    console.log(`      Message: ${validationResult.error?.message}\n`);
  }

  // ================================================================
  // DEMONSTRATE VALIDATION FAILURES
  // ================================================================
  console.log("📋 Demonstrating validation failures...\n");

  // Test 1: Expired token
  console.log("Test 1: Expired token");
  const { token: expiredToken } = await agentAGenerator.generate(tokenInput, {
    audience: agentBIdentity.instance_id,
    ttlSeconds: -60, // Already expired
  });

  const expiredResult = await agentBValidator.validate(expiredToken);
  console.log(`   Result: ${expiredResult.valid ? "VALID" : "INVALID"}`);
  console.log(`   Error: ${expiredResult.error?.code}\n`);

  // Test 2: Wrong audience
  console.log("Test 2: Wrong audience");
  const { token: wrongAudienceToken } = await agentAGenerator.generate(tokenInput, {
    audience: "wrong-agent-id",
    ttlSeconds: 300,
  });

  const audienceResult = await agentBValidator.validate(wrongAudienceToken, {
    audience: agentBIdentity.instance_id,
  });
  console.log(`   Result: ${audienceResult.valid ? "VALID" : "INVALID"}`);
  console.log(`   Error: ${audienceResult.error?.code}\n`);

  console.log("✅ A2A Authentication example complete!");
}

main().catch(console.error);
