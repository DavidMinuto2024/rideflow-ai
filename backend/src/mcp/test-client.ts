import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import pc from 'picocolors';
import * as path from 'path';

async function runMcpFullTest() {
  console.log(pc.bold(pc.cyan('🤖 Initializing RideFlow MCP Server End-to-End Test...\n')));

  const transport = new StdioClientTransport({
    command: process.execPath, // node.exe
    args: ['-r', 'ts-node/register/transpile-only', 'src/mcp/index.ts'],
    cwd: path.resolve(__dirname, '../..'),
    stderr: 'inherit',
  });

  const client = new Client(
    {
      name: 'rideflow-mcp-test-client',
      version: '1.0.0',
    },
    {
      capabilities: {},
    }
  );

  try {
    console.log(pc.dim('Connecting to MCP Server over Stdio JSON-RPC...'));
    await client.connect(transport);
    console.log(pc.green('✔ Connected to MCP Server over Stdio!\n'));

    // 1. List Tools
    console.log(pc.bold(pc.yellow('[Test 1] Querying Registered Tools (tools/list)...')));
    const { tools } = await client.listTools();
    console.log(pc.green(`Found ${tools.length} registered MCP tools:`));
    tools.forEach((t) => console.log(`  • ${pc.bold(t.name)}: ${pc.dim(t.description || '')}`));
    console.log('');

    // 2. Create Event Tool
    console.log(pc.bold(pc.yellow('[Test 2] Invoking tool "rideflow_create_event"...')));
    const createResult: any = await client.callTool({
      name: 'rideflow_create_event',
      arguments: {
        title: 'MCP E2E Integration Event',
        origin: 'Bogotá (Zona Rosa)',
        destination: 'Chía (Campus)',
        capacity: 4,
      },
    });
    console.log(pc.green('✔ "rideflow_create_event" response:'));
    console.log(pc.white(createResult.content[0].text));
    console.log('');

    // 3. List Events Tool
    console.log(pc.bold(pc.yellow('[Test 3] Invoking tool "rideflow_list_events"...')));
    const listResult: any = await client.callTool({
      name: 'rideflow_list_events',
      arguments: { limit: 3 },
    });
    console.log(pc.green('✔ "rideflow_list_events" response:'));
    console.log(pc.white(listResult.content[0].text));
    console.log('');

    // 4. Run Simulation Tool
    console.log(pc.bold(pc.yellow('[Test 4] Invoking tool "rideflow_run_simulation"...')));
    const simResult: any = await client.callTool({
      name: 'rideflow_run_simulation',
      arguments: { passengers: 2, drivers: 1 },
    });
    console.log(pc.green('✔ "rideflow_run_simulation" response:'));
    console.log(pc.white(simResult.content[0].text));
    console.log('');

    console.log(pc.bold(pc.bgGreen(pc.black(' 🎉 ALL MCP SERVER TESTS PASSED PERFECTLY! '))));
  } catch (err: any) {
    console.error(pc.red(`✖ MCP Server Test Failed: ${err.message}`));
    console.error(err);
  } finally {
    await client.close();
  }
}

runMcpFullTest().catch(console.error);
