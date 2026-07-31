# RideFlow AI — Intelligent Carpooling Platform

RideFlow AI is an intelligent carpooling and event mobility orchestration platform. It provides a NestJS modular backend API, a Next.js frontend, an interactive Console CLI wizard, and a Model Context Protocol (MCP) Server enabling AI agents (like Antigravity, Claude, and Cursor) to query and manage mobility flows autonomously.

---

## 🛠️ Features & Architecture

- **Multi-Tenant Architecture**: Organizes mobility around Organizations, Events, Vehicles, Trips, and Passenger Requests.
- **Event Lifecycle State Machine**: Enforces valid transitions (`DRAFT` → `PUBLISHED` → `OPEN` → `CLOSED` → `FINISHED`).
- **RideFlow CLI TUI**: Interactive terminal wizard powered by `@clack/prompts`, `commander`, `boxen`, `cli-table3`, and `picocolors`.
- **MCP Server**: Stdio JSON-RPC protocol server using `@modelcontextprotocol/sdk` and `zod` for AI tool calling.
- **Database Engine**: Direct Supabase REST API & PostgreSQL integration with fast fallback standalone NestJS context execution.

---

## 💻 RideFlow CLI (Console Wizard)

The CLI supports both an **interactive terminal wizard** (when invoked without arguments) and **scriptable subcommands** for CI/CD or automated test runs.

### Quick Start

```bash
# Launch interactive TUI wizard
npm run cli

# Non-interactive CLI Subcommands
npm run cli -- event:list
npm run cli -- event:create --title "Tech Meetup" --origin "Bogotá" --destination "Chía"
npm run cli -- event:status --id <event-id> --status OPEN
npm run cli -- flow:simulate 3 2
```

### CLI Features
- **Visual Badges**: Color-coded badges for event statuses (`DRAFT`, `PUBLISHED`, `OPEN`, `CLOSED`, `FINISHED`).
- **Interactive Forms**: Step-by-step prompts with validation and cancellation handling.
- **End-to-End Simulation**: Run `flow:simulate [passengers] [drivers]` to automatically generate events, drivers, vehicles, passenger ride requests, and match assignments in one command.

---

## 🤖 Model Context Protocol (MCP) Server

RideFlow AI includes a standard MCP Server over `stdio` transport for AI agents and assistants.

### Quick Start

```bash
# Start MCP Server on stdio transport
npm run mcp

# Run full End-to-End MCP Client verification test
cd backend && npx ts-node src/mcp/test-client.ts
```

### Registered MCP Tools

| MCP Tool Name | Parameters | Description |
|---------------|------------|-------------|
| `rideflow_list_events` | `status?`, `limit?` | List carpooling events with status and limit filters |
| `rideflow_create_event` | `title`, `origin`, `destination`, `date?`, `capacity?` | Create a new event with invite tokens and QR SVG |
| `rideflow_trigger_event_status` | `eventId`, `status` | Execute state machine status transitions |
| `rideflow_run_simulation` | `passengers?`, `drivers?` | Execute an automated carpooling flow simulation |

---

## 🚀 Development Setup

```bash
# Install root & workspace dependencies
npm run setup

# Run backend development server
npm run dev:backend

# Run frontend development server
npm run dev:frontend

# Format & Lint codebase
npm run format
npm run lint
```
