import pc from 'picocolors';
import boxen from 'boxen';
import { EventStatus } from '@prisma/client';

export const CLI_BRAND_NAME = pc.bold(pc.cyan('RideFlow AI'));
export const CLI_VERSION = pc.dim('v0.1.0');

export function renderBanner(): void {
  const logo = `
   ____  _     ___  _____ _____ _     ______  _  _  _ 
  |  _ \\(_)   / _ \\|  ___|  ___| |    / __ \\ \\| || || |
  | |_) |_  __| | | | |_  | |_  | |   | |  | | || || |
  |  _ <| |/ _\` | | |  _| |  _| | |___| |__| | || || |
  |_| \\_\\_|\\__,_|_| |_|   |_|   |_____|\\____/|_||_||_|
  `;

  console.log(pc.cyan(logo));
  console.log(
    boxen(
      `${pc.bold(pc.white('RideFlow AI — Intelligent Carpooling Orchestrator'))}\n${pc.dim(
        'Console CLI & Model Context Protocol (MCP) Interface'
      )}`,
      {
        padding: 1,
        margin: 0,
        borderStyle: 'round',
        borderColor: 'cyan',
        title: 'RideFlow Shell',
        titleAlignment: 'center',
      }
    )
  );
  console.log('');
}

export function formatEventStatusBadge(status: EventStatus | string): string {
  switch (status) {
    case EventStatus.DRAFT:
      return pc.bgYellow(pc.black(' DRAFT '));
    case EventStatus.PUBLISHED:
      return pc.bgCyan(pc.black(' PUBLISHED '));
    case EventStatus.OPEN:
      return pc.bgGreen(pc.black(' OPEN '));
    case EventStatus.CLOSED:
      return pc.bgRed(pc.white(' CLOSED '));
    case EventStatus.FINISHED:
      return pc.bgBlue(pc.white(' FINISHED '));
    default:
      return pc.bgWhite(pc.black(` ${status} `));
  }
}

export function formatHeader(title: string): string {
  return `${pc.cyan('❯')} ${pc.bold(title)}`;
}
