import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface DriverDashboardResponse {
  tripsToday: number;
  totalPassengersToday: number;
  nextTrip: {
    eventId: string;
    eventName: string;
    tripId: string;
    destination: string;
    estimatedDepartureTime?: string;
  } | null;
  upcomingEvents: Array<{
    id: string;
    title: string;
    date: string;
    origin: string;
    destination: string;
    status: string;
  }>;
  todayTrips: Array<{
    id: string;
    eventId: string;
    eventName: string;
    destination: string;
    passengerCount: number;
    status: string;
    estimatedDepartureTime?: string;
  }>;
}

export const driverQueryKey = ['dashboard', 'driver'] as const;

export function useDriverDashboard() {
  return useQuery<DriverDashboardResponse>({
    queryKey: driverQueryKey,
    queryFn: () => apiClient.get<DriverDashboardResponse>('/dashboard/driver'),
  });
}
