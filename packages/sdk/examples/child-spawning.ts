/**
 * @aigos/sdk - Child Agent Spawning Example
 *
 * This example demonstrates hierarchical agent spawning
 * with capability decay and lineage tracking.
 *
 * Run with: npx tsx examples/child-spawning.ts
 */

import { createGovernedAgent } from '@aigos/sdk';
import type { GovernedAgent } from '@aigos/sdk';

async function printAgentInfo(agent: GovernedAgent, indent = 0) {
  const pad = '  '.repeat(indent);

  console.log(`${pad}📦 Agent: ${agent.identity.asset_name}`);
  console.log(`${pad}   Instance: ${agent.identity.instance_id.slice(0, 8)}...`);
  console.log(`${pad}   Generation: ${agent.lineage.generation_depth}`);

  if (agent.lineage.parent_instance_id) {
    console.log(`${pad}   Parent: ${agent.lineage.parent_instance_id.slice(0, 8)}...`);
  } else {
    console.log(`${pad}   Parent: (root)`);
  }

  const caps = agent.identity.capabilities_manifest;
  console.log(`${pad}   Max Cost/Session: $${caps.max_cost_per_session?.toFixed(2) || 'unlimited'}`);
  console.log(`${pad}   Can Spawn: ${caps.may_spawn_children}`);
  console.log(`${pad}   Max Child Depth: ${caps.max_child_depth}`);
  console.log('');
}

async function main() {
  console.log('🚀 Child Agent Spawning Example\n');

  // Create the root orchestrator agent with spawning enabled
  const orchestrator = await createGovernedAgent({
    name: 'orchestrator',
    version: '1.0.0',
    capabilities: {
      allowed_tools: [
        'database:*',
        'api:*',
        'email:*',
        'filesystem:read',
      ],
      denied_tools: ['admin:*'],

      // Enable child spawning
      may_spawn_children: true,
      max_child_depth: 3,

      // Capability decay mode
      capability_mode: 'decay',

      // Resource limits that will decay
      max_cost_per_session: 100.00,
      max_cost_per_day: 1000.00,
    },

    // Golden Thread for traceability
    goldenThread: {
      ticket_id: 'AIGOS-100',
      approved_by: 'security@company.com',
      approved_at: new Date().toISOString(),
    },
  });

  console.log('═══════════════════════════════════════════');
  console.log('Root Orchestrator Agent');
  console.log('═══════════════════════════════════════════\n');

  await printAgentInfo(orchestrator);

  // Spawn a data processor child
  console.log('═══════════════════════════════════════════');
  console.log('Spawning Data Processor (Generation 1)');
  console.log('═══════════════════════════════════════════\n');

  const dataProcessor = await orchestrator.spawn({
    name: 'data-processor',
    version: '1.0.0',
  });

  await printAgentInfo(dataProcessor, 1);

  // Check capability decay
  console.log('📊 Capability Decay Analysis:');
  console.log(`   Parent cost limit: $${orchestrator.identity.capabilities_manifest.max_cost_per_session?.toFixed(2)}`);
  console.log(`   Child cost limit:  $${dataProcessor.identity.capabilities_manifest.max_cost_per_session?.toFixed(2)}`);
  console.log(`   Decay factor: 80% (100 → 80)\n`);

  // Spawn a grandchild worker
  console.log('═══════════════════════════════════════════');
  console.log('Spawning Worker (Generation 2)');
  console.log('═══════════════════════════════════════════\n');

  const worker = await dataProcessor.spawn({
    name: 'worker',
    version: '1.0.0',
  });

  await printAgentInfo(worker, 2);

  console.log('📊 Generation 2 Capability Decay:');
  console.log(`   Root cost limit:   $${orchestrator.identity.capabilities_manifest.max_cost_per_session?.toFixed(2)}`);
  console.log(`   Gen 1 cost limit:  $${dataProcessor.identity.capabilities_manifest.max_cost_per_session?.toFixed(2)}`);
  console.log(`   Gen 2 cost limit:  $${worker.identity.capabilities_manifest.max_cost_per_session?.toFixed(2)}`);
  console.log(`   Total decay: 64% of original (100 → 80 → 64)\n`);

  // Show the lineage chain
  console.log('═══════════════════════════════════════════');
  console.log('Lineage Chain');
  console.log('═══════════════════════════════════════════\n');

  console.log(`   🏠 Root: ${orchestrator.identity.instance_id.slice(0, 8)}...`);
  console.log(`   └── 📦 ${dataProcessor.identity.asset_name}: ${dataProcessor.identity.instance_id.slice(0, 8)}...`);
  console.log(`       └── 📦 ${worker.identity.asset_name}: ${worker.identity.instance_id.slice(0, 8)}...`);
  console.log('');

  console.log('   Worker ancestor chain:', worker.lineage.ancestor_chain.map(id => id.slice(0, 8) + '...'));
  console.log('   Worker root instance:', worker.lineage.root_instance_id.slice(0, 8) + '...');
  console.log('');

  // Try to spawn beyond max depth
  console.log('═══════════════════════════════════════════');
  console.log('Testing Spawn Limits');
  console.log('═══════════════════════════════════════════\n');

  // Try spawning a great-grandchild (should succeed, we have depth 3)
  try {
    const subWorker = await worker.spawn({ name: 'sub-worker' });
    console.log(`   ✅ Generation 3 spawn succeeded`);
    await printAgentInfo(subWorker, 3);

    // Try to spawn at max depth (should fail)
    try {
      await subWorker.spawn({ name: 'deep-worker' });
      console.log(`   ✅ Generation 4 spawn succeeded (unexpected)`);
    } catch (error) {
      console.log(`   ❌ Generation 4 spawn blocked: ${(error as Error).message}`);
    }

    await subWorker.shutdown();
  } catch (error) {
    console.log(`   ❌ Spawn failed: ${(error as Error).message}`);
  }

  // Cleanup
  console.log('\n🛑 Shutting down all agents...');
  await worker.shutdown();
  await dataProcessor.shutdown();
  await orchestrator.shutdown();
  console.log('✅ All agents shutdown complete');
}

main().catch(console.error);
