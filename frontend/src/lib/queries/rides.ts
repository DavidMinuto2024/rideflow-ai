import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export type RequestStatus = 'PENDING' | 'ACCEPTED' | 'REJECTED' | 'CANCELLED';

export interface RideRequest {
  id: string;
  eventId: string;
  passengerId: string;
  tripId?: string;
  status: RequestStatus;
  createdAt: string;
  passenger?: { id: string; name: string; email: string };
}

export function useEventRequests(eventId: string) {
  return useQuery<RideRequest[]>({
    queryKey: ['events', eventId, 'requests'],
    queryFn: () => apiClient.get<RideRequest[]>(`/events/${eventId}/requests`),
    enabled: !!eventId,
  });
}

export function useCreateRequest(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () =>
      apiClient.post<RideRequest>(`/events/${eventId}/requests`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId, 'requests'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useUpdateRequestStatus() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ requestId, status }: { requestId: string; status: RequestStatus }) =>
      apiClient.patch<RideRequest>(`/requests/${requestId}`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useCancelRequest() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (requestId: string) =>
      apiClient.patch<RideRequest>(`/requests/${requestId}`, {
        status: 'CANCELLED' as RequestStatus,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useDirectAssign(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { passengerId: string; driverId: string }) =>
      apiClient.post<unknown>(`/events/${eventId}/direct-assign`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}

export function useAutoAssign(eventId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => apiClient.post(`/events/${eventId}/assign`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', eventId] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}
