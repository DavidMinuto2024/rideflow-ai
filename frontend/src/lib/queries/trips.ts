import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface TripPassenger {
  id: string;
  passenger: { id: string; name: string; email: string };
}

export interface Trip {
  id: string;
  eventId: string;
  driverId: string;
  vehicleId: string;
  distance?: number;
  duration?: number;
  routeGeometry?: string;
  driver?: { id: string; name: string; email: string };
  vehicle?: { id: string; plate?: string; model?: string; capacity?: number };
  assignments?: TripPassenger[];
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

export function useTripRoute(eventId: string, tripId: string) {
  return useQuery<TripRoute>({
    queryKey: ['events', eventId, 'trips', tripId, 'route'],
    queryFn: () => apiClient.get<TripRoute>(`/events/${eventId}/trips/${tripId}/route`),
    enabled: !!eventId && !!tripId,
  });
}
