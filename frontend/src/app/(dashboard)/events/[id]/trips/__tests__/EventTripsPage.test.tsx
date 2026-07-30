import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';

const mockUseEvent = vi.fn();
const mockUseEventTrips = vi.fn();
const mockUseSession = vi.fn();
const mockMutateAsync = vi.fn();
const mockUseOptimizeTimes = vi.fn(() => ({
  mutateAsync: mockMutateAsync,
  isPending: false,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'event-1' }),
}));

vi.mock('@/lib/queries/events', () => ({
  useEvent: (...args: any[]) => mockUseEvent(...args),
}));

vi.mock('@/lib/queries/trips', () => ({
  useEventTrips: (...args: any[]) => mockUseEventTrips(...args),
}));

vi.mock('@/lib/queries/auth', () => ({
  useSession: (...args: any[]) => mockUseSession(...args),
}));

vi.mock('@/lib/queries/suggestions', () => ({
  useOptimizeTimes: (...args: any[]) => mockUseOptimizeTimes(...args),
}));

import EventTripsPage from '../page';

describe('EventTripsPage - Optimizar Tiempos (#9)', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockUseSession.mockReturnValue({
      data: {
        user: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
        memberships: [
          { role: 'ORG_ADMIN', organization: { id: 'org-1', name: 'Org 1' } },
        ],
      },
    });
  });

  it('renders Optimizar tiempos button when event has arrivalTime and trips exist', () => {
    mockUseEvent.mockReturnValue({
      data: { id: 'event-1', title: 'Test Event', arrivalTime: '2026-08-01T09:00:00Z', organizationId: 'org-1' },
      isLoading: false,
    });
    mockUseEventTrips.mockReturnValue({
      data: [
        {
          id: 'trip-1',
          driver: { name: 'Driver 1' },
          vehicle: { model: 'Toyota' },
          assignments: [],
        },
      ],
      isLoading: false,
    });

    render(<EventTripsPage />);

    expect(screen.getByRole('button', { name: /optimizar tiempos/i })).toBeInTheDocument();
  });

  it('does NOT render Optimizar tiempos button when event has no arrivalTime', () => {
    mockUseEvent.mockReturnValue({
      data: { id: 'event-1', title: 'Test Event', arrivalTime: null, organizationId: 'org-1' },
      isLoading: false,
    });
    mockUseEventTrips.mockReturnValue({
      data: [
        { id: 'trip-1', driver: { name: 'Driver 1' }, assignments: [] },
      ],
      isLoading: false,
    });

    render(<EventTripsPage />);

    expect(screen.queryByRole('button', { name: /optimizar tiempos/i })).not.toBeInTheDocument();
  });

  it('triggers optimizeTimes mutation on click and displays success message', async () => {
    mockMutateAsync.mockResolvedValueOnce({
      message: 'Tiempos optimizados exitosamente (1 viajes actualizados).',
      updatedTrips: 1,
      updatedAssignments: 2,
    });

    mockUseEvent.mockReturnValue({
      data: { id: 'event-1', title: 'Test Event', arrivalTime: '2026-08-01T09:00:00Z', organizationId: 'org-1' },
      isLoading: false,
    });
    mockUseEventTrips.mockReturnValue({
      data: [
        { id: 'trip-1', driver: { name: 'Driver 1' }, assignments: [] },
      ],
      isLoading: false,
    });

    render(<EventTripsPage />);

    const button = screen.getByRole('button', { name: /optimizar tiempos/i });
    fireEvent.click(button);

    expect(mockMutateAsync).toHaveBeenCalledTimes(1);

    await waitFor(() => {
      expect(
        screen.getByText(/tiempos optimizados exitosamente/i),
      ).toBeInTheDocument();
    });
  });
});
