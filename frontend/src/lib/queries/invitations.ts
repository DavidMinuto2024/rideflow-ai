import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export type JoinRole = 'DRIVER' | 'PASSENGER';

export interface InviteEventInfo {
  id: string;
  title: string;
  description?: string;
  date: string;
  origin: string;
  destination: string;
  capacity: number;
  status: string;
  organizationId?: string;
  organization?: { id: string; name: string };
  inviteTokenExpiresAt: string;
}

export interface JoinEventResponse {
  message: string;
  role: JoinRole;
  eventId: string;
}

export interface JoinEventDto {
  role: JoinRole;
  // Driver fields
  vehicleId?: string;
  startLocation?: string;
  startLat?: number;
  startLng?: number;
  // Passenger fields
  pickupLat?: number;
  pickupLng?: number;
  pickupAddress?: string;
}

/**
 * Fetch event info for the invite landing page (no auth required).
 */
export function useInviteInfo(token: string) {
  return useQuery<InviteEventInfo>({
    queryKey: ['invite', token],
    queryFn: () =>
      apiClient.get<InviteEventInfo>(`/invite/${token}`, {
        skipAuth: true,
      }),
    enabled: !!token,
  });
}

/**
 * Join an event via invite token (auth required).
 */
export function useJoinEvent(token: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: JoinEventDto) =>
      apiClient.post<JoinEventResponse>(`/invite/${token}/join`, data),
    onSuccess: (_data) => {
      queryClient.invalidateQueries({ queryKey: ['events'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard', 'stats'] });
    },
  });
}
