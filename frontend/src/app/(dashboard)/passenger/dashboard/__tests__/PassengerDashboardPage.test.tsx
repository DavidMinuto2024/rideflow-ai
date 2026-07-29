import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { PassengerDashboardResponse } from '@/lib/queries/passenger';

// ── Mocks ──────────────────────────────────────────────────

const mockUsePassengerDashboard = vi.fn();
const mockUseAuth = vi.fn();
const mockUseRouter = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: (...args: any[]) => mockUseRouter(...args),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

vi.mock('@/lib/queries/passenger', () => ({
  usePassengerDashboard: (...args: any[]) => mockUsePassengerDashboard(...args),
}));

import PassengerDashboardPage from '../page';

const baseMockData: PassengerDashboardResponse = {
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
      title: 'Workshop React',
      date: '2026-08-05T09:00:00.000Z',
      origin: 'Office',
      destination: 'Convention Center',
      organizationName: 'Acme Corp',
    },
  ],
};

function setupMocks(overrides?: Partial<PassengerDashboardResponse>) {
  const data = { ...baseMockData, ...overrides };
  mockUseAuth.mockReturnValue({
    user: { id: 'pass-1', email: 'passenger@test.com' },
    loading: false,
  });
  mockUseRouter.mockReturnValue({ push: vi.fn() });
  mockUsePassengerDashboard.mockReturnValue({
    data,
    isLoading: false,
    error: null,
    refetch: vi.fn(),
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks();
});

describe('PassengerDashboardPage', () => {
  it('renders the page title', async () => {
    render(<PassengerDashboardPage />);
    expect(screen.getByText('Mis Solicitudes')).toBeInTheDocument();
  });

  it('displays active requests', () => {
    render(<PassengerDashboardPage />);
    expect(screen.getByText('Solicitudes Activas')).toBeInTheDocument();
    // Team Outing appears in both requests and accepted trips
    const outings = screen.getAllByText('Team Outing');
    expect(outings.length).toBeGreaterThanOrEqual(1);
    expect(screen.getByText('PENDING')).toBeInTheDocument();
  });

  it('shows "Sin solicitudes" when no active requests', () => {
    setupMocks({ activeRequests: [] });
    render(<PassengerDashboardPage />);
    expect(screen.getByText('Sin solicitudes activas')).toBeInTheDocument();
  });

  it('displays accepted trips', () => {
    render(<PassengerDashboardPage />);
    expect(screen.getByText('Viajes Aceptados')).toBeInTheDocument();
    expect(screen.getByText(/Carlos/)).toBeInTheDocument();
  });

  it('shows empty state when no accepted trips', () => {
    setupMocks({ acceptedTrips: [] });
    render(<PassengerDashboardPage />);
    expect(screen.getByText('Sin viajes aceptados')).toBeInTheDocument();
  });

  it('displays available events', () => {
    render(<PassengerDashboardPage />);
    expect(screen.getByText('Eventos Disponibles')).toBeInTheDocument();
    expect(screen.getByText('Workshop React')).toBeInTheDocument();
    expect(screen.getByText('Acme Corp')).toBeInTheDocument();
  });

  it('shows loading skeleton while loading', () => {
    mockUsePassengerDashboard.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
    render(<PassengerDashboardPage />);
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', () => {
    mockUsePassengerDashboard.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });
    render(<PassengerDashboardPage />);
    expect(screen.getByText(/Error al cargar/i)).toBeInTheDocument();
  });
});
