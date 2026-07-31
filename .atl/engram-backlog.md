# Engram Backlog & Future Tasks: RideFlow AI

## Deferred Feature: Remote MCP Server (SSE Transport in NestJS)

- **Topic Key**: `rideflow/mcp-server-sse-remote`
- **Context**: Local CLI and Stdio MCP Server are fully implemented and operational (`npm run cli`, `npm run mcp`).
- **Deferred Task**: Expose Remote MCP Server via SSE (Server-Sent Events) HTTP transport inside NestJS backend on Render (`/mcp/sse` and `/mcp/messages`).

### Architecture Plan for SSE Remote MCP
1. Add `SSEServerTransport` from `@modelcontextprotocol/sdk/server/sse.js`.
2. Create NestJS Controller `src/mcp/mcp.controller.ts` with routes:
   - `GET /mcp/sse`: Establishes SSE stream connection with AI clients.
   - `POST /mcp/messages`: Receives JSON-RPC tool invocation messages.
3. Protect endpoints with API Key guard (`Header: X-MCP-API-KEY`).
4. Re-use existing `createMcpServer()` tool definitions from `backend/src/mcp/server.ts`.
