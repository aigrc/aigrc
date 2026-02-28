/**
 * @aigrc/sdk - Control Plane Integration Example
 *
 * This example demonstrates connecting to the AIGOS Control Plane
 * for centralized policy management, HITL approvals, and kill switch.
 *
 * Run with: npx tsx examples/control-plane-integration.ts
 */

import { createGovernedAgent } from '@aigrc/sdk';
import type { GovernedAgent, KillSwitchCommand } from '@aigrc/sdk';

// Environment configuration
const CONTROL_PLANE_URL = process.env.AIGOS_CONTROL_PLANE || 'https://cp.aigos.io';
const AIGOS_API_KEY = process.env.AIGOS_API_KEY || 'demo-api-key';

async function main() {
  console.log('🚀 Control Plane Integration Example\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('This demonstrates connecting to the AIGOS Control Plane');
  console.log('for centralized governance, HITL, and kill switch.');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Configuration:');
  console.log(`   Control Plane: ${CONTROL_PLANE_URL}`);
  console.log(`   API Key: ${AIGOS_API_KEY.slice(0, 8)}...\n`);

  // Create agent connected to Control Plane
  const agent = await createGovernedAgent({
    name: 'production-worker',
    version: '1.0.0',

    // Control Plane connection
    controlPlane: CONTROL_PLANE_URL,
    apiKey: AIGOS_API_KEY,

    // Capabilities (can be overridden by Control Plane policies)
    capabilities: {
      allowed_tools: ['database:read', 'api:call', 'email:send'],
      denied_tools: ['admin:*'],
      max_cost_per_session: 50.00,
    },

    // Kill switch configuration
    killSwitch: {
      enabled: true,
      onCommand: async (command: KillSwitchCommand) => {
        console.log(`\n⚠️  KILL SWITCH COMMAND RECEIVED:`);
        console.log(`   Command: ${command.command}`);
        console.log(`   Reason: ${command.reason || 'No reason provided'}`);
        console.log(`   Timestamp: ${command.timestamp || new Date().toISOString()}`);

        // Custom handling based on command type
        switch (command.command) {
          case 'pause':
            console.log('   Action: Pausing all operations...');
            break;
          case 'terminate':
            console.log('   Action: Shutting down immediately...');
            break;
          case 'restart':
            console.log('   Action: Initiating restart sequence...');
            break;
          case 'resume':
            console.log('   Action: Resuming operations...');
            break;
        }
      },
    },

    // Telemetry sent to Control Plane
    telemetry: {
      enabled: true,
      endpoint: `${CONTROL_PLANE_URL}/telemetry`,
      batchSize: 10,
      flushInterval: 5000,
    },

    // Golden Thread for traceability
    goldenThread: {
      ticket_id: 'PROD-2024-001',
      approved_by: 'ops-team@company.com',
      approved_at: new Date().toISOString(),
    },
  });

  console.log('✅ Agent connected to Control Plane\n');
  console.log('Agent Details:');
  console.log(`   Instance ID: ${agent.identity.instance_id}`);
  console.log(`   Asset ID: ${agent.identity.asset_id}`);
  console.log(`   Mode: ${agent.mode}`);
  console.log(`   Is Paused: ${agent.isPaused}`);
  console.log('');

  // Demonstrate HITL (Human-in-the-Loop) approval
  console.log('═══════════════════════════════════════════════════════');
  console.log('HITL (Human-in-the-Loop) Approval');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Requesting approval for sensitive operation...\n');

  try {
    const approval = await agent.requestApproval({
      action: 'database:bulk_update',
      resource: 'production/users',
      reason: 'Quarterly data cleanup requires bulk user update',
      context: {
        affected_records: 15000,
        estimated_duration: '5 minutes',
        rollback_available: true,
      },
      timeout: 300000, // 5 minutes
      fallback: 'deny', // If offline or timeout, deny
    });

    if (approval.approved) {
      console.log('✅ HITL Approval Granted');
      console.log(`   Approved by: ${approval.approvedBy || 'Control Plane'}`);
      console.log(`   Timestamp: ${approval.approvedAt || new Date().toISOString()}`);
    } else {
      console.log('❌ HITL Approval Denied');
      console.log(`   Reason: ${approval.reason || 'No reason provided'}`);
      if (approval.timedOut) {
        console.log('   Note: Request timed out');
      }
    }
  } catch (error) {
    console.log(`❌ HITL Request Failed: ${(error as Error).message}`);
  }

  console.log('');

  // Demonstrate policy-based permission checking
  console.log('═══════════════════════════════════════════════════════');
  console.log('Policy-Based Permission Checking');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Checking permissions against Control Plane policies:\n');

  const actions = [
    { action: 'database:read', resource: 'users' },
    { action: 'database:write', resource: 'orders' },
    { action: 'api:call', resource: 'payment-gateway' },
    { action: 'admin:settings', resource: 'system' },
  ];

  for (const { action, resource } of actions) {
    const result = await agent.checkPermission(action, resource);
    const status = result.allowed ? '✅' : '❌';
    const reason = result.reason ? ` (${result.reason})` : '';
    console.log(`   ${status} ${action}@${resource}${reason}`);
  }

  console.log('');

  // Demonstrate agent state and mode
  console.log('═══════════════════════════════════════════════════════');
  console.log('Agent State Monitoring');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Current State:');
  console.log(`   Mode: ${agent.mode}`);
  console.log(`   Is Paused: ${agent.isPaused}`);
  console.log(`   Risk Level: ${agent.identity.risk_level}`);
  console.log(`   Generation: ${agent.lineage.generation_depth}`);
  console.log('');

  // Demonstrate telemetry
  console.log('═══════════════════════════════════════════════════════');
  console.log('Telemetry & Observability');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('Telemetry events being sent to Control Plane:');
  console.log('   • Agent lifecycle (start, stop, restart)');
  console.log('   • Permission checks (action, resource, result)');
  console.log('   • HITL requests (request, response, duration)');
  console.log('   • Resource usage (tokens, cost, latency)');
  console.log('   • Errors and exceptions');
  console.log('');

  // Cleanup
  console.log('🛑 Initiating graceful shutdown...');
  await agent.shutdown();
  console.log('✅ Agent disconnected from Control Plane');
}

main().catch(console.error);
