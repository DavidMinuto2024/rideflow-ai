# Exploration: RideFlow CLI & MCP Server Integration

## Current State

RideFlow AI currently operates as a NestJS backend (connected to PostgreSQL via Prisma & Supabase) and a Next.js frontend. All domain logic (events, vehicle registrations, trip creation, passenger requests, and routing suggestions) resides in NestJS services (`EventsService`, `RidesService`, `VehiclesService`, `SuggestionsService`, etc.).

There is currently no unified command-line tool or MCP protocol adapter to inspect state, trigger state transitions, or run end-to-end event simulations directly from terminal or via AI agents.

## Affected Areas

- `backend/src/cli/`: New module housing the executable CLI, commands, interactive prompts, and terminal UI design.
- `backend/src/mcp/`: New module providing the Model Context Protocol (MCP) server integration using `@modelcontextprotocol/sdk`.
- `backend/package.json`: Addition of CLI/UI dependencies (`commander`, `@clack/prompts`, `picocolors`, `cli-table3`, `boxen`, `@modelcontextprotocol/sdk`).

## Approaches & Comparison

### CLI Architecture & UI Design Options

| Approach | UX & Capabilities | Tradeoffs | Recommendation |
|----------|-------------------|-----------|----------------|
| **Option A: Pure Commander.js (Raw Flags)** | Non-interactive command flags only (`--title`, `--date`). | Fast for scripts, but poor interactive experience for human testing. | Cons: Low UX engagement. |
| **Option B: Hybrid Commander + @clack/prompts (Recommended)** | Combined interactive TUI wizard (using `@clack/prompts` + `boxen` + `cli-table3` + `picocolors`) when run without arguments, AND full flag support for scripts. | Minimal extra code, wows the user with modern Astro/Vite-like CLI aesthetic, supports both interactive and scriptable runs. | **SELECTED** |

### MCP Server Integration Options

| Approach | Transport & Execution | Tradeoffs | Recommendation |
|----------|-----------------------|-----------|----------------|
| **Option 1: Stdio MCP Server embedded in NestJS CLI (`rideflow-mcp`)** | Communicates via JSON-RPC stdio using `@modelcontextprotocol/sdk`. Boots NestJS application context. | Standard for IDEs/AGY/Claude Desktop, zero network setup, immediate local tool execution. | **SELECTED** |
| **Option 2: SSE (Server-Sent Events) HTTP Endpoint** | Runs inside NestJS HTTP server as `/mcp/sse`. | Needs exposed port and auth handling, higher complexity for local dev. | Deferred for cloud multi-tenant deployment. |

## Terminal UI Design Specification (`@clack/prompts` + `picocolors`)

1. **Header & Banners**: Gradient ASCII logo & `boxen` framed header with active organization status.
2. **Interactive Main Menu**:
   - `[1] 📅 Manage Events` (Create, List, Transition Status)
   - `[2] 🚗 Manage Vehicles & Drivers` (Register, Assign)
   - `[3] 🎒 Ride Requests & Matching` (Submit Request, Run Matching Algorithm)
   - `[4] ⚡ Run E2E Simulation` (Automated full event cycle test)
   - `[5] 🤖 Launch MCP Server Mode` (Run stdio protocol listener)
3. **Data Display**: Structured tables with `cli-table3` and color-coded status badges:
   - `DRAFT` (Yellow), `PUBLISHED` (Cyan), `OPEN` (Green), `CLOSED` (Red), `FINISHED` (Blue).
4. **Feedback & Spinners**: `@clack/prompts` spinners (`s.start()`, `s.stop()`) for DB queries and route matching calculations.

## MCP Server Tool Definitions

Exposed via `@modelcontextprotocol/sdk`:
1. `rideflow_list_events` (Filters by org, status, date)
2. `rideflow_create_event` (Title, date, origin, destination, capacity)
3. `rideflow_register_event_vehicle` (Driver, vehicle, start location, pico y placa check)
4. `rideflow_request_ride` (Passenger pickup coordinates & address)
5. `rideflow_trigger_event_status` (Executes DRAFT -> PUBLISHED -> OPEN -> CLOSED -> FINISHED state machine)
6. `rideflow_run_simulation` (Runs end-to-end automated carpooling flow test and returns diagnostic report)

## Recommendation

Implement **Option B (Hybrid Commander + @clack/prompts CLI)** along with **Option 1 (Stdio MCP Server)**. Re-use NestJS `NestFactory.createApplicationContext(AppModule)` to give both the CLI and MCP server full access to domain services without HTTP overhead.

## Risks & Mitigations

- **Risk**: Prisma client connection timeouts during CLI execution.
  - *Mitigation*: Gracefully close Prisma connection on process exit in CLI/MCP handlers.
- **Risk**: Execution delay on NestJS bootstrap for quick CLI commands.
  - *Mitigation*: Lazy-load NestJS application context only when executing DB-dependent subcommands.

## Ready for Proposal & Specs

**Yes**. Proceeding with writing detailed Specs (`sdd-spec`) and Technical Design (`sdd-design`).
