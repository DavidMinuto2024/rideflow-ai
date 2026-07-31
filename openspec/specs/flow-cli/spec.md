# Capability Specification: Flow CLI

## Purpose

The `flow-cli` capability provides a command-line interface and interactive terminal wizard to manage RideFlow domain entities (organizations, users, events, vehicles, rides, invitations) and execute end-to-end event simulations.

## Requirements

### Requirement: Interactive TUI & Command-Line Interface

The system MUST provide both an interactive terminal menu system (when invoked without arguments) and non-interactive command flags for automated execution.

#### Scenario: Interactive Wizard Navigation
Given the user runs `npm run cli` without subcommands
When the CLI boots
Then it MUST render a formatted header with the active organization
And present an interactive selection menu with `@clack/prompts` covering Event Management, Vehicle Registration, Ride Requests, E2E Simulation, and MCP Mode.

#### Scenario: Non-interactive Event Creation
Given a user executes `npm run cli -- event:create --title "Tech Summit" --origin "Bogotá" --destination "Medellín" --date "2026-08-15"`
When the command runs
Then it MUST create the event in the database directly via NestJS `EventsService`
And output a success status badge with the generated event ID.

### Requirement: Event State Machine Management

The CLI MUST support transitioning an event through its valid status lifecycle: `DRAFT` → `PUBLISHED` → `OPEN` → `CLOSED` → `FINISHED`.

#### Scenario: Valid State Transition
Given an event is in `DRAFT` status
When the user executes `npm run cli -- event:status --id <event-id> --to PUBLISHED`
Then the CLI MUST update the event status to `PUBLISHED`
And render a status badge updating from yellow (`DRAFT`) to cyan (`PUBLISHED`).

#### Scenario: Invalid State Transition Prevention
Given an event is in `DRAFT` status
When the user attempts to set status directly to `FINISHED`
Then the CLI MUST reject the transition with a validation error
And display an error box explaining valid transition paths.

### Requirement: End-to-End Event Simulation

The CLI MUST include a `simulate` command that creates an event, registers mock drivers/vehicles, adds passenger requests, runs the route/matching engine, and outputs a complete execution diagnostic report.

#### Scenario: Automated Flow Simulation
Given the user runs `npm run cli -- flow:simulate --passengers 5 --drivers 2`
When the simulation finishes
Then it MUST display a summary table showing created event, driver assignments, matched passengers, calculated pickup order, and estimated pickup times.
