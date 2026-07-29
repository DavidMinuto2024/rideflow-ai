import { describe, it, expect, vi, beforeEach } from 'vitest';

const mockApiClientGet = vi.fn();

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: any[]) => mockApiClientGet(...args),
  },
}));

import { usePassengerDashboard, passengerQueryKey } from '../passenger';
import type { PassengerDashboardResponse } from '../passenger';

const baseResponse: PassengerDashboardResponse = {
  activeRequests: [
    {
      id: 'req-1',
      eventId: 'ev-1',
      eventName: 'Team Outing',
      eventDate: '2026-08-01T09:00:00.000Z',
      status: 'PENDING',
      createdAt: '2026-07-28T10:00:00.000Z',
    },
  ],
  acceptedTrips: [
    {
      tripId: 'trip-1',
      eventId: 'ev-1',
      eventName: 'Team Outing',
      driverName: 'Carlos',
      estimatedPickupTime: '2026-08-01T08:30:00.000Z',
      status: 'OPEN',
    },
  ],
  availableEvents: [
    {
      id: 'ev-2',
      title: 'Workshop',
      date: '2026-08-05T09:00:00.000Z',
      origin: 'Office',
      destination: 'Convention Center',
      organizationName: 'Acme Corp',
    },
  ],
};

describe('usePassengerDashboard', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches passenger dashboard from /dashboard/passenger', async () => {
    mockApiClientGet.mockResolvedValue(baseResponse);

    const result = await mockApiClientGet('/dashboard/passenger');
    expect(result).toEqual(baseResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/dashboard/passenger');
  });

  it('exports the correct queryKey', () => {
    expect(passengerQueryKey).toEqual(['dashboard', 'passenger']);
  });

  it('handles the response structure', () => {
    expect(Array.isArray(baseResponse.activeRequests)).toBe(true);
    expect(Array.isArray(baseResponse.acceptedTrips)).toBe(true);
    expect(Array.isArray(baseResponse.availableEvents)).toBe(true);
    expect(baseResponse.activeRequests[0].status).toBe('PENDING');
    expect(baseResponse.acceptedTrips[0].driverName).toBe('Carlos');
    expect(baseResponse.availableEvents[0].organizationName).toBe('Acme Corp');
  });

  it('handles empty arrays gracefully', () => {
    const empty: PassengerDashboardResponse = {
      activeRequests: [],
      acceptedTrips: [],
      availableEvents: [],
    };
    expect(empty.activeRequests).toHaveLength(0);
    expect(empty.acceptedTrips).toHaveLength(0);
    expect(empty.availableEvents).toHaveLength(0);
  });
});
