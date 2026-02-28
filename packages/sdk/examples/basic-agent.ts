/**
 * @aigrc/sdk - Basic Agent Example
 *
 * This example demonstrates how to create a simple governed agent
 * with basic permission checking and lifecycle management.
 *
 * Run with: npx tsx examples/basic-agent.ts
 */

import { createGovernedAgent } from '@aigrc/sdk';

async function main() {
  console.log('🚀 Creating governed agent...\n');

  // Create a governed agent with basic configuration
  const agent = await createGovernedAgent({
    name: 'order-processor',
    version: '1.0.0',

    // Control Plane configuration (optional - works offline without it)
    // controlPlane: 'https://cp.aigos.io',
    // apiKey: process.env.AIGOS_API_KEY,

    // Define agent capabilities
    capabilities: {
      // Actions this agent can perform
      allowed_tools: [
        'database:read',
        'database:write',
        'api:orders:*',  // Wildcard: all order-related API operations
        'email:send',
      ],

      // Explicitly denied actions (take precedence over allowed)
      denied_tools: [
        'database:drop',
        'admin:*',
      ],

      // Resource limits
      max_cost_per_session: 10.00,  // USD
      max_tokens_per_call: 4096,
    },

    // Enable telemetry for observability
    telemetry: true,
  });

  console.log(`✅ Agent created: ${agent.identity.asset_name}`);
  console.log(`   Instance ID: ${agent.identity.instance_id}`);
  console.log(`   Asset ID: ${agent.identity.asset_id}`);
  console.log(`   Mode: ${agent.mode}\n`);

  // Check permissions before performing actions
  console.log('📋 Checking permissions:\n');

  const permissions = [
    { action: 'database:read', resource: 'orders' },
    { action: 'database:write', resource: 'orders' },
    { action: 'database:drop', resource: 'users' },
    { action: 'api:orders:create', resource: null },
    { action: 'admin:settings', resource: null },
    { action: 'filesystem:write', resource: 'logs' },
  ];

  for (const { action, resource } of permissions) {
    const result = await agent.checkPermission(action, resource ?? undefined);
    const status = result.allowed ? '✅ ALLOWED' : '❌ DENIED';
    const reason = result.reason ? ` (${result.reason})` : '';
    console.log(`   ${action}: ${status}${reason}`);
  }

  // Simulate some work
  console.log('\n🔄 Processing orders...\n');

  // Check permission before each operation
  const readPermission = await agent.checkPermission('database:read', 'orders');
  if (readPermission.allowed) {
    console.log('   📖 Reading orders from database...');
    // Your database read logic here
  }

  const writePermission = await agent.checkPermission('database:write', 'orders');
  if (writePermission.allowed) {
    console.log('   ✏️  Writing order updates...');
    // Your database write logic here
  }

  const emailPermission = await agent.checkPermission('email:send');
  if (emailPermission.allowed) {
    console.log('   📧 Sending order confirmation...');
    // Your email sending logic here
  }

  // Graceful shutdown
  console.log('\n🛑 Shutting down agent...');
  await agent.shutdown();
  console.log('✅ Agent shutdown complete');
}

main().catch(console.error);
