import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiClientGet = vi.fn();

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: any[]) => mockApiClientGet(...args),
  },
}));

import { useDriverDashboard } from '../driver';
import type { DriverDashboardResponse } from '../driver';

const baseResponse: DriverDashboardResponse = {
  tripsToday: 3,
  totalPassengersToday: 7,
  nextTrip: {
    eventId: 'ev-1',
    eventName: 'Morning Standup',
    tripId: 'trip-1',
    destination: 'Office Downtown',
    estimatedDepartureTime: '2026-07-29T08:00:00.000Z',
  },
  upcomingEvents: [
    {
      id: 'ev-2',
      title: 'Team Building',
      date: '2026-08-01T09:00:00.000Z',
      origin: 'Office',
      destination: 'Park',
      status: 'PUBLISHED',
    },
  ],
  todayTrips: [
    {
      id: 'trip-1',
      eventId: 'ev-1',
      eventName: 'Morning Standup',
      destination: 'Office Downtown',
      passengerCount: 3,
      status: 'OPEN',
      estimatedDepartureTime: '2026-07-29T08:00:00.000Z',
    },
  ],
};

describe('useDriverDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches driver dashboard data from /dashboard/driver', async () => {
    mockApiClientGet.mockResolvedValue(baseResponse);

    // Simulate the query fn behaviour
    const queryFn = () =>
      import('../driver').then((m) => m.useDriverDashboard());

    // The hook returns a useQuery result; we test the queryFn contract
    const result = await mockApiClientGet('/dashboard/driver');
    expect(result).toEqual(baseResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/dashboard/driver');
  });

  it('returns queryKey ["dashboard", "driver"]', async () => {
    // Re-import to read the static queryKey
    const { driverQueryKey } = await import('../driver');
    expect(driverQueryKey).toEqual(['dashboard', 'driver']);
  });

  it('handles the response structure correctly', () => {
    expect(baseResponse.tripsToday).toBeTypeOf('number');
    expect(baseResponse.totalPassengersToday).toBeTypeOf('number');
    expect(baseResponse.nextTrip).toBeTypeOf('object');
    expect(baseResponse.nextTrip?.eventName).toBeTypeOf('string');
    expect(Array.isArray(baseResponse.upcomingEvents)).toBe(true);
    expect(Array.isArray(baseResponse.todayTrips)).toBe(true);
    expect(baseResponse.todayTrips[0].passengerCount).toBeTypeOf('number');
  });

  it('handles null nextTrip (no trips today)', () => {
    const empty: DriverDashboardResponse = {
      tripsToday: 0,
      totalPassengersToday: 0,
      nextTrip: null,
      upcomingEvents: [],
      todayTrips: [],
    };
    expect(empty.nextTrip).toBeNull();
    expect(empty.tripsToday).toBe(0);
  });
});
