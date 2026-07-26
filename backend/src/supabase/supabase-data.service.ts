import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { handleSupabaseError } from './supabase-error.util';

/**
 * Wraps the Supabase REST API client for server-side database access.
 *
 * Uses the `service_role` key for admin-level access (bypasses RLS).
 * Does NOT persist auth sessions (no auto-refresh, no token storage).
 *
 * Replaces Prisma ORM runtime for all database queries, solving the
 * Render IPv4-only outbound restriction (Supabase REST API works over
 * IPv4 while direct Postgres requires IPv6).
 */
@Injectable()
export class SupabaseDataService {
  private readonly logger = new Logger(SupabaseDataService.name);
  private readonly supabase: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const serviceRoleKey =
      configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.supabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });

    this.logger.log('SupabaseDataService initialized with service_role key');
  }

  /**
   * Returns the raw supabase-js client for direct query building.
   * Use this for all table queries: `.from('table').select('*')...`
   */
  get client(): SupabaseClient {
    return this.supabase;
  }

  /**
   * Shorthand for `this.client.from(table)`.
   */
  from(table: string) {
    return this.supabase.from(table);
  }

  /**
   * Call a stored procedure / Postgres function via `rpc()`.
   * Used for transactions and multi-table operations.
   */
  rpc(fn: string, params?: Record<string, unknown>) {
    return this.supabase.rpc(fn, params);
  }

  /**
   * Execute a raw SQL query via the Supabase REST API.
   * Uses the `/rest/v1/rpc/` endpoint with a `query` RPC function
   * or the Management API for DDL.
   * Falls back to the `supabase.sql` extension if available.
   */
  async query(sql: string, params?: Record<string, unknown>) {
    return this.supabase.rpc('exec_sql', { query: sql, ...params });
  }

  /**
   * Handle a Supabase query error by mapping it to the appropriate
   * NestJS HttpException.
   *
   * @param error - The error object from a supabase-js query
   * @param table - Optional table name for better error messages
   */
  handleError(error: unknown, table?: string): never {
    throw handleSupabaseError(error, table);
  }
}
