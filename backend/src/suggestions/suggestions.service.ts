import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from '../prisma/prisma.service';

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
    private readonly prisma: PrismaService,
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
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Get all registered vehicles for this event with start locations
    const eventVehicles = await this.prisma.eventVehicle.findMany({
      where: {
        eventId,
        startLat: { not: null },
        startLng: { not: null },
      },
      include: {
        driver: { select: { id: true, name: true } },
        vehicle: true,
      },
    });

    if (eventVehicles.length === 0) {
      return { suggestions: [], message: 'No drivers with start locations registered' };
    }

    // Get all pending ride requests with pickup coordinates
    const pendingRequests = await this.prisma.rideRequest.findMany({
      where: {
        eventId,
        status: 'PENDING' as any,
        pickupLat: { not: null },
        pickupLng: { not: null },
      },
      include: {
        passenger: { select: { id: true, name: true } },
      },
    });

    if (pendingRequests.length === 0) {
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
          ev.startLat!,
          ev.startLng!,
          request.pickupLat!,
          request.pickupLng!,
        );

        driverScores.push({
          driverId: ev.driverId,
          driverName: ev.driver?.name || 'Unknown',
          vehicleId: ev.vehicleId,
          vehicleModel: ev.vehicle?.model || 'Unknown',
          capacity: ev.vehicle?.capacity || 4,
          startLat: ev.startLat!,
          startLng: ev.startLng!,
          distanceFromPassenger: Math.round(distance),
          score: this.computeScore(distance),
        });
      }

      // Sort by score descending (closest first)
      driverScores.sort((a, b) => b.score - a.score);

      suggestions.push({
        passengerId: request.passengerId,
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
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (!event.arrivalTime) {
      return {
        message: 'No arrivalTime set on event — cannot compute departure/pickup times',
        trips: [],
      };
    }

    const trips = await this.prisma.trip.findMany({
      where: { eventId },
      include: {
        passengerAssignments: {
          include: { user: true },
          orderBy: { createdAt: 'asc' as const },
        },
      },
    });

    const arrivalTime = new Date(event.arrivalTime).getTime();
    const results: Array<{
      tripId: string;
      estimatedDepartureTime: string | null;
      pickupTimes: Array<{ passengerId: string; pickupTime: string; order: number }>;
      source: string;
    }> = [];

    for (const trip of trips) {
      // Get driver's EventVehicle start location
      const eventVehicle = await this.prisma.eventVehicle.findFirst({
        where: { eventId, driverId: trip.driverId },
      });

      // Build waypoints: driver start → passenger pickups → destination
      const waypoints: OSRMWaypoint[] = [];

      // Driver start (from EventVehicle or from trip origin)
      if (eventVehicle?.startLat && eventVehicle?.startLng) {
        waypoints.push({
          location: [eventVehicle.startLng, eventVehicle.startLat],
          name: eventVehicle.startLocation || 'Driver start',
        });
      } else if (trip.originLat && trip.originLng) {
        waypoints.push({
          location: [trip.originLng, trip.originLat],
          name: trip.origin || 'Driver start',
        });
      }

      // Passenger pickups (from RideRequest or PassengerAssignment)
      const pickups: Array<{ userId: string; lat: number; lng: number }> = [];

      for (const assignment of trip.passengerAssignments) {
        const rideRequest = await this.prisma.rideRequest.findFirst({
          where: {
            eventId,
            passengerId: assignment.userId,
            pickupLat: { not: null },
            pickupLng: { not: null },
          },
        });

        if (rideRequest?.pickupLat && rideRequest?.pickupLng) {
          waypoints.push({
            location: [rideRequest.pickupLng, rideRequest.pickupLat],
            name: rideRequest.pickupAddress || `Pickup ${assignment.userId}`,
          });
          pickups.push({
            userId: assignment.userId,
            lat: rideRequest.pickupLat,
            lng: rideRequest.pickupLng,
          });
        }
      }

      // Destination
      const destLat = trip.destLat ?? event.destLat;
      const destLng = trip.destLng ?? event.destLng;
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
      await this.prisma.trip.update({
        where: { id: trip.id },
        data: { estimatedDepartureTime: departureDate },
      });

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
        const assignment = trip.passengerAssignments.find(
          (pa: { userId: string }) => pa.userId === pickups[i].userId,
        );
        if (assignment) {
          await this.prisma.passengerAssignment.update({
            where: { id: assignment.id },
            data: {
              estimatedPickupTime: pickupTime,
              pickupOrder: i + 1,
            },
          });

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
      arrivalTime: event.arrivalTime.toISOString(),
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
