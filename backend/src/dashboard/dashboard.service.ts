import { Injectable, Logger } from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';

export interface DriverDashboardResponse {
  tripsToday: number;
  totalPassengersToday: number;
  nextTrip: {
    eventId: string;
    eventName: string;
    tripId: string;
    destination: string;
    estimatedDepartureTime?: string;
  } | null;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    origin: string;
    destination: string;
    status: string;
  }>;
  todayTrips: Array<{
    id: string;
    eventId: string;
    eventName: string;
    destination: string;
    passengerCount: number;
    status: string;
    estimatedDepartureTime?: string;
  }>;
}

export interface PassengerDashboardResponse {
  activeRequests: Array<{
    id: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    status: string;
    createdAt: string;
  }>;
  acceptedTrips: Array<{
    tripId: string;
    eventId: string;
    eventName: string;
    driverName?: string;
    estimatedPickupTime?: string;
    status: string;
  }>;
  availableEvents: Array<{
    id: string;
    title: string;
    date: string;
    origin: string;
    destination: string;
    organizationName: string;
  }>;
}

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

  // ── Driver Dashboard ────────────────────────────────────

  async getDriverDashboard(userId: string): Promise<DriverDashboardResponse> {
    const todayStart = new Date();
    todayStart.setUTCHours(0, 0, 0, 0);
    todayStart.setUTCMinutes(0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setUTCHours(23, 59, 59, 999);

    // ── Trips today where driver_id=userId & event.date in today ──
    const { data: todayTrips, error: todayTripsError } = await this.supabase
      .from('trips')
      .select('*, event:events!inner(id, title, date, origin, destination, status)')
      .eq('driver_id', userId)
      .gte('event.date', todayStart.toISOString())
      .lte('event.date', todayEnd.toISOString());

    if (todayTripsError) {
      this.supabase.handleError(todayTripsError, 'trips');
    }

    const trips = (todayTrips || []) as any[];
    const tripsToday = trips.length;

    // ── Total passengers today ──
    const tripIds = trips.map((t: any) => t.id);
    let totalPassengersToday = 0;
    if (tripIds.length > 0) {
      const { count, error: paError } = await this.supabase
        .from('passenger_assignments')
        .select('*', { count: 'exact', head: true })
        .in('trip_id', tripIds);
      if (paError) this.logger.warn(`Passenger count failed: ${paError.message}`);
      totalPassengersToday = count || 0;
    }

    // ── Next trip (earliest today by estimated_departure_time ASC) ──
    const sorted = [...trips].sort((a: any, b: any) => {
      const aTime = a.estimated_departure_time || a.event.date;
      const bTime = b.estimated_departure_time || b.event.date;
      return new Date(aTime).getTime() - new Date(bTime).getTime();
    });

    const nextTrip = sorted.length > 0
      ? {
          eventId: sorted[0].event_id,
          eventName: sorted[0].event.title,
          tripId: sorted[0].id,
          destination: sorted[0].dest || sorted[0].event.destination,
          estimatedDepartureTime: sorted[0].estimated_departure_time ?? undefined,
        }
      : null;

    // ── Upcoming events where I'm a registered driver ──
    const { data: upcomingEv, error: upcomingError } = await this.supabase
      .from('event_vehicles')
      .select('*, event:events!inner(*)')
      .eq('driver_id', userId)
      .in('event.status', ['OPEN', 'PUBLISHED'])
      .gte('event.date', todayStart.toISOString());

    if (upcomingError) {
      this.supabase.handleError(upcomingError, 'event_vehicles');
    }

    const upcomingEvents = ((upcomingEv || []) as any[]).map((ev: any) => ({
      id: ev.event.id,
      title: ev.event.title,
      date: ev.event.date,
      origin: ev.event.origin,
      destination: ev.event.destination,
      status: ev.event.status,
    }));

    // ── Today trips with passenger count per trip ──
    const todayTripsWithCount = await Promise.all(
      trips.map(async (trip: any) => {
        const { count: pc } = await this.supabase
          .from('passenger_assignments')
          .select('*', { count: 'exact', head: true })
          .eq('trip_id', trip.id);
        return {
          id: trip.id,
          eventId: trip.event_id,
          eventName: trip.event.title,
          destination: trip.dest || trip.event.destination,
          passengerCount: pc || 0,
          status: trip.event.status,
          estimatedDepartureTime: trip.estimated_departure_time ?? undefined,
        };
      }),
    );

    return {
      tripsToday,
      totalPassengersToday,
      nextTrip,
      upcomingEvents,
      todayTrips: todayTripsWithCount,
    };
  }

  // ── Passenger Dashboard ─────────────────────────────────

  async getPassengerDashboard(userId: string): Promise<PassengerDashboardResponse> {
    // ── Active ride requests ──
    const { data: activeReqs, error: reqError } = await this.supabase
      .from('ride_requests')
      .select('*, event:events!inner(id, title, date)')
      .eq('passenger_id', userId)
      .in('status', ['PENDING', 'ACCEPTED'])
      .order('created_at', { ascending: false });

    if (reqError) {
      this.supabase.handleError(reqError, 'ride_requests');
    }

    const activeRequests = ((activeReqs || []) as any[]).map((r: any) => ({
      id: r.id,
      eventId: r.event_id,
      eventName: r.event.title,
      eventDate: r.event.date,
      status: r.status,
      createdAt: r.created_at,
    }));

    // ── Accepted trips (passenger assignments) ──
    const { data: acceptedAssignments, error: assigError } = await this.supabase
      .from('passenger_assignments')
      .select('*, trip:trips!inner(*, event:events!inner(*), driver:users!inner(id, name))')
      .eq('user_id', userId);

    if (assigError) {
      this.supabase.handleError(assigError, 'passenger_assignments');
    }

    const acceptedTrips = ((acceptedAssignments || []) as any[]).map((pa: any) => ({
      tripId: pa.trip_id,
      eventId: pa.trip.event_id,
      eventName: pa.trip.event.title,
      driverName: pa.trip.driver?.name ?? undefined,
      estimatedPickupTime: pa.estimated_pickup_time ?? undefined,
      status: pa.trip.event.status,
    }));

    // ── Available events (OPEN events in user's orgs, no request submitted) ──
    const { data: memberships, error: mError } = await this.supabase
      .from('organization_members')
      .select('organization_id')
      .eq('user_id', userId);

    if (mError) {
      this.supabase.handleError(mError, 'organization_members');
    }

    const orgIds = ((memberships || []) as any[]).map((m: any) => m.organization_id);
    let availableEvents: PassengerDashboardResponse['availableEvents'] = [];

    if (orgIds.length > 0) {
      const { data: events, error: eError } = await this.supabase
        .from('events')
        .select('*, organization:organizations!inner(name)')
        .in('organization_id', orgIds)
        .eq('status', 'OPEN');

      if (eError) {
        this.supabase.handleError(eError, 'events');
      }

      // Filter out events where user already submitted a request
      const eventIds = ((events || []) as any[]).map((e: any) => e.id);
      let existingRequestEventIds: string[] = [];

      if (eventIds.length > 0) {
        const { data: existingReqs } = await this.supabase
          .from('ride_requests')
          .select('event_id')
          .eq('passenger_id', userId)
          .in('event_id', eventIds);
        existingRequestEventIds = ((existingReqs || []) as any[]).map(
          (r: any) => r.event_id,
        );
      }

      availableEvents = ((events || []) as any[])
        .filter((e: any) => !existingRequestEventIds.includes(e.id))
        .map((e: any) => ({
          id: e.id,
          title: e.title,
          date: e.date,
          origin: e.origin,
          destination: e.destination,
          organizationName: e.organization.name,
        }));
    }

    return {
      activeRequests,
      acceptedTrips,
      availableEvents,
    };
  }
}
