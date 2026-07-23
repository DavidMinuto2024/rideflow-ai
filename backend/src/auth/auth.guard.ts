import {
  Injectable,
  CanActivate,
  ExecutionContext,
  UnauthorizedException,
} from '@nestjs/common';
import { SupabaseAuthService } from './supabase-auth.service';
import { PrismaService } from '../prisma/prisma.service';

/**
 * JWT Auth guard — validates Supabase-issued JWTs by calling
 * Supabase's Auth API (RS256 verification via JWKS endpoint).
 *
 * On success, attaches the local User record (from our DB) to `request.user`.
 */
@Injectable()
export class AuthGuard implements CanActivate {
  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
    private readonly prisma: PrismaService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest();
    const authHeader = request.headers.authorization;

    if (!authHeader) {
      throw new UnauthorizedException('Missing authorization header');
    }

    const [scheme, token] = authHeader.split(' ');

    if (scheme !== 'Bearer' || !token) {
      throw new UnauthorizedException('Invalid authorization scheme');
    }

    // Verify JWT against Supabase Auth (RS256 + JWKS)
    const supabaseUser = await this.supabaseAuth.getUser(token);

    if (!supabaseUser.email) {
      throw new UnauthorizedException('Token missing email claim');
    }

    // Look up the user in our local database
    const user = await this.prisma.user.findUnique({
      where: { email: supabaseUser.email },
    });

    if (!user) {
      throw new UnauthorizedException('User not found in platform');
    }

    // Attach full user record to request
    request.user = user;

    return true;
  }
}
