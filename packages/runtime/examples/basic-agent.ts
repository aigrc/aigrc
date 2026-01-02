/**
 * Basic Agent Example
 *
 * This example demonstrates how to create a simple AI agent with
 * runtime governance using @aigos/runtime.
 */

import {
  createRuntimeIdentity,
  createPolicyEngine,
  createKillSwitch,
  createKillSwitchCommand,
  clearProcessedCommands,
} from "@aigos/runtime";
import type { AssetCard } from "@aigrc/core";

// Step 1: Define your asset card
// In production, this would be loaded from a YAML file
const assetCard: AssetCard = {
  id: "aigrc-2024-a1b2c3d4",
  name: "Document Search Agent",
  version: "1.0.0",
  created: new Date().toISOString(),
  updated: new Date().toISOString(),
  ownership: {
    owner: {
      name: "AI Team",
      email: "ai-team@example.com",
    },
  },
  technical: {
    type: "agent",
    framework: "langchain",
  },
  classification: {
    riskLevel: "limited",
    riskFactors: {
      autonomousDecisions: false,
      customerFacing: true,
      toolExecution: true,
      externalDataAccess: true,
      piiProcessing: "no",
      highStakesDecisions: false,
    },
  },
  intent: {
    linked: true,
    ticketSystem: "jira",
    ticketId: "AI-1234",
  },
  governance: {
    status: "approved",
    approvals: [
      {
        role: "tech-lead",
        name: "Jane Smith",
        email: "jane@example.com",
        date: new Date().toISOString(),
      },
    ],
  },
  golden_thread: {
    ticket_id: "AI-1234",
    approved_by: "jane@example.com",
    approved_at: new Date().toISOString(),
  },
};

async function main() {
  console.log("🚀 Starting Document Search Agent...\n");

  // Step 2: Create runtime identity
  const { identity, verified } = createRuntimeIdentity({
    assetCard,
    capabilities: {
      allowed_tools: ["search_*", "read_*", "summarize_*"],
      denied_tools: ["delete_*", "write_*", "admin_*"],
      may_spawn_children: false,
      max_child_depth: 0,
      max_cost_per_session: 10.0,
    },
  });

  console.log("✅ Identity created:");
  console.log(`   Instance ID: ${identity.instance_id}`);
  console.log(`   Asset ID: ${identity.asset_id}`);
  console.log(`   Risk Level: ${identity.risk_level}`);
  console.log(`   Mode: ${identity.mode}`);
  console.log(`   Golden Thread Verified: ${verified}\n`);

  // Step 3: Create policy engine
  const policy = createPolicyEngine({
    capabilities: identity.capabilities_manifest,
  });

  // Step 4: Create kill switch
  const killSwitch = createKillSwitch(identity, {
    channel: "polling",
    endpoint: "http://localhost:9999/kill-switch",
    requireSignature: false, // Set to true in production
  });

  console.log("✅ Kill switch initialized");
  console.log(`   State: ${killSwitch.state}\n`);

  // Step 5: Simulate agent operations
  console.log("📋 Simulating agent operations...\n");

  // Check permissions before each action
  const actions = [
    { action: "search_documents", resource: "/docs" },
    { action: "read_file", resource: "/docs/report.pdf" },
    { action: "summarize_text", resource: "/docs/report.pdf" },
    { action: "delete_file", resource: "/docs/report.pdf" }, // Should be denied
    { action: "admin_access", resource: "/system" }, // Should be denied
  ];

  for (const { action, resource } of actions) {
    // Check kill switch before each operation
    if (!killSwitch.shouldContinue()) {
      console.log(`⏸️  Agent is ${killSwitch.state.toLowerCase()}, skipping operations`);
      break;
    }

    // Check policy
    const result = policy.checkPermissionSync({ action, resource });

    if (result.allowed) {
      console.log(`✅ ALLOWED: ${action} on ${resource}`);
      console.log(`   Evaluation time: ${result.evaluationTimeMs.toFixed(2)}ms`);
    } else {
      console.log(`❌ DENIED: ${action} on ${resource}`);
      console.log(`   Reason: ${result.reason}`);
      console.log(`   Denied by: ${result.deniedBy}`);
    }
    console.log();
  }

  // Step 6: Demonstrate kill switch
  console.log("📋 Demonstrating kill switch...\n");

  // Simulate receiving a PAUSE command
  const pauseCommand = createKillSwitchCommand("PAUSE", {
    reason: "Scheduled maintenance",
    issuedBy: "ops@example.com",
  });

  await killSwitch.processCommand(pauseCommand);
  console.log(`⏸️  Kill switch state: ${killSwitch.state}`);
  console.log(`   Should continue: ${killSwitch.shouldContinue()}\n`);

  // Clear processed commands for demo (not needed in production)
  clearProcessedCommands();

  // Simulate RESUME
  const resumeCommand = createKillSwitchCommand("RESUME", {
    reason: "Maintenance complete",
    issuedBy: "ops@example.com",
  });

  await killSwitch.processCommand(resumeCommand);
  console.log(`▶️  Kill switch state: ${killSwitch.state}`);
  console.log(`   Should continue: ${killSwitch.shouldContinue()}\n`);

  console.log("✅ Agent demonstration complete!");
}

main().catch(console.error);
