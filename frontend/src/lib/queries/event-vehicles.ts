import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface EventVehicle {
  id: string;
  eventId: string;
  vehicleId: string;
  driverId: string;
  startLocation?: string;
  startLat?: number;
  startLng?: number;
  picoYPlaca: boolean;
  createdAt: string;
  vehicle?: { id: string; plate?: string; model?: string; capacity: number };
  driver?: { id: string; name: string; email: string };
}

export interface RegisterEventVehicleDto {
  vehicleId: string;
  startLocation?: string;
  startLat?: number;
  startLng?: number;
}

export interface UpdateEventVehicleDto {
  startLocation?: string;
  startLat?: number;
  startLng?: number;
}

export function useEventVehicles(eventId: string) {
  return useQuery<EventVehicle[]>({
    queryKey: ['events', eventId, 'event-vehicles'],
    queryFn: () =>
      apiClient.get<EventVehicle[]>(`/events/${eventId}/event-vehicles`),
    enabled: !!eventId,
  });
}

export function useEventVehicle(id: string) {
  return useQuery<EventVehicle>({
    queryKey: ['event-vehicles', id],
    queryFn: () => apiClient.get<EventVehicle>(`/event-vehicles/${id}`),
    enabled: !!id,
  });
}

export function useRegisterEventVehicle(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: RegisterEventVehicleDto) =>
      apiClient.post<EventVehicle>(
        `/events/${eventId}/event-vehicles`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['events', eventId, 'event-vehicles'],
      });
      queryClient.invalidateQueries({
        queryKey: ['events', eventId],
      });
    },
  });
}

export function useUpdateEventVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: UpdateEventVehicleDto) =>
      apiClient.patch<EventVehicle>(`/event-vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-vehicles'] });
    },
  });
}

export function useDeleteEventVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/event-vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['event-vehicles'] });
    },
  });
}

/**
 * Check whether a specific EventVehicle triggers pico y placa today.
 */
export function usePicoYPlaca(eventVehicleId: string) {
  return useQuery<{ active: boolean; message?: string }>({
    queryKey: ['event-vehicles', eventVehicleId, 'pico-y-placa'],
    queryFn: () =>
      apiClient.get<{ active: boolean; message?: string }>(
        `/event-vehicles/${eventVehicleId}/pico-y-placa`,
      ),
    enabled: !!eventVehicleId,
  });
}
