import { getAppContext } from '../context';
import { EventsService } from '../../events/events.service';
import { SupabaseDataService } from '../../supabase/supabase-data.service';
import { renderEventsTable } from '../ui/tables';
import { formatEventStatusBadge } from '../ui/theme';
import pc from 'picocolors';
import { EventStatus } from '@prisma/client';

export async function listEventsHandler() {
  const app = await getAppContext();
  const supabase = app.get(SupabaseDataService);

  const { data: events, error } = await supabase
    .from('events')
    .select('*')
    .order('date', { ascending: false })
    .limit(20);

  if (error) {
    console.error(pc.red(`Error listing events: ${error.message}`));
    return;
  }

  console.log(renderEventsTable(events || []));
}

export async function createEventHandler(options: {
  title: string;
  origin: string;
  destination: string;
  date?: string;
  capacity?: number;
}) {
  const app = await getAppContext();
  const eventsService = app.get(EventsService);
  const supabase = app.get(SupabaseDataService);

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

  const eventDate = options.date ? new Date(options.date) : new Date(Date.now() + 86400000 * 7);

  const event = await eventsService.create(orgId, {
    title: options.title,
    origin: options.origin,
    destination: options.destination,
    date: eventDate.toISOString(),
    capacity: options.capacity ? Number(options.capacity) : 4,
  });

  console.log(pc.green(`✔ Event successfully created!`));
  console.log(`ID: ${pc.cyan(event.id)} | Title: ${pc.bold(event.title)} | Status: ${formatEventStatusBadge(event.status)}`);
  return event;
}

export async function transitionStatusHandler(eventId: string, newStatus: EventStatus) {
  const app = await getAppContext();
  const eventsService = app.get(EventsService);
  const supabase = app.get(SupabaseDataService);

  const { data: event } = await supabase.from('events').select('id, status').eq('id', eventId).maybeSingle();
  if (!event) {
    console.log(pc.red(`✖ Event with ID '${eventId}' not found.`));
    return;
  }

  const updated = await eventsService.updateStatus(eventId, { status: newStatus });

  console.log(
    pc.green(`✔ Event state transitioned: `) +
      `${formatEventStatusBadge(event.status)} ➔ ${formatEventStatusBadge(updated.status)}`
  );
  return updated;
}
