/**
 * @aigrc/sdk - LangChain Integration Example
 *
 * This example demonstrates how to integrate AIGOS governance
 * with LangChain agents for AI-powered workflows.
 *
 * Run with: npx tsx examples/langchain-integration.ts
 *
 * Note: This is a conceptual example. Actual LangChain integration
 * would require the @langchain/core package.
 */

import { createGovernedAgent, guard, setAgent, withGuard } from '@aigrc/sdk';
import type { GovernedAgent } from '@aigrc/sdk';

// Simulated LangChain tool interface
interface Tool {
  name: string;
  description: string;
  run: (input: string) => Promise<string>;
}

// Simulated LangChain agent executor
class MockLangChainAgent {
  constructor(
    private tools: Tool[],
    private model: string
  ) {}

  async invoke(input: string): Promise<string> {
    console.log(`   🤖 LangChain Agent (${this.model}): Processing "${input}"`);

    // Simulate tool selection and execution
    const tool = this.tools[0];
    if (tool) {
      return tool.run(input);
    }

    return 'No tools available';
  }
}

/**
 * Create governed LangChain tools
 *
 * This wraps standard LangChain tools with AIGOS governance,
 * ensuring each tool call is checked against policies.
 */
function createGovernedTool(
  governedAgent: GovernedAgent,
  tool: { name: string; description: string; action: string; impl: (input: string) => Promise<string> }
): Tool {
  return {
    name: tool.name,
    description: tool.description,
    run: withGuard(
      tool.impl,
      governedAgent,
      { action: tool.action, resource: tool.name }
    ),
  };
}

/**
 * Governed LangChain Agent Wrapper
 *
 * This class wraps a LangChain agent with AIGOS governance,
 * providing policy enforcement for all agent operations.
 */
class GovernedLangChainAgent {
  private agent: MockLangChainAgent;
  private governedAgent: GovernedAgent;

  constructor(agent: MockLangChainAgent, governedAgent: GovernedAgent) {
    this.agent = agent;
    this.governedAgent = governedAgent;
    setAgent(this, governedAgent);
  }

  @guard({
    action: 'langchain:invoke',
    requireApproval: false,
  })
  async invoke(input: string): Promise<string> {
    // Pre-execution telemetry would be tracked here
    const result = await this.agent.invoke(input);
    // Post-execution telemetry would be tracked here
    return result;
  }

  async shutdown() {
    await this.governedAgent.shutdown();
  }
}

async function main() {
  console.log('🚀 LangChain Integration Example\n');
  console.log('═══════════════════════════════════════════════════════');
  console.log('This demonstrates AIGOS governance for LangChain agents,');
  console.log('ensuring AI agent actions are policy-controlled.');
  console.log('═══════════════════════════════════════════════════════\n');

  // Create AIGOS governed agent
  const governedAgent = await createGovernedAgent({
    name: 'langchain-assistant',
    version: '1.0.0',
    capabilities: {
      allowed_tools: [
        'langchain:invoke',
        'tool:web_search',
        'tool:calculator',
        'database:read',
      ],
      denied_tools: [
        'tool:code_execution',  // No arbitrary code execution
        'database:write',       // Read-only database access
        'filesystem:*',         // No filesystem access
      ],
      max_tokens_per_call: 4096,
      max_cost_per_session: 5.00,
    },
    goldenThread: {
      ticket_id: 'AI-789',
      approved_by: 'ai-safety@company.com',
      approved_at: new Date().toISOString(),
    },
    telemetry: true,
  });

  console.log(`✅ AIGOS Agent created: ${governedAgent.identity.asset_name}`);
  console.log(`   Authorization: ${governedAgent.identity.golden_thread?.ticket_id}\n`);

  // Create governed tools
  console.log('📋 Creating governed tools:\n');

  const webSearchTool = createGovernedTool(governedAgent, {
    name: 'web_search',
    description: 'Search the web for information',
    action: 'tool:web_search',
    impl: async (query) => {
      console.log(`      🔍 Searching: "${query}"`);
      return `Search results for: ${query}`;
    },
  });
  console.log(`   ✅ web_search (governed by tool:web_search)`);

  const calculatorTool = createGovernedTool(governedAgent, {
    name: 'calculator',
    description: 'Perform mathematical calculations',
    action: 'tool:calculator',
    impl: async (expression) => {
      console.log(`      🔢 Calculating: ${expression}`);
      // Safe eval for demo (in production, use a proper math parser)
      return `Result: ${expression} = [calculated]`;
    },
  });
  console.log(`   ✅ calculator (governed by tool:calculator)`);

  const codeExecutionTool = createGovernedTool(governedAgent, {
    name: 'code_execution',
    description: 'Execute arbitrary code',
    action: 'tool:code_execution',
    impl: async (code) => {
      console.log(`      ⚠️ Executing code: ${code}`);
      return 'Code executed';
    },
  });
  console.log(`   ⛔ code_execution (DENIED - blocked by policy)\n`);

  // Create LangChain agent with governed tools
  const langchainAgent = new MockLangChainAgent(
    [webSearchTool, calculatorTool],
    'gpt-4'
  );

  // Wrap with AIGOS governance
  const governedLangChain = new GovernedLangChainAgent(langchainAgent, governedAgent);

  // Test allowed operations
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing Allowed Operations');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    console.log('1. Web Search Tool (tool:web_search)');
    const searchResult = await webSearchTool.run('AIGOS governance');
    console.log(`   ✅ SUCCESS: ${searchResult}\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  try {
    console.log('2. Calculator Tool (tool:calculator)');
    const calcResult = await calculatorTool.run('2 + 2');
    console.log(`   ✅ SUCCESS: ${calcResult}\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  try {
    console.log('3. Agent Invocation (langchain:invoke)');
    const result = await governedLangChain.invoke('What is the weather today?');
    console.log(`   ✅ SUCCESS: ${result}\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  // Test denied operations
  console.log('═══════════════════════════════════════════════════════');
  console.log('Testing Denied Operations');
  console.log('═══════════════════════════════════════════════════════\n');

  try {
    console.log('4. Code Execution Tool (tool:code_execution) - BLOCKED');
    const codeResult = await codeExecutionTool.run('console.log("hacked!")');
    console.log(`   ✅ SUCCESS: ${codeResult}\n`);
  } catch (error) {
    console.log(`   ❌ DENIED: ${(error as Error).message}\n`);
  }

  // Show audit trail
  console.log('═══════════════════════════════════════════════════════');
  console.log('Audit Trail');
  console.log('═══════════════════════════════════════════════════════\n');

  console.log('All LangChain operations are logged with:');
  console.log(`   • Agent Instance: ${governedAgent.identity.instance_id.slice(0, 8)}...`);
  console.log(`   • Authorization: ${governedAgent.identity.golden_thread?.ticket_id}`);
  console.log(`   • Approved By: ${governedAgent.identity.golden_thread?.approved_by}`);
  console.log('   • Each tool invocation with timestamp');
  console.log('   • Permission check results');
  console.log('   • Token usage and costs');

  // Cleanup
  await governedLangChain.shutdown();
  console.log('\n✅ Governed LangChain agent shutdown complete');
}

main().catch(console.error);
