import { NestFactory } from '@nestjs/core';
import { INestApplicationContext } from '@nestjs/common';
import { AppModule } from '../app.module';

let appContextInstance: INestApplicationContext | null = null;

/**
 * Lazy singleton wrapper for NestJS Standalone Application Context.
 * Boots NestJS with `{ logger: false }` to ensure stdout/stderr remain clean
 * for TUI rendering and MCP JSON-RPC protocol transport.
 */
export async function getAppContext(): Promise<INestApplicationContext> {
  if (!appContextInstance) {
    appContextInstance = await NestFactory.createApplicationContext(AppModule, {
      logger: false, // Prevents NestJS startup logs from corrupting TUI or MCP stdio transport
    });
  }
  return appContextInstance;
}

/**
 * Gracefully close the NestJS context connection on CLI exit.
 */
export async function closeAppContext(): Promise<void> {
  if (appContextInstance) {
    await appContextInstance.close();
    appContextInstance = null;
  }
}
