# Capability Specification: MCP Server

## Purpose

The `mcp-server` capability exposes RideFlow AI capabilities over the Model Context Protocol (MCP) using `@modelcontextprotocol/sdk` via `stdio`, allowing AI agents to query state, create events, register vehicles, match rides, and trigger simulations.

## Requirements

### Requirement: Model Context Protocol Stdio Server

The system MUST run a compliant MCP server over `stdio` transport that responds to standard JSON-RPC tool calls.

#### Scenario: Agent Lists Available Tools
Given an AI client connects to the RideFlow MCP server via `stdio`
When the client sends `tools/list`
Then the MCP server MUST respond with tool schemas for `rideflow_list_events`, `rideflow_create_event`, `rideflow_register_event_vehicle`, `rideflow_request_ride`, `rideflow_trigger_event_status`, and `rideflow_run_simulation`.

### Requirement: MCP Tool Execution

The MCP server MUST delegate tool calls directly to NestJS domain services and return JSON-formatted result content blocks.

#### Scenario: Agent Creates Event via MCP Tool
Given an AI client sends a `tools/call` request for `rideflow_create_event` with parameters `{ title: "AI Conf", date: "2026-09-01", origin: "Norte", destination: "Centro", capacity: 20 }`
When the tool executes
Then it MUST invoke `EventsService.create()` in NestJS
And return a text content response with the created event JSON and status code.

#### Scenario: Agent Runs Full Flow Simulation via MCP Tool
Given an AI client sends a `tools/call` request for `rideflow_run_simulation`
When the simulation finishes
Then it MUST return a structured diagnostic summary containing event ID, matched passenger count, driver route metrics, and status.
