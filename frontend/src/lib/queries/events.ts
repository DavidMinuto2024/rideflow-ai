import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export type EventStatus = 'DRAFT' | 'PUBLISHED' | 'OPEN' | 'CLOSED' | 'FINISHED';

export interface Event {
  id: string;
  title: string;
  description?: string;
  date: string;
  origin: string;
  originLat?: number;
  originLng?: number;
  destination: string;
  destLat?: number;
  destLng?: number;
  capacity: number;
  status: EventStatus;
  organizationId: string;
  driverId?: string;
  driver?: { id: string; name: string; email: string };
  vehicleId?: string;
  vehicle?: { id: string; plate?: string; model?: string };
  createdAt: string;
}

const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  DRAFT: ['PUBLISHED'],
  PUBLISHED: ['OPEN'],
  OPEN: ['CLOSED'],
  CLOSED: ['FINISHED'],
  FINISHED: [],
};

export function canTransitionFrom(status: EventStatus): EventStatus[] {
  return VALID_TRANSITIONS[status] ?? [];
}

export function useEvents(organizationId: string) {
  return useQuery<Event[]>({
    queryKey: ['events', organizationId],
    queryFn: () =>
      apiClient.get<Event[]>(
        `/organizations/${organizationId}/events`,
      ),
    enabled: !!organizationId,
  });
}

export function useEvent(id: string) {
  return useQuery<Event>({
    queryKey: ['events', id],
    queryFn: () => apiClient.get<Event>(`/events/${id}`),
    enabled: !!id,
  });
}

export function useCreateEvent(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: {
      title: string;
      date: string;
      origin: string;
      destination: string;
      capacity?: number;
      description?: string;
      originLat?: number;
      originLng?: number;
      destLat?: number;
      destLng?: number;
    }) =>
      apiClient.post<Event>(
        `/organizations/${organizationId}/events`,
        data,
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events', organizationId] });
    },
  });
}

export function useUpdateEvent(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Event>) =>
      apiClient.patch<Event>(`/events/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useUpdateEventStatus(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (status: EventStatus) =>
      apiClient.patch<Event>(`/events/${id}/status`, { status }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}

export function useDeleteEvent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/events/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
    },
  });
}
