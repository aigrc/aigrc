/**
 * @aigos/sdk - Guard Decorator Example
 *
 * This example demonstrates how to use the @guard decorator
 * for method-level governance in class-based services.
 *
 * Run with: npx tsx examples/guard-decorator.ts
 */

import { createGovernedAgent, guard, setAgent } from '@aigos/sdk';

// Define a service with governed methods
class UserService {
  /**
   * Protected read operation
   * Only executes if 'database:read' permission is granted
   */
  @guard({ action: 'database:read', resource: 'users' })
  async getUsers(): Promise<{ id: string; name: string }[]> {
    console.log('   → Fetching users from database...');
    return [
      { id: '1', name: 'Alice' },
      { id: '2', name: 'Bob' },
      { id: '3', name: 'Charlie' },
    ];
  }

  /**
   * Protected write operation with dynamic resource
   * The resource path is interpolated from method arguments
   */
  @guard({ action: 'database:write', resource: 'users/${userId}' })
  async updateUser(userId: string, data: { name: string }): Promise<void> {
    console.log(`   → Updating user ${userId}: ${JSON.stringify(data)}`);
  }

  /**
   * Critical operation requiring human approval
   * Will request HITL approval before executing
   */
  @guard({
    action: 'admin:delete',
    resource: 'users',
    requireApproval: true,
  })
  async deleteAllUsers(): Promise<void> {
    console.log('   → Deleting all users...');
  }

  /**
   * Operation with fallback behavior
   * If the agent is offline, uses fallback policy
   */
  @guard({
    action: 'api:external',
    fallback: 'allow', // Allow if offline
  })
  async callExternalAPI(): Promise<string> {
    console.log('   → Calling external API...');
    return 'API response';
  }
}

// Define a service that will be denied
class AdminService {
  @guard({ action: 'admin:settings' })
  async updateSettings(): Promise<void> {
    console.log('   → Updating admin settings...');
  }
}

async function main() {
  console.log('🚀 Guard Decorator Example\n');

  // Create the governed agent
  const agent = await createGovernedAgent({
    name: 'user-service-agent',
    version: '1.0.0',
    capabilities: {
      allowed_tools: [
        'database:read',
        'database:write',
        'api:external',
      ],
      denied_tools: [
        'admin:*',
      ],
    },
  });

  console.log(`✅ Agent created: ${agent.identity.asset_name}\n`);

  // Create service instances and attach the agent
  const userService = new UserService();
  setAgent(userService, agent);

  const adminService = new AdminService();
  setAgent(adminService, agent);

  // Test allowed operations
  console.log('📋 Testing allowed operations:\n');

  try {
    console.log('1. getUsers() - database:read');
    const users = await userService.getUsers();
    console.log(`   ✅ SUCCESS: Got ${users.length} users\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  try {
    console.log('2. updateUser() - database:write');
    await userService.updateUser('1', { name: 'Alice Updated' });
    console.log(`   ✅ SUCCESS: User updated\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  try {
    console.log('3. callExternalAPI() - api:external');
    const response = await userService.callExternalAPI();
    console.log(`   ✅ SUCCESS: ${response}\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  // Test denied operations
  console.log('📋 Testing denied operations:\n');

  try {
    console.log('4. updateSettings() - admin:settings');
    await adminService.updateSettings();
    console.log(`   ✅ SUCCESS: Settings updated\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  try {
    console.log('5. deleteAllUsers() - admin:delete (HITL required)');
    // Note: This would normally wait for human approval
    // In this example, it will be denied because admin:* is denied
    await userService.deleteAllUsers();
    console.log(`   ✅ SUCCESS: Users deleted\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  // Cleanup
  await agent.shutdown();
  console.log('✅ Agent shutdown complete');
}

main().catch(console.error);
