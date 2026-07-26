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

@Injectable()
export class RoutesService {
  private readonly osrmBaseUrl: string;

  constructor(
    private readonly prisma: PrismaService,
    private readonly config: ConfigService,
  ) {
    this.osrmBaseUrl = this.config.get<string>('OSRM_BASE_URL', '');
  }

  async getOptimizedRoute(
    eventId: string,
    tripId: string,
    extraWaypoints: Array<{ lat: number; lng: number }> = [],
  ) {
    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, eventId },
      include: {
        event: true,
        passengerAssignments: {
          include: { user: true },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} not found in event ${eventId}`);
    }

    const event = trip.event;

    // Build waypoints: driver start → passenger pickups → destination
    const waypoints: OSRMWaypoint[] = [];

    // Start: trip's own origin (driver start) if available, else event origin
    if (trip.originLat && trip.originLng) {
      waypoints.push({
        location: [trip.originLng, trip.originLat],
        name: trip.origin || 'Salida del conductor',
      });
    } else if (event.originLat && event.originLng) {
      waypoints.push({
        location: [event.originLng, event.originLat],
        name: event.origin,
      });
    }

    // Extra waypoints passed from the frontend (e.g. passenger pickup points)
    for (const wp of extraWaypoints) {
      waypoints.push({
        location: [wp.lng, wp.lat],
        name: 'Punto de encuentro',
      });
    }

    // End: trip's own destination if available, else event destination
    if (trip.destLat && trip.destLng) {
      waypoints.push({
        location: [trip.destLng, trip.destLat],
        name: trip.dest || 'Destino',
      });
    } else if (event.destLat && event.destLng) {
      waypoints.push({
        location: [event.destLng, event.destLat],
        name: event.destination,
      });
    }

    if (waypoints.length < 2) {
      // Fallback: straight-line distance estimation
      return this.fallbackRoute(event, trip);
    }

    // Try OSRM first
    try {
      const result = await this.callOSRM(waypoints);
      if (result && result.code === 'Ok' && result.routes.length > 0) {
        const route = result.routes[0];

        // Store route data in trip
        await this.prisma.trip.update({
          where: { id: tripId },
          data: {
            distance: route.distance,
            duration: route.duration,
            routeGeometry: route.geometry,
          },
        });

        return {
          source: 'osrm',
          distance: route.distance,
          duration: route.duration,
          geometry: route.geometry,
          waypoints: result.waypoints.map((wp) => ({
            name: wp.name,
            location: wp.location,
          })),
        };
      }
    } catch {
      // OSRM unavailable — fallback
    }

    // Fallback
    return this.fallbackRoute(event, trip);
  }

  private async callOSRM(waypoints: OSRMWaypoint[]): Promise<OSRMResponse | null> {
    if (!this.osrmBaseUrl) {
      return null;
    }

    const coords = waypoints.map((wp) => wp.location.join(',')).join(';');
    const url = `${this.osrmBaseUrl}/route/v1/driving/${coords}?overview=full&geometries=polyline&steps=false`;

    const response = await fetch(url);
    if (!response.ok) {
      return null;
    }

    return response.json() as Promise<OSRMResponse>;
  }

  private async fallbackRoute(
    event: { originLat?: number | null; originLng?: number | null; destLat?: number | null; destLng?: number | null; origin: string; destination: string },
    trip: { id: string; originLat?: number | null; originLng?: number | null; destLat?: number | null; destLng?: number | null },
  ) {
    // Calculate straight-line distance using haversine formula
    let distance = 0;
    let duration = 0;

    // Prefer trip coordinates, then event coordinates
    const startLat = trip.originLat ?? event.originLat;
    const startLng = trip.originLng ?? event.originLng;
    const endLat = trip.destLat ?? event.destLat;
    const endLng = trip.destLng ?? event.destLng;

    if (startLat && startLng && endLat && endLng) {
      distance = this.haversineDistance(
        startLat,
        startLng,
        endLat,
        endLng,
      );

      // Assume average speed of 40 km/h for estimation
      const speedMps = 11.11; // 40 km/h in m/s
      duration = distance / speedMps;
    } else {
      // Rough estimate from address strings — use a fixed distance
      distance = 10000; // 10km default
      duration = 900; // 15 min default
    }

    // Store fallback data
    await this.prisma.trip.update({
      where: { id: trip.id },
      data: {
        distance: Math.round(distance),
        duration: Math.round(duration),
        routeGeometry: null,
      },
    });

    return {
      source: 'fallback',
      distance: Math.round(distance),
      duration: Math.round(duration),
      geometry: null,
      waypoints: [],
    };
  }

  /**
   * Haversine formula to calculate distance between two lat/lng points in meters.
   */
  private haversineDistance(
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
}
