# Technical Design: CLI & MCP Server Integration

## System Architecture

The RideFlow CLI and MCP Server are designed as thin entry layers built directly on top of the existing NestJS application modules. Both interfaces bootstrap a NestJS Standalone Application Context (`NestFactory.createApplicationContext(AppModule, { logger: false })`), enabling direct execution of domain logic (`EventsService`, `RidesService`, `VehiclesService`, `SuggestionsService`, `PrismaService`) with full dependency injection and zero HTTP network latency.

```mermaid
graph TD
    User["Terminal User"] -->|Interactive TUI / Flags| CLI["RideFlow CLI (backend/src/cli)"]
    Agent["AI Assistant (AGY/Claude)"] -->|Stdio JSON-RPC| MCP["MCP Server (backend/src/mcp)"]

    subgraph NestJS Standalone Application Context (logger: false)
        CLI --> CmdEngine["Commander.js + @clack/prompts"]
        MCP --> SDK["McpServer (@modelcontextprotocol/sdk/server/mcp.js)"]
        
        CmdEngine --> DomainServices["Domain Services (Events, Rides, Vehicles, Suggestions)"]
        SDK --> DomainServices
        
        DomainServices --> Prisma["Prisma ORM"]
    end

    Prisma --> DB[("PostgreSQL / Supabase")]
```

## Documentation & Best Practices Audit

### 1. `@modelcontextprotocol/sdk` (v1.5+)
- **API**: Use high-level `McpServer` class (`@modelcontextprotocol/sdk/server/mcp.js`).
- **Transport**: `StdioServerTransport` (`@modelcontextprotocol/sdk/server/stdio.js`).
- **Tool Schema Validation**: `zod` schemas inside `server.registerTool(name, { description, inputSchema }, handler)`.
- **CRITICAL STDOUT RULE**: When using `StdioServerTransport`, **no logs can be emitted to stdout** (`console.log`), as stdout is reserved for JSON-RPC messages. NestJS logger must be initialized with `{ logger: false }` or redirected to `stderr`.

### 2. `@clack/prompts` (v0.8+)
- **Session Framing**: Use `intro()` and `outro()` with custom styled headers.
- **Interactive Forms**: Use `group()` with step functions for multi-input flows.
- **Graceful Exit**: Use `isCancel()` check and `cancel()` handler on `CTRL+C`.
- **Async Feedback**: Animated `spinner()` (`s.start()`, `s.stop()`).

### 3. NestJS Standalone Context
- **Context Initialization**: `NestFactory.createApplicationContext(AppModule, { logger: false })` prevents bootstrap logs from corrupting stdout or TUI output.

---

## CLI Architecture & UI Layout (`backend/src/cli/`)

### File Structure
```
backend/src/cli/
├── main.ts              # CLI Entry point & Commander router
├── ui/
│   ├── theme.ts         # Colors (picocolors), icons, badges, banners
│   ├── tables.ts        # Table formatters (cli-table3)
│   └── prompts.ts       # Interactive TUI menus (@clack/prompts)
├── commands/
│   ├── events.cmd.ts    # Event management subcommands
│   ├── rides.cmd.ts     # Ride & Vehicle subcommands
│   ├── simulate.cmd.ts  # End-to-End flow simulation command
│   └── mcp.cmd.ts       # Launcher for MCP server mode
└── context.ts           # Lazy NestJS Application Context Singleton
```

### CLI Terminal UI Specs
- **Header**: Gradient ASCII Banner + active Tenant/Organization context badge.
- **Interactive Prompts**: `@clack/prompts` select menus for action selection, text prompts with validation, multiselect for passenger matching.
- **Status Badges**:
  - `DRAFT`: Yellow `[DRAFT]`
  - `PUBLISHED`: Cyan `[PUBLISHED]`
  - `OPEN`: Green `[OPEN]`
  - `CLOSED`: Red `[CLOSED]`
  - `FINISHED`: Blue `[FINISHED]`
- **Spinners & Formatting**: Animated spinners during DB reads and routing calculations, boxed summary report on completion.

## MCP Server Architecture (`backend/src/mcp/`)

### File Structure
```
backend/src/mcp/
├── server.ts            # McpServer + StdioServerTransport initialization
├── tools/
│   ├── events.tools.ts  # rideflow_list_events, rideflow_create_event, etc.
│   ├── rides.tools.ts   # rideflow_register_event_vehicle, rideflow_request_ride
│   └── flow.tools.ts    # rideflow_trigger_event_status, rideflow_run_simulation
└── index.ts             # MCP Entry point
```

### Tool Definitions & Schemas
Using `McpServer` and `zod`:
- `rideflow_list_events`: List events with status & date filters.
- `rideflow_create_event`: Create new event.
- `rideflow_register_event_vehicle`: Register driver vehicle for event.
- `rideflow_request_ride`: Submit passenger ride request.
- `rideflow_trigger_event_status`: Execute state machine transition (`DRAFT` → `PUBLISHED` → `OPEN` → `CLOSED` → `FINISHED`).
- `rideflow_run_simulation`: Execute complete simulated carpooling workflow.

## Dependencies to Add (`backend/package.json`)

```json
{
  "dependencies": {
    "commander": "^12.1.0",
    "@clack/prompts": "^0.8.2",
    "picocolors": "^1.1.1",
    "cli-table3": "^0.6.5",
    "boxen": "^7.1.1",
    "@modelcontextprotocol/sdk": "^1.5.0",
    "zod": "^3.23.8"
  }
}
```
