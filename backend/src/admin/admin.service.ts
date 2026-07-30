import {
  Injectable,
  NotFoundException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

export interface SystemStats {
  totalOrganizations: number;
  totalUsers: number;
  totalEvents: number;
  totalTrips: number;
  eventsPerMonth: { month: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string | null;
  avatar?: string | null;
  memberships: {
    organizationId: string;
    organizationName: string;
    role: string;
  }[];
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  eventCount: number;
  createdAt: Date;
}

@Injectable()
export class AdminService {
  constructor(private readonly supabase: SupabaseDataService) {}

  async getStats(): Promise<SystemStats> {
    // Total organizations
    const { count: totalOrganizations, error: orgError } = await this.supabase
      .from('organizations')
      .select('*', { count: 'exact', head: true });

    if (orgError) this.supabase.handleError(orgError, 'organizations');

    // Total users
    const { count: totalUsers, error: usersError } = await this.supabase
      .from('users')
      .select('*', { count: 'exact', head: true });

    if (usersError) this.supabase.handleError(usersError, 'users');

    // Total events
    const { count: totalEvents, error: eventsCountError } = await this.supabase
      .from('events')
      .select('*', { count: 'exact', head: true });

    if (eventsCountError) this.supabase.handleError(eventsCountError, 'events');

    // Events with dates for monthly grouping
    const { data: eventsData, error: eventsDateError } = await this.supabase
      .from('events')
      .select('date');

    if (eventsDateError) this.supabase.handleError(eventsDateError, 'events');

    // Group events by month
    const eventsPerMonth: { month: string; count: number }[] = [];
    if (eventsData && eventsData.length > 0) {
      const monthMap = new Map<string, number>();
      for (const event of eventsData as { date: string }[]) {
        const month = (event.date as string).substring(0, 7); // "2026-01"
        monthMap.set(month, (monthMap.get(month) || 0) + 1);
      }
      for (const [month, count] of monthMap.entries()) {
        eventsPerMonth.push({ month, count });
      }
      eventsPerMonth.sort((a, b) => a.month.localeCompare(b.month));
    }

    // Total trips
    const { count: totalTrips, error: tripsError } = await this.supabase
      .from('trips')
      .select('*', { count: 'exact', head: true });

    if (tripsError) this.supabase.handleError(tripsError, 'trips');

    return {
      totalOrganizations: totalOrganizations || 0,
      totalUsers: totalUsers || 0,
      totalEvents: totalEvents || 0,
      totalTrips: totalTrips || 0,
      eventsPerMonth,
    };
  }

  async getUsers(): Promise<AdminUser[]> {
    const { data: users, error } = await this.supabase
      .from('users')
      .select('*, members:organization_members(organization_id, role, organization:organizations(id, name))')
      .order('created_at', { ascending: false });

    if (error) this.supabase.handleError(error, 'users');

    return (users || []).map((user: any) => ({
      id: user.id,
      email: user.email,
      name: user.name,
      phone: user.phone,
      avatar: user.avatar,
      memberships: (user.members || []).map((m: any) => ({
        organizationId: m.organization_id,
        organizationName: m.organization?.name || 'Unknown',
        role: m.role,
      })),
    }));
  }

  async updateUserRole(
    userId: string,
    dto: UpdateUserRoleDto,
    authUserId: string,
  ) {
    // Prevent self-demotion — a SUPER_ADMIN cannot demote themselves
    if (userId === authUserId) {
      throw new BadRequestException(
        'Cannot change your own role. Ask another SUPER_ADMIN to do it.',
      );
    }

    // Verify user exists
    const { data: user, error: userError } = await this.supabase
      .from('users')
      .select('id')
      .eq('id', userId)
      .maybeSingle();

    if (userError) this.supabase.handleError(userError, 'users');
    if (!user) {
      throw new NotFoundException(`User ${userId} not found`);
    }

    // Find the membership to update
    const { data: member, error: memberError } = await this.supabase
      .from('organization_members')
      .select('id, role')
      .eq('organization_id', dto.organizationId)
      .eq('user_id', userId)
      .maybeSingle();

    if (memberError) this.supabase.handleError(memberError, 'organization_members');
    if (!member) {
      throw new NotFoundException(
        `User ${userId} is not a member of organization ${dto.organizationId}`,
      );
    }

    // Update the role
    const { data: updatedMember, error: updateError } = await this.supabase
      .from('organization_members')
      .update({ role: dto.role })
      .eq('id', member.id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'organization_members');

    return updatedMember;
  }

  async getOrganizations(): Promise<AdminOrganization[]> {
    const { data: orgs, error } = await this.supabase
      .from('organizations')
      .select('*')
      .order('created_at', { ascending: false });

    if (error) this.supabase.handleError(error, 'organizations');

    const orgList = (orgs || []) as any[];
    const result: AdminOrganization[] = [];

    for (const org of orgList) {
      // Count members
      const { count: memberCount, error: memberCountError } = await this.supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      if (memberCountError) this.supabase.handleError(memberCountError, 'organization_members');

      // Count events
      const { count: eventCount, error: eventCountError } = await this.supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .eq('organization_id', org.id);

      if (eventCountError) this.supabase.handleError(eventCountError, 'events');

      result.push({
        id: org.id,
        name: org.name,
        slug: org.slug,
        memberCount: memberCount || 0,
        eventCount: eventCount || 0,
        createdAt: org.created_at,
      });
    }

    return result;
  }
}
