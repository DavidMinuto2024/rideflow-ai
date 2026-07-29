import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export type NotificationType =
  | 'RIDE_REQUESTED'
  | 'RIDE_APPROVED'
  | 'RIDE_REJECTED'
  | 'RIDE_CANCELLED'
  | 'TRIP_ASSIGNED'
  | 'EVENT_REMINDER';

export interface Notification {
  id: string;
  type: NotificationType;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
}

export function useNotifications() {
  return useQuery<Notification[]>({
    queryKey: ['notifications'],
    queryFn: () => apiClient.get<Notification[]>('/notifications'),
    refetchInterval: 30_000,
  });
}

export function useUnreadCount() {
  return useQuery<number>({
    queryKey: ['notifications', 'unread-count'],
    queryFn: async () => {
      const notifications = await apiClient.get<Notification[]>('/notifications');
      return notifications.filter((n) => !n.read).length;
    },
    refetchInterval: 15_000,
  });
}

export function useMarkAsRead() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (notificationId: string) =>
      apiClient.patch(`/notifications/${notificationId}/read`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['notifications'] });
    },
  });
}
