/**
 * @aigrc/sdk - Golden Thread Example
 *
 * This example demonstrates the Golden Thread Protocol -
 * cryptographically linking runtime agent instances back to
 * their business authorization (e.g., Jira ticket approval).
 *
 * Run with: npx tsx examples/golden-thread.ts
 */

import { createGovernedAgent } from '@aigrc/sdk';
import type { GoldenThread } from '@aigrc/core';
import * as crypto from 'crypto';

/**
 * In production, you would integrate with your authorization system
 * (Jira, ServiceNow, PagerDuty, etc.) to fetch actual approvals.
 */
async function fetchApprovalFromJira(ticketId: string): Promise<GoldenThread> {
  console.log(`📋 Fetching approval from Jira ticket: ${ticketId}`);

  // Simulated Jira API response
  const approval: GoldenThread = {
    ticket_id: ticketId,
    approved_by: 'security-lead@company.com',
    approved_at: '2024-01-15T10:30:00Z',
  };

  console.log(`   ✅ Approved by: ${approval.approved_by}`);
  console.log(`   ✅ Approved at: ${approval.approved_at}`);

  return approval;
}

/**
 * Generate a cryptographic signature for the Golden Thread
 * This ensures the approval cannot be tampered with
 */
function signGoldenThread(goldenThread: GoldenThread, privateKey: string): GoldenThread {
  const payload = JSON.stringify({
    ticket_id: goldenThread.ticket_id,
    approved_by: goldenThread.approved_by,
    approved_at: goldenThread.approved_at,
  });

  // In production, use actual asymmetric cryptography
  // This is a simplified HMAC example
  const signature = crypto
    .createHmac('sha256', privateKey)
    .update(payload)
    .digest('hex');

  return {
    ...goldenThread,
    signature,
  };
}

/**
 * Verify the Golden Thread signature
 */
function verifyGoldenThread(goldenThread: GoldenThread, privateKey: string): boolean {
  if (!goldenThread.signature) return false;

  const payload = JSON.stringify({
    ticket_id: goldenThread.ticket_id,
    approved_by: goldenThread.approved_by,
    approved_at: goldenThread.approved_at,
  });

  const expectedSignature = crypto
    .createHmac('sha256', privateKey)
    .update(payload)
    .digest('hex');

  return goldenThread.signature === expectedSignature;
}

async function main() {
  console.log('🚀 Golden Thread Protocol Example\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('The Golden Thread connects runtime agents to business');
  console.log('authorization, ensuring every agent action is traceable');
  console.log('back to an approved request.');
  console.log('═══════════════════════════════════════════════════════\n');

  // Simulate fetching approval from authorization system
  const ticketId = 'AIGOS-456';
  const approval = await fetchApprovalFromJira(ticketId);

  // Sign the Golden Thread for integrity
  const signingKey = process.env.AIGOS_SIGNING_KEY || 'demo-signing-key';
  const signedApproval = signGoldenThread(approval, signingKey);

  console.log(`\n🔐 Golden Thread signed`);
  console.log(`   Signature: ${signedApproval.signature?.slice(0, 32)}...`);

  // Verify signature
  const isValid = verifyGoldenThread(signedApproval, signingKey);
  console.log(`   Verified: ${isValid ? '✅ Valid' : '❌ Invalid'}\n`);

  // Create agent with Golden Thread
  console.log('═══════════════════════════════════════════════════════');
  console.log('Creating governed agent with Golden Thread');
  console.log('═══════════════════════════════════════════════════════\n');

  const agent = await createGovernedAgent({
    name: 'production-deployer',
    version: '1.0.0',
    capabilities: {
      allowed_tools: ['kubernetes:deploy', 'kubernetes:rollback'],
      denied_tools: ['kubernetes:delete-cluster'],
    },

    // Attach the signed Golden Thread
    goldenThread: signedApproval,
  });

  // Display agent's Golden Thread
  console.log('📜 Agent Golden Thread:');
  console.log(`   Instance ID:  ${agent.identity.instance_id}`);
  console.log(`   Asset ID:     ${agent.identity.asset_id}`);
  console.log(`   Ticket ID:    ${agent.identity.golden_thread?.ticket_id}`);
  console.log(`   Approved By:  ${agent.identity.golden_thread?.approved_by}`);
  console.log(`   Approved At:  ${agent.identity.golden_thread?.approved_at}`);
  console.log(`   GT Hash:      ${agent.identity.golden_thread_hash}`);
  console.log('');

  // Demonstrate traceability
  console.log('═══════════════════════════════════════════════════════');
  console.log('Traceability Example');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('When this agent performs actions, the audit log contains:\n');

  const auditEntry = {
    timestamp: new Date().toISOString(),
    agent: {
      instance_id: agent.identity.instance_id,
      asset_name: agent.identity.asset_name,
      golden_thread_hash: agent.identity.golden_thread_hash,
    },
    action: 'kubernetes:deploy',
    resource: 'production/api-service:v2.1.0',
    authorization: {
      ticket_id: agent.identity.golden_thread?.ticket_id,
      approved_by: agent.identity.golden_thread?.approved_by,
      approved_at: agent.identity.golden_thread?.approved_at,
    },
    result: 'allowed',
  };

  console.log(JSON.stringify(auditEntry, null, 2));

  console.log('\n📊 This creates an unbroken chain from:');
  console.log('   1. Business Request (Jira ticket)');
  console.log('   2. Security Approval (approved_by)');
  console.log('   3. Agent Instance (instance_id)');
  console.log('   4. Runtime Action (audit log)');
  console.log('   5. Cryptographic Proof (golden_thread_hash)');

  // Demonstrate spawned children inherit (partial) Golden Thread
  console.log('\n═══════════════════════════════════════════════════════');
  console.log('Child Agent Golden Thread Inheritance');
  console.log('═══════════════════════════════════════════════════════\n');

  const childAgent = await agent.spawn({
    name: 'rollback-handler',
    capabilities: {
      may_spawn_children: true,
      max_child_depth: 1,
    },
  });

  console.log('Child agent inherits parent\'s Golden Thread:');
  console.log(`   Parent Ticket: ${agent.identity.golden_thread?.ticket_id}`);
  console.log(`   Parent GT Hash: ${agent.identity.golden_thread_hash}`);
  console.log(`   Child lineage traces to same authorization\n`);

  console.log('Lineage provides additional traceability:');
  console.log(`   Child Instance: ${childAgent.identity.instance_id.slice(0, 8)}...`);
  console.log(`   Parent Instance: ${childAgent.lineage.parent_instance_id?.slice(0, 8)}...`);
  console.log(`   Root Instance: ${childAgent.lineage.root_instance_id.slice(0, 8)}...`);

  // Cleanup
  await childAgent.shutdown();
  await agent.shutdown();
  console.log('\n✅ Agents shutdown complete');
}

main().catch(console.error);
