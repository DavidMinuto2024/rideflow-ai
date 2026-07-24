import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface TripPassengerAssignment {
  id: string;
  passenger: { id: string; name: string; email: string };
  estimatedPickupTime?: string;
  pickupOrder?: number;
}

export interface Trip {
  id: string;
  eventId: string;
  driverId: string;
  vehicleId: string;
  origin?: string | null;
  originLat?: number | null;
  originLng?: number | null;
  dest?: string | null;
  destLat?: number | null;
  destLng?: number | null;
  distance?: number;
  duration?: number;
  routeGeometry?: string;
  estimatedDepartureTime?: string;
  driver?: { id: string; name: string; email: string };
  vehicle?: { id: string; plate?: string; model?: string; capacity?: number };
  assignments?: TripPassengerAssignment[];
}

export interface TripRoute {
  distance: number;
  duration: number;
  geometry: string;
}

export function useEventTrips(eventId: string) {
  return useQuery<Trip[]>({
    queryKey: ['events', eventId, 'trips'],
    queryFn: () => apiClient.get<Trip[]>(`/events/${eventId}/trips`),
    enabled: !!eventId,
  });
}

export function useTrip(eventId: string, tripId: string) {
  return useQuery<Trip>({
    queryKey: ['events', eventId, 'trips', tripId],
    queryFn: () => apiClient.get<Trip>(`/events/${eventId}/trips/${tripId}`),
    enabled: !!eventId && !!tripId,
  });
}

export function useTripRoute(
  eventId: string,
  tripId: string,
  waypoints?: Array<{ lat: number; lng: number }>,
) {
  const qp = waypoints && waypoints.length > 0
    ? `?waypoints=${waypoints.map((wp) => `${wp.lat},${wp.lng}`).join(';')}`
    : '';

  return useQuery<TripRoute>({
    queryKey: ['events', eventId, 'trips', tripId, 'route', waypoints],
    queryFn: () => apiClient.get<TripRoute>(`/events/${eventId}/trips/${tripId}/route${qp}`),
    enabled: !!eventId && !!tripId,
  });
}
