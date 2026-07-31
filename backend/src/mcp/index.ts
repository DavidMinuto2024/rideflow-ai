import { startMcpServer } from './server';
import { closeAppContext } from '../cli/context';

startMcpServer().catch(async (err) => {
  console.error('[RideFlow MCP Server] Fatal error:', err);
  await closeAppContext();
  process.exit(1);
});
