import { Command } from 'commander';
import { runInteractiveTUI } from './ui/prompts';
import { listEventsHandler, createEventHandler, transitionStatusHandler } from './commands/events.cmd';
import { runSimulationHandler } from './commands/simulate.cmd';
import { closeAppContext } from './context';
import { EventStatus } from '@prisma/client';

const program = new Command();

program
  .name('rideflow-cli')
  .description('RideFlow AI — Intelligent Carpooling Terminal Orchestrator')
  .version('0.1.0');

// Event List
program
  .command('event:list')
  .description('List recent events with status badges')
  .action(async () => {
    await listEventsHandler();
    await closeAppContext();
  });

// Event Create
program
  .command('event:create')
  .description('Create a new carpooling event')
  .requiredOption('-t, --title <title>', 'Event title')
  .requiredOption('-o, --origin <origin>', 'Origin location')
  .requiredOption('-d, --destination <destination>', 'Destination location')
  .option('--date <date>', 'ISO Date string')
  .option('-c, --capacity <capacity>', 'Maximum vehicle capacity', '4')
  .action(async (opts) => {
    await createEventHandler({
      title: opts.title,
      origin: opts.origin,
      destination: opts.destination,
      date: opts.date,
      capacity: Number(opts.capacity),
    });
    await closeAppContext();
  });

// Event Status Transition
program
  .command('event:status')
  .description('Transition event lifecycle status')
  .requiredOption('-i, --id <id>', 'Event ID')
  .requiredOption('-s, --status <status>', 'New Status (DRAFT, PUBLISHED, OPEN, CLOSED, FINISHED)')
  .action(async (opts) => {
    await transitionStatusHandler(opts.id, opts.status.toUpperCase() as EventStatus);
    await closeAppContext();
  });

// E2E Simulation
program
  .command('flow:simulate [passengers] [drivers]')
  .description('Run full end-to-end event carpooling simulation')
  .option('-p, --passengers <count>', 'Number of passengers', '3')
  .option('-dr, --drivers <count>', 'Number of drivers', '2')
  .action(async (passengersArg, driversArg, opts) => {
    const passengers = passengersArg ? Number(passengersArg) : Number(opts.passengers);
    const drivers = driversArg ? Number(driversArg) : Number(opts.drivers);
    await runSimulationHandler(passengers, drivers);
    await closeAppContext();
  });

async function main() {
  // If no CLI args supplied, launch interactive @clack/prompts TUI
  if (process.argv.length <= 2) {
    await runInteractiveTUI();
    await closeAppContext();
  } else {
    await program.parseAsync(process.argv);
  }
}

main().catch(async (err) => {
  console.error('CLI Fatal Error:', err);
  await closeAppContext();
  process.exit(1);
});
