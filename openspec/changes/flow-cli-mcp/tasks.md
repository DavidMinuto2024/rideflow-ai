# Implementation Tasks: CLI & MCP Integration

## Phase 1: Infrastructure & Dependencies
- [x] 1.1 Install CLI and MCP packages in `backend/package.json` (`commander`, `@clack/prompts`, `picocolors`, `cli-table3`, `boxen`, `@modelcontextprotocol/sdk`, `zod`).
- [x] 1.2 Add npm scripts (`"cli"`, `"mcp"`) in `backend/package.json` and root `package.json`.
- [x] 1.3 Create NestJS Standalone Application Context loader in `backend/src/cli/context.ts`.

## Phase 2: CLI Theme & UI Engine
- [x] 2.1 Implement `backend/src/cli/ui/theme.ts` (ASCII banners, color badges for event statuses, header box).
- [x] 2.2 Implement `backend/src/cli/ui/tables.ts` (formatted tables for events, trips, drivers, passengers using `cli-table3`).
- [x] 2.3 Implement `backend/src/cli/ui/prompts.ts` (interactive TUI wizard using `@clack/prompts`).

## Phase 3: CLI Commands Implementation
- [x] 3.1 Implement event management commands (`event:create`, `event:list`, `event:status`) in `backend/src/cli/commands/events.cmd.ts`.
- [x] 3.2 Implement vehicle & ride commands (`vehicle:register`, `ride:request`, `ride:match`) in `backend/src/cli/commands/rides.cmd.ts`.
- [x] 3.3 Implement full E2E flow simulation command (`flow:simulate`) in `backend/src/cli/commands/simulate.cmd.ts`.
- [x] 3.4 Wire main entry point `backend/src/cli/main.ts` connecting Commander flags + `@clack/prompts` interactive mode.

## Phase 4: MCP Server Implementation
- [x] 4.1 Implement MCP Server setup with `StdioServerTransport` in `backend/src/mcp/server.ts`.
- [x] 4.2 Register MCP tools (`rideflow_list_events`, `rideflow_create_event`, `rideflow_register_event_vehicle`, `rideflow_request_ride`, `rideflow_trigger_event_status`, `rideflow_run_simulation`) in `backend/src/mcp/tools/`.
- [x] 4.3 Wire MCP entry point `backend/src/mcp/index.ts`.

## Phase 5: Verification & Testing
- [x] 5.1 Test interactive CLI TUI mode (`npm run cli`).
- [x] 5.2 Test non-interactive CLI flags mode (`npm run cli -- flow:simulate`).
- [x] 5.3 Verify MCP tool execution and JSON-RPC responses over stdio.
