# Proposal: CLI & MCP Server for RideFlow Management

## Intent

Enable complete CLI-based orchestration of carpooling flows, events, rides, and vehicle management, along with an MCP (Model Context Protocol) integration for AI agent interaction.

## Scope

### In Scope
- **RideFlow CLI (`scripts/cli.ts` or `cli/`)**: Command-line tool using `commander` / `ts-node` to handle authentication/users, create & list events, manage vehicles, publish rides, trigger event simulations, and test complete flows.
- **E2E Interactive Console Testing**: CLI subcommands to execute real-time or automated flow tests across the backend APIs/Prisma DB.
- **MCP Server Architecture & Prototype Analysis**: Design and specification for `@modelcontextprotocol/sdk` integration to expose RideFlow tools to AI assistants.

### Out of Scope
- Frontend UI modifications.
- Production deployment of standalone MCP hosting infrastructure (local MCP server configuration only).

## Capabilities

### New Capabilities
- `flow-cli`: Terminal interface for full domain operation (events, rides, vehicles, invitations, state transitions, test runner).
- `mcp-server`: Model Context Protocol integration enabling LLMs/agents to query and mutate RideFlow states.

### Modified Capabilities
None

## Approach

1. **CLI Core**: Implement executable TypeScript CLI in `backend/src/cli/` (or `scripts/cli/`) utilizing NestJS Standalone Application Context and `commander` for clean dependency injection and Prisma/Services access.
2. **Flow & Event Management**: Command suite for `event:create`, `event:list`, `ride:publish`, `flow:test`, `event:simulate`.
3. **MCP Server Integration**: Implement an stdio-based MCP Server (`backend/src/mcp/`) using `@modelcontextprotocol/sdk`, exposing tools (`create_event`, `book_ride`, `get_flow_status`) backed by the CLI/backend domain services.

## Affected Areas

| Area | Impact | Description |
|------|--------|-------------|
| `backend/src/cli/` | New | CLI command handlers and entry point |
| `backend/src/mcp/` | New | MCP server definitions and tool schemas |
| `backend/package.json` | Modified | Added dependencies (`commander`, `@modelcontextprotocol/sdk`) & scripts |

## Risks

| Risk | Likelihood | Mitigation |
|------|------------|------------|
| Database pollution during CLI testing | Medium | Provide `--dry-run` or isolated test tenant options |
| Stale state during event simulation | Low | Enforce explicit transaction bounds in NestJS services |

## Rollback Plan

Delete `backend/src/cli/` and `backend/src/mcp/`, remove added npm dependencies, and revert `package.json`.

## Success Criteria

- [ ] CLI executes commands for event creation, ride matching, and flow testing from terminal.
- [ ] End-to-end flow test command validates full carpooling flow in one command.
- [ ] Complete architectural analysis and working prototype schema for MCP server tools.
