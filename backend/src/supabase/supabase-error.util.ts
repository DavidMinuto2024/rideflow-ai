import {
  HttpException,
  HttpStatus,
  NotFoundException,
  ConflictException,
  BadRequestException,
  ServiceUnavailableException,
  UnauthorizedException,
  InternalServerErrorException,
} from '@nestjs/common';

// ─── Types ─────────────────────────────────────────────────

interface SupabaseError {
  code?: string;
  message?: string;
  details?: string;
  hint?: string;
}

// ─── Error Classification ──────────────────────────────────

type ErrorCategory =
  | 'not_found'
  | 'unique_violation'
  | 'foreign_key_violation'
  | 'auth_error'
  | 'rate_limit'
  | 'network_timeout'
  | 'undefined_table'
  | 'unknown';

interface ErrorRule {
  category: ErrorCategory;
  exception: new (message: string) => HttpException;
  defaultMessage: string;
}

const ERROR_RULES: Record<string, ErrorRule> = {
  // Row not found when using .single()
  PGRST116: {
    category: 'not_found',
    exception: NotFoundException,
    defaultMessage: 'Resource not found',
  },
  // Unique violation
  '23505': {
    category: 'unique_violation',
    exception: ConflictException,
    defaultMessage: 'Resource already exists',
  },
  // Foreign key violation
  '23503': {
    category: 'foreign_key_violation',
    exception: BadRequestException,
    defaultMessage: 'Referenced resource does not exist',
  },
  // Undefined table
  '42P01': {
    category: 'undefined_table',
    exception: InternalServerErrorException,
    defaultMessage: 'Database schema error',
  },
  // Auth errors (Supabase Auth API)
  '401': {
    category: 'auth_error',
    exception: UnauthorizedException,
    defaultMessage: 'Authentication failed',
  },
  // Permission denied (RLS or role-based)
  '403': {
    category: 'auth_error',
    exception: UnauthorizedException,
    defaultMessage: 'Permission denied',
  },
  // Rate limited — TooManyRequestsException not available in @nestjs/common v10,
  // so we map to HttpException with HTTP 429 status
  '429': {
    category: 'rate_limit',
    exception: class extends HttpException {
      constructor(message: string) {
        super(message, HttpStatus.TOO_MANY_REQUESTS);
      }
    },
    defaultMessage: 'Too many requests — please try again later',
  },
};

const NETWORK_TIMEOUT_MESSAGES = [
  'fetch failed',
  'network timeout',
  'aborted',
  'connection refused',
  'socket hang up',
  'econnrefused',
  'enotfound',
  'request timed out',
];

// ─── Main Function ─────────────────────────────────────────

/**
 * Maps a Supabase/PostgREST error to a NestJS HTTP exception.
 *
 * Usage:
 * ```typescript
 * const { data, error } = await supabase.from('events').select('*');
 * if (error) throw handleSupabaseError(error, 'events');
 * ```
 *
 * Error code reference:
 * | Code     | Meaning             | HTTP Status |
 * |----------|---------------------|-------------|
 * | PGRST116 | Row not found       | 404         |
 * | 23505    | Unique violation    | 409         |
 * | 23503    | FK violation        | 400         |
 * | 42P01    | Undefined table     | 500         |
 * | Timeout  | Network unreachable | 503         |
 * | 401/403  | Auth error          | 401         |
 * | 429      | Rate limited        | 429         |
 * | Other    | Unknown             | 500         |
 */
export function handleSupabaseError(
  error: unknown,
  table?: string,
): HttpException {
  if (!error) {
    return new InternalServerErrorException('Unknown error');
  }

  const err = normalizeError(error);
  const context = table ? ` for ${table}` : '';

  // ── Network / timeout errors ─────────────────────────
  if (isNetworkError(err)) {
    return new ServiceUnavailableException(
      `Database service unreachable${context}`,
    );
  }

  // ── PostgREST error code mapping ─────────────────────
  if (err.code && ERROR_RULES[err.code]) {
    const rule = ERROR_RULES[err.code];
    const message = `${rule.defaultMessage}${context}`;
    return new rule.exception(message);
  }

  // ── HTTP status code from error object ───────────────
  const statusCode = extractStatusCode(err);
  if (statusCode && ERROR_RULES[String(statusCode)]) {
    const rule = ERROR_RULES[String(statusCode)];
    const message = `${rule.defaultMessage}${context}`;
    return new rule.exception(message);
  }

  // ── Supabase Auth errors ────────────────────────────
  if (err.message?.toLowerCase().includes('auth')) {
    return new UnauthorizedException(
      `Authentication failed${context}: ${err.message}`,
    );
  }

  // ── Any other 4xx status ────────────────────────────
  if (statusCode && statusCode >= 400 && statusCode < 500) {
    return new BadRequestException(
      `Request failed${context}: ${err.message || `HTTP ${statusCode}`}`,
    );
  }

  // ── Fallback ────────────────────────────────────────
  return new InternalServerErrorException(
    `Database error${context}: ${err.message || 'Unknown error'}`,
  );
}

// ─── Helpers ───────────────────────────────────────────────

function normalizeError(error: unknown): SupabaseError {
  if (typeof error === 'object' && error !== null) {
    return error as SupabaseError;
  }
  if (typeof error === 'string') {
    return { message: error };
  }
  return { message: String(error) };
}

function isNetworkError(err: SupabaseError): boolean {
  const msg = (err.message || '').toLowerCase();
  return NETWORK_TIMEOUT_MESSAGES.some((kw) => msg.includes(kw));
}

function extractStatusCode(err: SupabaseError): number | null {
  if (err.code && /^\d{3}$/.test(err.code)) {
    return parseInt(err.code, 10);
  }
  return null;
}
