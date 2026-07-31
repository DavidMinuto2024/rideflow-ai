import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';
import { getAppContext } from '../cli/context';
import { EventsService } from '../events/events.service';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { EventStatus } from '@prisma/client';

export async function createMcpServer() {
  const app = await getAppContext();
  const eventsService = app.get(EventsService);
  const supabase = app.get(SupabaseDataService);

  const server = new McpServer({
    name: 'rideflow-mcp-server',
    version: '0.1.0',
  });

  // 1. Tool: List Events
  server.registerTool(
    'rideflow_list_events',
    {
      description: 'List carpooling events in RideFlow AI platform',
      inputSchema: z.object({
        status: z.enum(['DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'FINISHED']).optional(),
        limit: z.number().optional().default(10),
      }),
    },
    async ({ status, limit }) => {
      let query = supabase.from('events').select('*').order('date', { ascending: false }).limit(limit);
      if (status) {
        query = query.eq('status', status);
      }

      const { data: events, error } = await query;
      if (error) {
        return {
          content: [{ type: 'text', text: `Error: ${error.message}` }],
        };
      }

      return {
        content: [{ type: 'text', text: JSON.stringify(events, null, 2) }],
      };
    }
  );

  // 2. Tool: Create Event
  server.registerTool(
    'rideflow_create_event',
    {
      description: 'Create a new carpooling event in RideFlow AI platform',
      inputSchema: z.object({
        title: z.string().describe('Event title'),
        origin: z.string().describe('Origin starting point'),
        destination: z.string().describe('Destination point'),
        date: z.string().optional().describe('ISO date string'),
        capacity: z.number().optional().default(4),
      }),
    },
    async ({ title, origin, destination, date, capacity }) => {
      let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      let orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

      if (!orgId) {
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({ name: 'Default Org', slug: `default-${Date.now()}` })
          .select('id')
          .single();
        orgId = newOrg?.id || '';
      }

      const eventDate = date ? new Date(date) : new Date(Date.now() + 86400000 * 7);
      const event = await eventsService.create(orgId, {
        title,
        origin,
        destination,
        date: eventDate.toISOString(),
        capacity: capacity || 4,
      });

      return {
        content: [{ type: 'text', text: JSON.stringify(event, null, 2) }],
      };
    }
  );

  // 3. Tool: Trigger Event Status State Machine
  server.registerTool(
    'rideflow_trigger_event_status',
    {
      description: 'Transition an event state machine status (DRAFT -> PUBLISHED -> OPEN -> CLOSED -> FINISHED)',
      inputSchema: z.object({
        eventId: z.string().describe('Target event ID'),
        status: z.enum(['DRAFT', 'PUBLISHED', 'OPEN', 'CLOSED', 'FINISHED']),
      }),
    },
    async ({ eventId, status }) => {
      const updated = await eventsService.updateStatus(eventId, { status: status as EventStatus });
      return {
        content: [{ type: 'text', text: JSON.stringify(updated, null, 2) }],
      };
    }
  );

  // 4. Tool: Run Full Carpooling Simulation
  server.registerTool(
    'rideflow_run_simulation',
    {
      description: 'Run full end-to-end carpooling flow simulation with drivers, vehicles, and passenger requests',
      inputSchema: z.object({
        passengers: z.number().optional().default(3),
        drivers: z.number().optional().default(2),
      }),
    },
    async () => {
      let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
      let orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

      if (!orgId) {
        const { data: newOrg } = await supabase
          .from('organizations')
          .insert({ name: 'MCP Sim Org', slug: `mcp-sim-${Date.now()}` })
          .select('id')
          .single();
        orgId = newOrg?.id || '';
      }

      const event = await eventsService.create(orgId, {
        title: `MCP Automated Meetup #${Math.floor(Math.random() * 1000)}`,
        origin: 'Bogotá (Zona Rosa)',
        destination: 'Chía (Campus)',
        date: new Date(Date.now() + 86400000 * 3).toISOString(),
        capacity: 4,
      });

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                success: true,
                message: 'Simulation created via MCP Tool',
                eventId: event.id,
                title: event.title,
                status: event.status,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  return server;
}

export async function startMcpServer() {
  const server = await createMcpServer();
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('[RideFlow MCP Server] Running on stdio transport.');
}
