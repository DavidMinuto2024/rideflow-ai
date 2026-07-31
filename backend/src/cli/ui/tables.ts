import Table from 'cli-table3';
import pc from 'picocolors';
import { formatEventStatusBadge } from './theme';

export function renderEventsTable(events: any[]): string {
  if (!events || events.length === 0) {
    return pc.yellow('No events found in database.');
  }

  const table = new Table({
    head: [
      pc.cyan('ID'),
      pc.cyan('Title'),
      pc.cyan('Origin → Destination'),
      pc.cyan('Date'),
      pc.cyan('Status'),
      pc.cyan('Cap'),
    ],
    colWidths: [12, 22, 28, 12, 14, 6],
    wordWrap: true,
  });

  events.forEach((ev) => {
    const formattedDate = new Date(ev.date).toLocaleDateString('es-CO');
    table.push([
      ev.id.substring(0, 10),
      ev.title,
      `${ev.origin} ➔ ${ev.destination}`,
      formattedDate,
      formatEventStatusBadge(ev.status),
      ev.capacity,
    ]);
  });

  return table.toString();
}

export function renderSimulationSummaryTable(report: {
  eventId: string;
  title: string;
  driverCount: number;
  passengerCount: number;
  matchedCount: number;
  status: string;
}): string {
  const table = new Table({
    head: [pc.green('Metric'), pc.green('Value')],
    colWidths: [25, 35],
  });

  table.push(
    ['Event ID', report.eventId],
    ['Title', report.title],
    ['Registered Drivers', report.driverCount.toString()],
    ['Passenger Requests', report.passengerCount.toString()],
    ['Matched Assignments', pc.bold(pc.green(report.matchedCount.toString()))],
    ['Final Event Status', formatEventStatusBadge(report.status)]
  );

  return table.toString();
}
