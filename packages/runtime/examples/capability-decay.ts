/**
 * Capability Decay Example
 *
 * This example demonstrates how capability decay works when
 * spawning child agents. Child agents automatically receive
 * reduced capabilities compared to their parents.
 */

import {
  createRuntimeIdentity,
  createCapabilityDecay,
  extractParentCapabilities,
  createPolicyEngine,
} from "@aigos/runtime";
import type { AssetCard } from "@aigrc/core";

// Create a minimal asset card
function createAssetCard(name: string, id: string): AssetCard {
  return {
    id,
    name,
    version: "1.0.0",
    created: new Date().toISOString(),
    updated: new Date().toISOString(),
    ownership: {
      owner: { name: "AI Team", email: "ai-team@example.com" },
    },
    technical: { type: "agent" },
    classification: {
      riskLevel: "limited",
      riskFactors: {
        autonomousDecisions: false,
        customerFacing: false,
        toolExecution: true,
        externalDataAccess: false,
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

async function main() {
  console.log("🌳 Capability Decay Example\n");
  console.log("This example shows how capabilities are automatically reduced");
  console.log("when spawning child agents to prevent privilege escalation.\n");
  console.log("=".repeat(60) + "\n");

  // ================================================================
  // ROOT AGENT (Generation 0)
  // ================================================================
  console.log("📋 Creating ROOT AGENT (Generation 0)...\n");

  const rootCard = createAssetCard("Orchestrator Agent", "aigrc-2024-00000001");
  const { identity: rootIdentity } = createRuntimeIdentity({
    assetCard: rootCard,
    capabilities: {
      allowed_tools: [
        "search_*",
        "read_*",
        "write_*",
        "delete_*",
        "spawn_agent",
      ],
      denied_tools: ["admin_*"],
      may_spawn_children: true,
      max_child_depth: 3,
      max_cost_per_session: 100.0,
      max_cost_per_day: 500.0,
    },
  });

  console.log(`   Name: ${rootIdentity.asset_name}`);
  console.log(`   Generation: ${rootIdentity.lineage.generation_depth}`);
  console.log(`   Allowed Tools: ${rootIdentity.capabilities_manifest.allowed_tools.join(", ")}`);
  console.log(`   May Spawn Children: ${rootIdentity.capabilities_manifest.may_spawn_children}`);
  console.log(`   Max Child Depth: ${rootIdentity.capabilities_manifest.max_child_depth}`);
  console.log(`   Max Cost/Session: $${rootIdentity.capabilities_manifest.max_cost_per_session}`);
  console.log();

  // ================================================================
  // CREATE CAPABILITY DECAY
  // ================================================================
  const decay = createCapabilityDecay({
    budgetDecayFactor: 0.5, // Children get 50% of parent's budget
    depthDecayFactor: 0.8, // Depth reduction
  });

  // ================================================================
  // CHILD AGENT (Generation 1)
  // ================================================================
  console.log("📋 Spawning CHILD AGENT (Generation 1)...\n");

  // Extract parent capabilities
  const rootCaps = extractParentCapabilities(rootIdentity);

  console.log("   Parent capabilities extracted:");
  console.log(`   - Allowed Tools: ${rootCaps.allowedTools.join(", ")}`);
  console.log(`   - May Spawn: ${rootCaps.maySpawnChildren}`);
  console.log(`   - Max Child Depth: ${rootCaps.maxChildDepth}`);
  console.log(`   - Max Cost/Session: $${rootCaps.budgets.maxCostPerSession}`);
  console.log();

  // Apply decay for child
  const childCaps = decay.applyDecay(rootCaps, "decay");

  console.log("   After decay:");
  console.log(`   - Allowed Tools: ${childCaps.allowedTools.join(", ")}`);
  console.log(`   - May Spawn: ${childCaps.maySpawnChildren}`);
  console.log(`   - Max Child Depth: ${childCaps.maxChildDepth}`);
  console.log(`   - Max Cost/Session: $${childCaps.budgets.maxCostPerSession}`);
  console.log();

  // Create child identity
  const childCard = createAssetCard("Research Agent", "aigrc-2024-00000002");
  const { identity: childIdentity } = createRuntimeIdentity({
    assetCard: childCard,
    capabilities: {
      allowed_tools: childCaps.allowedTools,
      denied_tools: childCaps.deniedTools,
      may_spawn_children: childCaps.maySpawnChildren,
      max_child_depth: childCaps.maxChildDepth,
      max_cost_per_session: childCaps.budgets.maxCostPerSession ?? undefined,
    },
    parent: rootIdentity, // Link to parent
  });

  console.log(`   Child agent created:`);
  console.log(`   - Name: ${childIdentity.asset_name}`);
  console.log(`   - Generation: ${childIdentity.lineage.generation_depth}`);
  console.log(`   - Parent ID: ${childIdentity.lineage.parent_instance_id}`);
  console.log();

  // ================================================================
  // GRANDCHILD AGENT (Generation 2)
  // ================================================================
  console.log("📋 Spawning GRANDCHILD AGENT (Generation 2)...\n");

  const grandchildParentCaps = extractParentCapabilities(childIdentity);
  const grandchildCaps = decay.applyDecay(grandchildParentCaps, "decay");

  console.log("   After decay:");
  console.log(`   - Allowed Tools: ${grandchildCaps.allowedTools.join(", ")}`);
  console.log(`   - May Spawn: ${grandchildCaps.maySpawnChildren}`);
  console.log(`   - Max Child Depth: ${grandchildCaps.maxChildDepth}`);
  console.log(`   - Max Cost/Session: $${grandchildCaps.budgets.maxCostPerSession}`);
  console.log();

  const grandchildCard = createAssetCard("Document Parser", "aigrc-2024-00000003");
  const { identity: grandchildIdentity } = createRuntimeIdentity({
    assetCard: grandchildCard,
    capabilities: {
      allowed_tools: grandchildCaps.allowedTools,
      denied_tools: grandchildCaps.deniedTools,
      may_spawn_children: grandchildCaps.maySpawnChildren,
      max_child_depth: grandchildCaps.maxChildDepth,
      max_cost_per_session: grandchildCaps.budgets.maxCostPerSession ?? undefined,
    },
    parent: childIdentity,
  });

  console.log(`   Grandchild agent created:`);
  console.log(`   - Name: ${grandchildIdentity.asset_name}`);
  console.log(`   - Generation: ${grandchildIdentity.lineage.generation_depth}`);
  console.log(`   - Parent ID: ${grandchildIdentity.lineage.parent_instance_id}`);
  console.log(`   - Root ID: ${grandchildIdentity.lineage.root_instance_id}`);
  console.log();

  // ================================================================
  // COMPARE CAPABILITIES
  // ================================================================
  console.log("=".repeat(60));
  console.log("\n📊 Capability Comparison:\n");

  const comparison = [
    { name: "Root", identity: rootIdentity },
    { name: "Child", identity: childIdentity },
    { name: "Grandchild", identity: grandchildIdentity },
  ];

  console.log("Agent        | Generation | Tools | Spawn | Depth | Budget");
  console.log("-".repeat(60));

  for (const { name, identity } of comparison) {
    const caps = identity.capabilities_manifest;
    console.log(
      `${name.padEnd(12)} | ${String(identity.lineage.generation_depth).padEnd(10)} | ${String(caps.allowed_tools.length).padEnd(5)} | ${String(caps.may_spawn_children).padEnd(5)} | ${String(caps.max_child_depth).padEnd(5)} | $${caps.max_cost_per_session ?? "N/A"}`
    );
  }

  console.log();

  // ================================================================
  // DEMONSTRATE ACCESS CONTROL
  // ================================================================
  console.log("=".repeat(60));
  console.log("\n🔐 Access Control Comparison:\n");

  const testActions = [
    { action: "search_documents", resource: "/docs" },
    { action: "write_file", resource: "/output/result.txt" },
    { action: "delete_file", resource: "/temp/cache.json" },
    { action: "spawn_agent", resource: "new-agent" },
  ];

  for (const { name, identity } of comparison) {
    const policy = createPolicyEngine({
      capabilities: identity.capabilities_manifest,
    });

    console.log(`${name} Agent:`);
    for (const { action, resource } of testActions) {
      const result = policy.checkPermissionSync({ action, resource });
      const status = result.allowed ? "✅" : "❌";
      console.log(`   ${status} ${action}`);
    }
    console.log();
  }

  console.log("✅ Capability decay example complete!");
}

main().catch(console.error);
