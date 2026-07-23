import { Injectable, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createClient, SupabaseClient } from '@supabase/supabase-js';

/**
 * Wraps Supabase Auth operations (server-side).
 * Uses the anon key for client-facing operations and the service role key
 * for admin operations (e.g. token verification).
 */
@Injectable()
export class SupabaseAuthService {
  private supabaseAnon: SupabaseClient;
  private supabaseAdmin: SupabaseClient;

  constructor(private configService: ConfigService) {
    const supabaseUrl = configService.getOrThrow<string>('SUPABASE_URL');
    const anonKey = configService.getOrThrow<string>('SUPABASE_ANON_KEY');
    const serviceRoleKey =
      configService.getOrThrow<string>('SUPABASE_SERVICE_ROLE_KEY');

    this.supabaseAnon = createClient(supabaseUrl, anonKey);
    this.supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    });
  }

  /**
   * Register a new user via Supabase Auth (email + password).
   */
  async signup(email: string, password: string) {
    const { data, error } = await this.supabaseAnon.auth.signUp({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Login with email + password via Supabase Auth.
   */
  async login(email: string, password: string) {
    const { data, error } = await this.supabaseAnon.auth.signInWithPassword({
      email,
      password,
    });

    if (error) {
      throw new UnauthorizedException(error.message);
    }

    return {
      user: data.user,
      session: data.session,
    };
  }

  /**
   * Verify a JWT token and retrieve the Supabase user.
   * This calls Supabase's Auth API which verifies the RS256 signature
   * against the JWKS endpoint internally.
   */
  async getUser(token: string) {
    const { data, error } = await this.supabaseAdmin.auth.getUser(token);

    if (error || !data.user) {
      throw new UnauthorizedException('Invalid or expired token');
    }

    return data.user;
  }
}
