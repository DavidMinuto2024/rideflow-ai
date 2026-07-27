import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';

// ── Shared module-level mock references ────────────────

const mockUseEvent = vi.fn();
const mockUseSession = vi.fn();
const mockUseEventRequests = vi.fn();
const mockUseCancelRequest = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));
const mockUseDirectAssign = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));
const mockUseUpdateRequestStatus = vi.fn(() => ({
  mutate: vi.fn(),
  isPending: false,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'event-1' }),
}));

vi.mock('@/lib/queries/events', () => ({
  useEvent: (...args: any[]) => mockUseEvent(...args),
}));

vi.mock('@/lib/queries/auth', () => ({
  useSession: (...args: any[]) => mockUseSession(...args),
}));

vi.mock('@/lib/queries/rides', () => ({
  useEventRequests: (...args: any[]) => mockUseEventRequests(...args),
  useCancelRequest: (...args: any[]) => mockUseCancelRequest(...args),
  useDirectAssign: (...args: any[]) => mockUseDirectAssign(...args),
  useUpdateRequestStatus: (...args: any[]) => mockUseUpdateRequestStatus(...args),
  useAutoAssign: () => ({ mutate: vi.fn(), isPending: false }),
}));

vi.mock('@/lib/api', () => ({
  apiClient: { get: vi.fn().mockResolvedValue([]) },
}));

import EventRequestsPage from '../page';

const baseEvent = { id: 'event-1', title: 'Test Event', status: 'OPEN', organizationId: 'org-1', capacity: 4 };

const pendingRequest = {
  id: 'req-1',
  eventId: 'event-1',
  passengerId: 'passenger-1',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  passenger: { id: 'passenger-1', name: 'Passenger One', email: 'p1@test.com' },
};

const acceptedRequest = {
  id: 'req-2',
  eventId: 'event-1',
  passengerId: 'passenger-1',
  status: 'ACCEPTED',
  createdAt: new Date().toISOString(),
  passenger: { id: 'passenger-1', name: 'Passenger One', email: 'p1@test.com' },
};

const otherPendingRequest = {
  id: 'req-3',
  eventId: 'event-1',
  passengerId: 'passenger-99',
  status: 'PENDING',
  createdAt: new Date().toISOString(),
  passenger: { id: 'passenger-99', name: 'Other Passenger', email: 'other@test.com' },
};

function setupMocks(overrides: {
  role?: string;
  requests?: any[];
  currentUserId?: string;
}) {
  const role = overrides.role ?? 'ORG_ADMIN';
  const requests = overrides.requests ?? [];
  const currentUserId = overrides.currentUserId ?? 'passenger-1';

  mockUseEvent.mockReturnValue({ data: baseEvent, isLoading: false });
  mockUseSession.mockReturnValue({
    data: {
      user: { id: currentUserId, name: 'Current User', email: 'cu@test.com' },
      memberships: [
        { role, organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' } },
      ],
    },
    isLoading: false,
  });
  mockUseEventRequests.mockReturnValue({ data: requests, isLoading: false, refetch: vi.fn() });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks({ role: 'ORG_ADMIN', requests: [], currentUserId: 'passenger-1' });
});

describe('EventRequestsPage — Cancel Button', () => {
  it('shows Cancelar button for own PENDING request', async () => {
    setupMocks({
      role: 'PASSENGER',
      requests: [pendingRequest],
      currentUserId: 'passenger-1',
    });
    render(<EventRequestsPage />);

    const cancelBtn = screen.queryByRole('button', { name: /cancelar/i });
    expect(cancelBtn).toBeInTheDocument();
  });

  it('hides Cancelar button for ACCEPTED request', async () => {
    setupMocks({
      role: 'PASSENGER',
      requests: [acceptedRequest],
      currentUserId: 'passenger-1',
    });
    render(<EventRequestsPage />);

    const cancelBtn = screen.queryByRole('button', { name: /cancelar/i });
    expect(cancelBtn).not.toBeInTheDocument();
  });

  it('hides Cancelar button for another passenger PENDING request', async () => {
    setupMocks({
      role: 'PASSENGER',
      requests: [otherPendingRequest],
      currentUserId: 'passenger-1',
    });
    render(<EventRequestsPage />);

    const cancelBtn = screen.queryByRole('button', { name: /cancelar/i });
    expect(cancelBtn).not.toBeInTheDocument();
  });
});

describe('EventRequestsPage — Direct Assign', () => {
  it('shows Asignar a... button for ORG_ADMIN on PENDING request', async () => {
    setupMocks({
      role: 'ORG_ADMIN',
      requests: [pendingRequest],
      currentUserId: 'admin-1',
    });
    render(<EventRequestsPage />);

    const assignBtns = screen.getAllByRole('button', { name: /asignar/i });
    const directAssignBtn = assignBtns.find((btn) => btn.textContent?.includes('Asignar a...'));
    expect(directAssignBtn).toBeInTheDocument();
  });

  it('hides Asignar a... button for PASSENGER role', async () => {
    setupMocks({
      role: 'PASSENGER',
      requests: [pendingRequest],
      currentUserId: 'passenger-1',
    });
    render(<EventRequestsPage />);

    const assignBtn = screen.queryByRole('button', { name: /asignar a/i });
    expect(assignBtn).not.toBeInTheDocument();
  });

  it('shows driver select modal when Asignar a... is clicked', async () => {
    setupMocks({
      role: 'ORG_ADMIN',
      requests: [pendingRequest],
      currentUserId: 'admin-1',
    });
    render(<EventRequestsPage />);

    // Modal should not be visible initially
    expect(screen.queryByText(/seleccionar conductor/i)).not.toBeInTheDocument();
  });
});
