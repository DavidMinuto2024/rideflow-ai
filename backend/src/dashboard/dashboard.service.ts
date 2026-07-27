import { Injectable, Logger } from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';

@Injectable()
export class DashboardService {
  private readonly logger = new Logger(DashboardService.name);

  constructor(private readonly supabase: SupabaseDataService) {}

  async getStats(userId: string) {
    // Get all organizations the user belongs to
    const { data: memberships, error: membershipsError } = await this.supabase
      .from('organization_members')
      .select('organization_id, organization:organizations(*)')
      .eq('user_id', userId);

    if (membershipsError) {
      this.supabase.handleError(membershipsError, 'organization_members');
    }

    const membershipList = memberships || [];
    const organizationIds = membershipList.map(
      (m: any) => m.organization_id,
    );

    if (organizationIds.length === 0) {
      return {
        organizations: 0,
        activeEvents: 0,
        totalParticipants: 0,
        tripsCompletedToday: 0,
        pendingRequests: 0,
        vehicleUtilization: 0,
      };
    }

    // ─── Active events count ───
    const { count: activeEvents, error: activeEventsError } =
      await this.supabase
        .from('events')
        .select('*', { count: 'exact', head: true })
        .in('organization_id', organizationIds)
        .in('status', ['OPEN', 'PUBLISHED']);

    if (activeEventsError) {
      this.supabase.handleError(activeEventsError, 'events');
    }

    // ─── Total participants (all users in user's orgs) ───
    const { count: totalParticipants, error: participantsError } =
      await this.supabase
        .from('organization_members')
        .select('*', { count: 'exact', head: true })
        .in('organization_id', organizationIds);

    if (participantsError) {
      this.supabase.handleError(participantsError, 'organization_members');
    }

    // ─── Get all event IDs across user's organizations ───
    const { data: orgEventIds } = await this.supabase
      .from('events')
      .select('id')
      .in('organization_id', organizationIds);

    const eventIds = (orgEventIds || []).map((e: any) => e.id);

    // ─── Trips today (events happening today) ───
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    let tripsToday = 0;
    if (eventIds.length > 0) {
      // Fetch event IDs happening today for the user's orgs
      const { data: todayEvents } = await this.supabase
        .from('events')
        .select('id')
        .in('id', eventIds)
        .gte('date', todayStart.toISOString())
        .lte('date', todayEnd.toISOString());

      const todayEventIds = (todayEvents || []).map((e: any) => e.id);

      if (todayEventIds.length > 0) {
        const { count, error: tripsTodayError } =
          await this.supabase
            .from('trips')
            .select('*', { count: 'exact', head: true })
            .in('event_id', todayEventIds);

        if (tripsTodayError) {
          this.logger.warn(
            `Trips today count failed: ${tripsTodayError.message}`,
          );
        }
        tripsToday = count || 0;
      }
    }

    // ─── Pending ride requests in active events ───
    let pendingRequests = 0;
    if (eventIds.length > 0) {
      const { count, error: pendingError } =
        await this.supabase
          .from('ride_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'PENDING')
          .in('event_id', eventIds);

      if (pendingError) {
        this.supabase.handleError(pendingError, 'ride_requests');
      }
      pendingRequests = count || 0;
    }

    // ─── Vehicle utilization ───
    const { data: vehicleStats, error: vehicleError } = await this.supabase
      .from('vehicles')
      .select('capacity')
      .in('organization_id', organizationIds)
      .eq('is_active', true);

    if (vehicleError) {
      this.supabase.handleError(vehicleError, 'vehicles');
    }

    const totalCapacity = (vehicleStats || []).reduce(
      (sum: number, v: any) => sum + (v.capacity || 0),
      0,
    );

    // Count all accepted ride requests across user's orgs
    let acceptedRequests = 0;
    if (eventIds.length > 0) {
      const { count, error: acceptedError } =
        await this.supabase
          .from('ride_requests')
          .select('*', { count: 'exact', head: true })
          .eq('status', 'ACCEPTED')
          .in('event_id', eventIds);

      if (acceptedError) {
        this.supabase.handleError(acceptedError, 'ride_requests');
      }
      acceptedRequests = count || 0;
    }

    const vehicleUtilization =
      totalCapacity > 0
        ? Math.round(((acceptedRequests || 0) / totalCapacity) * 100)
        : 0;

    return {
      organizations: organizationIds.length,
      activeEvents: activeEvents || 0,
      totalParticipants: totalParticipants || 0,
      tripsToday: tripsToday || 0,
      pendingRequests: pendingRequests || 0,
      vehicleUtilization,
    };
  }
}
