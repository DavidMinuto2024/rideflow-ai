import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { SupabaseDataService } from '../supabase/supabase-data.service';

interface OSRMWaypoint {
  location: [number, number]; // [lng, lat]
  name?: string;
}

interface OSRMResponse {
  code: string;
  routes: Array<{
    geometry: string;
    distance: number;
    duration: number;
    legs: Array<{
      steps: unknown[];
      distance: number;
      duration: number;
      summary: string;
    }>;
  }>;
  waypoints: Array<{
    hint: string;
    name: string;
    location: [number, number];
  }>;
}

export interface DriverSuggestion {
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleModel: string;
  capacity: number;
  startLat: number;
  startLng: number;
  distanceFromPassenger: number;
  score: number;
}

@Injectable()
export class SuggestionsService {
  private readonly osrmBaseUrl: string;

  constructor(
    private readonly supabase: SupabaseDataService,
    private readonly config: ConfigService,
  ) {
    this.osrmBaseUrl = this.config.get<string>('OSRM_BASE_URL', '');
  }

  /**
   * Haversine distance between two lat/lng points in meters.
   */
  haversineDistance(
    lat1: number,
    lng1: number,
    lat2: number,
    lng2: number,
  ): number {
    const R = 6371000; // Earth's radius in meters
    const dLat = this.toRad(lat2 - lat1);
    const dLng = this.toRad(lng2 - lng1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.toRad(lat1)) *
        Math.cos(this.toRad(lat2)) *
        Math.sin(dLng / 2) *
        Math.sin(dLng / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private toRad(deg: number): number {
    return (deg * Math.PI) / 180;
  }

  /**
   * Compute a normalized score (0–100) from a distance in meters.
   * Closer = higher score. 0m → 100, 50km+ → 0.
   */
  private computeScore(distanceMeters: number): number {
    const maxDistance = 50000; // 50km = 0 score
    if (distanceMeters >= maxDistance) return 0;
    return Math.round((1 - distanceMeters / maxDistance) * 100);
  }

  /**
   * Get ranked driver suggestions per pending passenger.
   * For each pending passenger (with pickup coordinates), compute
   * distance from each registered EventVehicle's startLocation,
   * then return suggestions ranked per driver.
   */
  async getSuggestions(eventId: string) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Get all registered vehicles for this event with start locations
    const { data: eventVehicles, error: evError } = await this.supabase
      .from('event_vehicles')
      .select('*, driver:users(id, name), vehicle:vehicles(*)')
      .eq('event_id', eventId)
      .not('start_lat', 'is', null)
      .not('start_lng', 'is', null);

    if (evError) this.supabase.handleError(evError, 'event_vehicles');

    if (!eventVehicles || eventVehicles.length === 0) {
      return { suggestions: [], message: 'No drivers with start locations registered' };
    }

    // Get all pending ride requests with pickup coordinates
    const { data: pendingRequests, error: prError } = await this.supabase
      .from('ride_requests')
      .select('*, passenger:users(id, name)')
      .eq('event_id', eventId)
      .eq('status', 'PENDING')
      .not('pickup_lat', 'is', null)
      .not('pickup_lng', 'is', null);

    if (prError) this.supabase.handleError(prError, 'ride_requests');

    if (!pendingRequests || pendingRequests.length === 0) {
      return { suggestions: [], message: 'No pending passengers with pickup locations' };
    }

    // For each pending passenger, compute distance to each EventVehicle
    const suggestions: Array<{
      passengerId: string;
      passengerName: string;
      drivers: DriverSuggestion[];
    }> = [];

    for (const request of pendingRequests) {
      const driverScores: DriverSuggestion[] = [];

      for (const ev of eventVehicles) {
        const distance = this.haversineDistance(
          ev.start_lat!,
          ev.start_lng!,
          request.pickup_lat!,
          request.pickup_lng!,
        );

        driverScores.push({
          driverId: ev.driver_id,
          driverName: ev.driver?.name || 'Unknown',
          vehicleId: ev.vehicle_id,
          vehicleModel: ev.vehicle?.model || 'Unknown',
          capacity: ev.vehicle?.capacity || 4,
          startLat: ev.start_lat!,
          startLng: ev.start_lng!,
          distanceFromPassenger: Math.round(distance),
          score: this.computeScore(distance),
        });
      }

      // Sort by score descending (closest first)
      driverScores.sort((a, b) => b.score - a.score);

      suggestions.push({
        passengerId: request.passenger_id,
        passengerName: request.passenger?.name || 'Unknown',
        drivers: driverScores,
      });
    }

    return { suggestions };
  }

  /**
   * Optimize departure and pickup times for all trips in an event.
   *
   * For each trip in the event:
   * 1. Collect waypoints: [driverStart → passengerPickups → eventDestination]
   * 2. Call OSRM `/route/v1/driving/{waypoints}` to get leg durations
   * 3. Compute departureTime = arrivalTime - sum(legDurations)
   * 4. Compute per-passenger pickupTime = departureTime + cumulativeLegDuration
   * 5. Store estimatedDepartureTime on Trip and estimatedPickupTime + pickupOrder on each PassengerAssignment
   */
  async optimizeTimes(eventId: string) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('*')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (!event.arrival_time) {
      return {
        message: 'No arrivalTime set on event — cannot compute departure/pickup times',
        trips: [],
      };
    }

    const { data: trips, error: tripsError } = await this.supabase
      .from('trips')
      .select(
        '*, passenger_assignments:passenger_assignments(*, user:users(*))',
      )
      .eq('event_id', eventId)
      .order('created_at', {
        ascending: true,
        foreignTable: 'passenger_assignments',
      });

    if (tripsError) this.supabase.handleError(tripsError, 'trips');

    const arrivalTime = new Date(event.arrival_time).getTime();
    const results: Array<{
      tripId: string;
      estimatedDepartureTime: string | null;
      pickupTimes: Array<{ passengerId: string; pickupTime: string; order: number }>;
      source: string;
    }> = [];

    for (const trip of trips || []) {
      // Get driver's EventVehicle start location
      const { data: eventVehicle, error: evError } = await this.supabase
        .from('event_vehicles')
        .select('start_location, start_lat, start_lng')
        .eq('event_id', eventId)
        .eq('driver_id', trip.driver_id)
        .maybeSingle();

      if (evError) this.supabase.handleError(evError, 'event_vehicles');

      // Build waypoints: driver start → passenger pickups → destination
      const waypoints: OSRMWaypoint[] = [];

      // Driver start (from EventVehicle or from trip origin)
      if (eventVehicle?.start_lat && eventVehicle?.start_lng) {
        waypoints.push({
          location: [eventVehicle.start_lng, eventVehicle.start_lat],
          name: eventVehicle.start_location || 'Driver start',
        });
      } else if (trip.origin_lat && trip.origin_lng) {
        waypoints.push({
          location: [trip.origin_lng, trip.origin_lat],
          name: trip.origin || 'Driver start',
        });
      }

      // Passenger pickups (from RideRequest or PassengerAssignment)
      const pickups: Array<{ userId: string; lat: number; lng: number }> = [];

      for (const assignment of trip.passenger_assignments || []) {
        const { data: rideRequest, error: rrError } = await this.supabase
          .from('ride_requests')
          .select('pickup_lat, pickup_lng, pickup_address')
          .eq('event_id', eventId)
          .eq('passenger_id', assignment.user_id)
          .not('pickup_lat', 'is', null)
          .not('pickup_lng', 'is', null)
          .limit(1)
          .maybeSingle();

        if (rrError) this.supabase.handleError(rrError, 'ride_requests');

        if (rideRequest?.pickup_lat && rideRequest?.pickup_lng) {
          waypoints.push({
            location: [rideRequest.pickup_lng, rideRequest.pickup_lat],
            name: rideRequest.pickup_address || `Pickup ${assignment.user_id}`,
          });
          pickups.push({
            userId: assignment.user_id,
            lat: rideRequest.pickup_lat,
            lng: rideRequest.pickup_lng,
          });
        }
      }

      // Destination
      const destLat = trip.dest_lat ?? event.dest_lat;
      const destLng = trip.dest_lng ?? event.dest_lng;
      if (destLat && destLng) {
        waypoints.push({
          location: [destLng, destLat],
          name: trip.dest || event.destination,
        });
      }

      if (waypoints.length < 2) {
        results.push({
          tripId: trip.id,
          estimatedDepartureTime: null,
          pickupTimes: [],
          source: 'skipped — insufficient waypoints',
        });
        continue;
      }

      // Call OSRM to get leg durations
      let legDurations: number[] = [];
      let source = 'fallback';

      try {
        const osrmResult = await this.callOSRM(waypoints);
        if (osrmResult?.code === 'Ok' && osrmResult.routes.length > 0) {
          legDurations = osrmResult.routes[0].legs.map((leg) => leg.duration);
          source = 'osrm';
        }
      } catch {
        // OSRM unavailable — use fallback estimation
      }

      if (legDurations.length === 0) {
        // Fallback: estimate 5 min per leg
        legDurations = waypoints.slice(0, -1).map(() => 300); // 5 min per leg
        source = 'estimated-fallback';
      }

      // Total duration in ms
      const totalDurationMs = legDurations.reduce((sum, d) => sum + d * 1000, 0);

      // Departure time = arrivalTime - totalDuration
      const departureTimeMs = arrivalTime - totalDurationMs;
      const departureDate = new Date(departureTimeMs);

      // Update trip with estimated departure time
      const { error: tripUpdateError } = await this.supabase
        .from('trips')
        .update({
          estimated_departure_time: departureDate.toISOString(),
        })
        .eq('id', trip.id);

      if (tripUpdateError) this.supabase.handleError(tripUpdateError, 'trips');

      // Compute per-passenger pickup times
      const pickupTimes: Array<{ passengerId: string; pickupTime: string; order: number }> = [];
      let cumulativeMs = departureTimeMs;

      // Waypoints layout: [driverStart, ...pickups, destination]
      // Leg durations: [leg0(driver→pickup1), leg1(pickup1→pickup2), ..., legN(pickupN→dest)]
      // Pickup legs = first N legs where N = number of pickups
      for (let i = 0; i < pickups.length && i < legDurations.length; i++) {
        const legMs = legDurations[i] * 1000;
        cumulativeMs += legMs;
        const pickupTime = new Date(cumulativeMs);

        // Update PassengerAssignment with pickup time and order
        const assignment = (trip.passenger_assignments || []).find(
          (pa: { user_id: string }) => pa.user_id === pickups[i].userId,
        );
        if (assignment) {
          const { error: paError } = await this.supabase
            .from('passenger_assignments')
            .update({
              estimated_pickup_time: pickupTime.toISOString(),
              pickup_order: i + 1,
            })
            .eq('id', assignment.id);

          if (paError) this.supabase.handleError(paError, 'passenger_assignments');

          pickupTimes.push({
            passengerId: pickups[i].userId,
            pickupTime: pickupTime.toISOString(),
            order: i + 1,
          });
        }
      }

      results.push({
        tripId: trip.id,
        estimatedDepartureTime: departureDate.toISOString(),
        pickupTimes,
        source,
      });
    }

    return {
      message: `Optimized times for ${results.length} trip(s)`,
      arrivalTime: new Date(event.arrival_time).toISOString(),
      trips: results,
    };
  }

  private async callOSRM(waypoints: OSRMWaypoint[]): Promise<OSRMResponse | null> {
    if (!this.osrmBaseUrl) {
      return null;
    }

    const coords = waypoints.map((wp) => wp.location.join(',')).join(';');
    const url = `${this.osrmBaseUrl}/route/v1/driving/${coords}?overview=false&geometries=false&steps=false`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<OSRMResponse>;
  }
}
