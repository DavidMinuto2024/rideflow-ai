import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { DriverDashboardResponse } from '@/lib/queries/driver';

// ── Mocks ──────────────────────────────────────────────────

const mockUseDriverDashboard = vi.fn();
const mockUseAuth = vi.fn();
const mockUseRouter = vi.fn();

vi.mock('next/navigation', () => ({
  useRouter: (...args: any[]) => mockUseRouter(...args),
}));

vi.mock('@/lib/auth-context', () => ({
  useAuth: (...args: any[]) => mockUseAuth(...args),
}));

vi.mock('@/lib/queries/driver', () => ({
  useDriverDashboard: (...args: any[]) => mockUseDriverDashboard(...args),
}));

// The page uses Card, Badge etc. — those don't need mocks, they're pure UI.

import DriverDashboardPage from '../page';

const baseMockData: DriverDashboardResponse = {
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

function setupMocks(overrides?: Partial<typeof baseMockData>) {
  const data = { ...baseMockData, ...overrides };
  mockUseAuth.mockReturnValue({
    user: { id: 'driver-1', email: 'driver@test.com' },
    loading: false,
  });
  mockUseRouter.mockReturnValue({ push: vi.fn() });
  mockUseDriverDashboard.mockReturnValue({
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

describe('DriverDashboardPage', () => {
  it('renders the page title and description', async () => {
    render(<DriverDashboardPage />);
    expect(screen.getByText('Panel del Conductor')).toBeInTheDocument();
    expect(
      screen.getByText(/Resumen de tus viajes y pasajeros hoy/i),
    ).toBeInTheDocument();
  });

  it('displays tripsToday stat', () => {
    render(<DriverDashboardPage />);
    expect(screen.getByText('3')).toBeInTheDocument();
    expect(screen.getByText('Viajes Hoy')).toBeInTheDocument();
  });

  it('displays totalPassengersToday stat', () => {
    render(<DriverDashboardPage />);
    expect(screen.getByText('7')).toBeInTheDocument();
    expect(screen.getByText('Pasajeros Hoy')).toBeInTheDocument();
  });

  it('shows nextTrip card when available', () => {
    render(<DriverDashboardPage />);
    expect(screen.getByText('Próximo Viaje')).toBeInTheDocument();
    // These appear in both Next Trip and Today Trips; use getAllByText to confirm they're rendered
    const morningMatches = screen.getAllByText('Morning Standup');
    expect(morningMatches.length).toBeGreaterThanOrEqual(1);
    const officeMatches = screen.getAllByText('Office Downtown');
    expect(officeMatches.length).toBeGreaterThanOrEqual(1);
  });

  it('shows "Sin viajes pendientes" when no nextTrip', () => {
    setupMocks({ nextTrip: null });
    render(<DriverDashboardPage />);
    expect(screen.getByText('Sin viajes pendientes')).toBeInTheDocument();
  });

  it('renders upcoming events section', () => {
    render(<DriverDashboardPage />);
    expect(screen.getByText('Próximos Eventos')).toBeInTheDocument();
    expect(screen.getByText('Team Building')).toBeInTheDocument();
  });

  it('renders today trips list', () => {
    render(<DriverDashboardPage />);
    expect(screen.getByText('Viajes de Hoy')).toBeInTheDocument();
    expect(screen.getByText('3 pasajeros')).toBeInTheDocument();
  });

  it('shows loading skeleton while loading', () => {
    mockUseDriverDashboard.mockReturnValue({
      data: null,
      isLoading: true,
      error: null,
    });
    render(<DriverDashboardPage />);
    // Skeleton should render multiple placeholder elements
    const skeletons = document.querySelectorAll('[data-slot="skeleton"]');
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it('shows error state when fetch fails', () => {
    mockUseDriverDashboard.mockReturnValue({
      data: null,
      isLoading: false,
      error: new Error('Network error'),
      refetch: vi.fn(),
    });
    render(<DriverDashboardPage />);
    expect(screen.getByText(/Error al cargar/i)).toBeInTheDocument();
  });
});
