import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface PassengerDashboardResponse {
  activeRequests: Array<{
    id: string;
    eventId: string;
    eventName: string;
    eventDate: string;
    status: string;
    createdAt: string;
  }>;
  acceptedTrips: Array<{
    tripId: string;
    eventId: string;
    eventName: string;
    driverName?: string;
    estimatedPickupTime?: string;
    status: string;
  }>;
  availableEvents: Array<{
    id: string;
    title: string;
    date: string;
    origin: string;
    destination: string;
    organizationName: string;
  }>;
}

export const passengerQueryKey = ['dashboard', 'passenger'] as const;

export function usePassengerDashboard() {
  return useQuery<PassengerDashboardResponse>({
    queryKey: passengerQueryKey,
    queryFn: () => apiClient.get<PassengerDashboardResponse>('/dashboard/passenger'),
  });
}
