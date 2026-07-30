import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface DriverSuggestion {
  driverId: string;
  driverName: string;
  vehicleId: string;
  vehicleModel: string;
  capacity: number;
  startLat: number;
  startLng: number;
  distanceFromPassenger: number; // meters
  score: number; // 0-100 normalized
}

export interface EventSuggestions {
  passengerId: string;
  passengerName: string;
  pickupLat: number;
  pickupLng: number;
  pickupAddress?: string;
  suggestions: DriverSuggestion[];
}

export interface OptimizeTimesResponse {
  message: string;
  updatedTrips: number;
  updatedAssignments: number;
}

/**
 * Fetch ranked driver suggestions for all pending passengers in an event.
 */
export function useSuggestions(eventId: string, enabled = true) {
  return useQuery<EventSuggestions[]>({
    queryKey: ['events', eventId, 'suggestions'],
    queryFn: () =>
      apiClient.get<EventSuggestions[]>(`/events/${eventId}/suggestions`),
    enabled: !!eventId && enabled,
  });
}

/**
 * Trigger temporal optimization for all trips in an event.
 * Computes departure/pickup times from arrivalTime minus OSRM leg durations.
 */
export function useOptimizeTimes(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<OptimizeTimesResponse>(
        `/events/${eventId}/optimize-times`,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'trips'],
      });
    },
  });
}
