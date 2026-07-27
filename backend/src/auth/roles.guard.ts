import {
  Injectable,
  CanActivate,
  ExecutionContext,
  ForbiddenException,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { ROLES_KEY } from './decorators/roles.decorator';

/**
 * Roles guard — checks that the authenticated user has one of the required roles.
 * Must be used after AuthGuard.
 *
 * Behavior:
 * - If the route has an organization ID in params (id or organizationId),
 *   checks the user's role in that specific organization.
 * - Otherwise, checks if the user has the required role in ANY organization
 *   (useful for SUPER_ADMIN global operations).
 */
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly supabase: SupabaseDataService,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true; // no roles required = allow
    }

    const request = context.switchToHttp().getRequest();
    const user = request.user;

    if (!user) {
      throw new ForbiddenException('Authentication required');
    }

    // Try to get org context from route params
    const orgId = request.params?.organizationId;

    if (orgId) {
      // Check role in the specific organization
      const { data: member, error: memberError } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', orgId)
        .eq('user_id', user.id)
        .maybeSingle();

      if (memberError) this.supabase.handleError(memberError, 'organization_members');

      if (!member || !requiredRoles.includes(member.role)) {
        throw new ForbiddenException(
          `Requires one of: ${requiredRoles.join(', ')} in this organization`,
        );
      }

      // Attach role and org context for downstream use
      request.userRole = member.role;
      request.organizationId = orgId;
    } else {
      // No org context — check if user has the role in ANY org
      const { data: memberships, error: membershipsError } = await this.supabase
        .from('organization_members')
        .select('role, organization_id')
        .eq('user_id', user.id)
        .in('role', requiredRoles);

      if (membershipsError) this.supabase.handleError(membershipsError, 'organization_members');

      if (!memberships || memberships.length === 0) {
        throw new ForbiddenException(
          `Requires one of: ${requiredRoles.join(', ')}`,
        );
      }

      // Use the first matching membership for context
      request.userRole = memberships[0].role;
      request.organizationId = memberships[0].organization_id;
    }

    return true;
  }
}
