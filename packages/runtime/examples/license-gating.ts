/**
 * License Gating Example
 *
 * This example demonstrates how to use the license validation
 * system to gate features based on license tiers.
 */

import {
  createLicenseManager,
  FeatureGate,
  LimitEnforcer,
} from "@aigos/runtime";

async function main() {
  console.log("🔑 License Gating Example\n");

  // ================================================================
  // FEATURE GATE (Standalone)
  // ================================================================
  console.log("📋 Using FeatureGate (Community Tier - No License)\n");

  const gate = new FeatureGate();

  // Check various features
  const features = [
    "asset_cards",
    "golden_thread",
    "capability_decay",
    "kill_switch",
    "a2a_auth",
    "multi_jurisdiction",
    "custom_controls",
  ];

  console.log("Feature              | Allowed | Required Tier");
  console.log("-".repeat(55));

  for (const feature of features) {
    const result = gate.isFeatureAllowed(feature as any);
    const allowed = result.allowed ? "✅" : "❌";
    const tier = result.requiredTier || result.currentTier;
    console.log(`${feature.padEnd(20)} | ${allowed.padEnd(7)} | ${tier}`);
  }
  console.log();

  // ================================================================
  // LIMIT ENFORCER (Standalone)
  // ================================================================
  console.log("📋 Using LimitEnforcer (Community Tier Limits)\n");

  const enforcer = new LimitEnforcer();

  // Simulate usage
  console.log("Simulating resource usage...\n");

  // Add some agents
  enforcer.updateUsage({ agents: 3 });
  console.log("Added 3 agents");

  // Check if we can add more
  let canAdd = enforcer.canAdd("maxAgents");
  console.log(`Can add agent: ${canAdd.withinLimit ? "Yes" : "No"} (${canAdd.current}/${canAdd.limit})`);

  // Add more assets
  enforcer.updateUsage({ assets: 8 });
  console.log("Added 8 assets");

  canAdd = enforcer.canAdd("maxAssets");
  console.log(`Can add asset: ${canAdd.withinLimit ? "Yes" : "No"} (${canAdd.current}/${canAdd.limit})`);

  // Try to exceed limits
  enforcer.updateUsage({ agents: 10 });
  console.log("\nUpdated to 10 agents (attempting to exceed limit)");

  const agentCheck = enforcer.checkLimit("maxAgents");
  console.log(`Agent limit check: ${agentCheck.withinLimit ? "OK" : "EXCEEDED"}`);
  if (!agentCheck.withinLimit) {
    console.log(`   Current: ${agentCheck.current}, Limit: ${agentCheck.limit}`);
  }
  console.log();

  // Check all limits
  console.log("All Limits Status:");
  const allLimits = enforcer.checkAllLimits();
  for (const [limitType, result] of Object.entries(allLimits)) {
    const status = result.withinLimit ? "✅" : "❌";
    console.log(`   ${status} ${limitType}: ${result.current}/${result.limit}`);
  }
  console.log();

  // ================================================================
  // LICENSE MANAGER (Full Integration)
  // ================================================================
  console.log("📋 Using LicenseManager (Full Integration)\n");

  const manager = createLicenseManager({
    allowOffline: true,
    refreshIntervalMs: 0, // Disable auto-refresh for demo
    onError: (error) => console.log(`License error: ${error.message}`),
  });

  // Without a license, we get community tier
  console.log("Without license (Community Tier):");
  console.log(`   Tier: ${manager.getTier()}`);
  console.log(`   Valid: ${manager.isValid()}`);
  console.log(`   Status: ${manager.getStatus()}`);
  console.log();

  // Check features through manager
  console.log("Feature checks:");
  console.log(`   Asset Cards: ${manager.isFeatureAllowed("asset_cards").allowed ? "✅" : "❌"}`);
  console.log(`   Kill Switch: ${manager.isFeatureAllowed("kill_switch").allowed ? "✅" : "❌"}`);
  console.log(`   A2A Auth: ${manager.isFeatureAllowed("a2a_auth").allowed ? "✅" : "❌"}`);
  console.log();

  // Simulate usage tracking
  console.log("Usage tracking:");
  manager.updateUsage({ agents: 2, assets: 5, users: 3 });
  console.log("   Updated usage: 2 agents, 5 assets, 3 users");

  manager.incrementUsage("agents");
  console.log("   Incremented agents");

  const usage = manager.getUsage();
  console.log(`   Current usage: ${usage.agents} agents, ${usage.assets} assets`);
  console.log();

  // Check for near-limit warnings
  manager.updateUsage({ agents: 4 }); // 80% of community limit
  const warnings = manager.getNearLimitWarnings(0.7);
  if (warnings.length > 0) {
    console.log("⚠️  Near-limit warnings:");
    for (const warning of warnings) {
      console.log(`   ${warning.limitType}: ${warning.usage}/${warning.percentage.toFixed(0)}%`);
    }
  } else {
    console.log("✅ All limits within threshold");
  }
  console.log();

  // ================================================================
  // TIER COMPARISON
  // ================================================================
  console.log("=".repeat(60));
  console.log("\n📊 License Tier Comparison:\n");

  console.log("Feature              | Community | Pro  | Enterprise");
  console.log("-".repeat(60));

  const tierFeatures: Array<{
    name: string;
    community: boolean;
    pro: boolean;
    enterprise: boolean;
  }> = [
    { name: "Asset Cards", community: true, pro: true, enterprise: true },
    { name: "Golden Thread", community: true, pro: true, enterprise: true },
    { name: "Capability Decay", community: false, pro: true, enterprise: true },
    { name: "Kill Switch", community: false, pro: true, enterprise: true },
    { name: "A2A Authentication", community: false, pro: true, enterprise: true },
    { name: "Multi-Jurisdiction", community: false, pro: false, enterprise: true },
    { name: "Custom Controls", community: false, pro: false, enterprise: true },
    { name: "SSO Integration", community: false, pro: false, enterprise: true },
  ];

  for (const feature of tierFeatures) {
    const c = feature.community ? "✅" : "❌";
    const p = feature.pro ? "✅" : "❌";
    const e = feature.enterprise ? "✅" : "❌";
    console.log(`${feature.name.padEnd(20)} | ${c.padEnd(9)} | ${p.padEnd(4)} | ${e}`);
  }
  console.log();

  console.log("Limits               | Community | Pro       | Enterprise");
  console.log("-".repeat(60));
  console.log("Max Agents           | 5         | 50        | Unlimited");
  console.log("Max Assets           | 10        | 100       | Unlimited");
  console.log("Max Users            | 5         | 25        | Unlimited");
  console.log("Max Jurisdictions    | 1         | 3         | Unlimited");
  console.log();

  // Cleanup
  manager.dispose();

  console.log("✅ License gating example complete!");
}

main().catch(console.error);
