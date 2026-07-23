import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface DashboardStats {
  activeEvents: number;
  totalParticipants: number;
  tripsToday: number;
  pendingRequests: number;
  vehicleUtilization: number;
}

export function useDashboardStats() {
  return useQuery<DashboardStats>({
    queryKey: ['dashboard', 'stats'],
    queryFn: () => apiClient.get<DashboardStats>('/dashboard/stats'),
  });
}
