import {
  intro,
  outro,
  select,
  text,
  spinner,
  isCancel,
  cancel,
  confirm,
} from '@clack/prompts';
import pc from 'picocolors';
import { renderBanner } from './theme';
import { listEventsHandler, createEventHandler, transitionStatusHandler } from '../commands/events.cmd';
import { runSimulationHandler } from '../commands/simulate.cmd';
import { EventStatus } from '@prisma/client';

export async function runInteractiveTUI() {
  renderBanner();
  intro(pc.bold(pc.cyan('Welcome to RideFlow Console Wizard')));

  const action = await select({
    message: 'What would you like to do?',
    options: [
      { value: 'list', label: '📅 List Recent Events', hint: 'Show events and status badges' },
      { value: 'create', label: '✨ Create New Event', hint: 'Interactive event wizard' },
      { value: 'status', label: '🔄 Transition Event Status', hint: 'DRAFT -> PUBLISHED -> OPEN -> FINISHED' },
      { value: 'simulate', label: '⚡ Run E2E Simulation', hint: 'Full automated carpooling flow test' },
      { value: 'exit', label: '❌ Exit' },
    ],
  });

  if (isCancel(action) || action === 'exit') {
    cancel('Exiting RideFlow CLI. Hasta luego!');
    process.exit(0);
  }

  const s = spinner();

  try {
    if (action === 'list') {
      s.start('Fetching events from database...');
      await listEventsHandler();
      s.stop('Events loaded.');
    } else if (action === 'create') {
      const title = await text({
        message: 'Event Title:',
        placeholder: 'e.g. Campus Hackathon 2026',
        validate: (val) => (val.length === 0 ? 'Title is required' : undefined),
      });
      if (isCancel(title)) return cancel('Cancelled');

      const origin = await text({
        message: 'Origin Location:',
        placeholder: 'e.g. Bogotá Norte',
        validate: (val) => (val.length === 0 ? 'Origin is required' : undefined),
      });
      if (isCancel(origin)) return cancel('Cancelled');

      const destination = await text({
        message: 'Destination Location:',
        placeholder: 'e.g. Campus Chía',
        validate: (val) => (val.length === 0 ? 'Destination is required' : undefined),
      });
      if (isCancel(destination)) return cancel('Cancelled');

      s.start('Creating event in database...');
      await createEventHandler({ title: String(title), origin: String(origin), destination: String(destination) });
      s.stop('Event created successfully!');
    } else if (action === 'status') {
      const eventId = await text({
        message: 'Enter Event ID:',
        validate: (val) => (val.length === 0 ? 'ID is required' : undefined),
      });
      if (isCancel(eventId)) return cancel('Cancelled');

      const newStatus = await select({
        message: 'Select New Status:',
        options: [
          { value: EventStatus.DRAFT, label: 'DRAFT' },
          { value: EventStatus.PUBLISHED, label: 'PUBLISHED' },
          { value: EventStatus.OPEN, label: 'OPEN' },
          { value: EventStatus.CLOSED, label: 'CLOSED' },
          { value: EventStatus.FINISHED, label: 'FINISHED' },
        ],
      });
      if (isCancel(newStatus)) return cancel('Cancelled');

      s.start('Updating event status...');
      await transitionStatusHandler(String(eventId), newStatus as EventStatus);
      s.stop('Status updated!');
    } else if (action === 'simulate') {
      const runConfirm = await confirm({
        message: 'Run automated E2E simulation with 3 passengers and 2 drivers?',
      });
      if (isCancel(runConfirm) || !runConfirm) return cancel('Simulation cancelled.');

      s.start('Simulating full carpooling flow (Drivers, Vehicles, Passengers, Matching)...');
      await runSimulationHandler(3, 2);
      s.stop('Simulation completed!');
    }
  } catch (err: any) {
    s.stop('Operation failed.');
    console.error(pc.red(`Error: ${err.message}`));
  }

  outro(pc.green('Done! Execute `npm run cli` anytime to return.'));
}
