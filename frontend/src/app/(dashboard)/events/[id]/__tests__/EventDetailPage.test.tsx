import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import type { Event, EventStatus } from '@/lib/queries/events';

// ── Shared module-level mock references ────────────────

const mockUseEvent = vi.fn();
const mockUseSession = vi.fn();
const mockUseUpdateEvent = vi.fn(() => ({
  mutateAsync: vi.fn(),
  isPending: false,
}));

vi.mock('next/navigation', () => ({
  useParams: () => ({ id: 'event-1' }),
  useRouter: () => ({ push: vi.fn() }),
}));

vi.mock('@/lib/queries/events', () => ({
  useEvent: (...args: any[]) => mockUseEvent(...args),
  useUpdateEvent: (...args: any[]) => mockUseUpdateEvent(...args),
  useUpdateEventStatus: () => ({ mutateAsync: vi.fn(), isPending: false }),
  canTransitionFrom: () => [],
}));

vi.mock('@/lib/queries/auth', () => ({
  useSession: (...args: any[]) => mockUseSession(...args),
}));

vi.mock('@/lib/maps', () => ({
  buildWazeDeepLink: vi.fn(),
  buildGoogleMapsDeepLink: vi.fn(),
}));

vi.mock('@/lib/queries/suggestions', () => ({
  useSuggestions: () => ({ data: [], isLoading: false }),
}));

import EventDetailPage from '../page';

const baseEvent: Event = {
  id: 'event-1',
  title: 'Test Event',
  description: 'A test event',
  date: '2026-08-01T09:00:00.000Z',
  origin: 'Origin St',
  destination: 'Dest St',
  capacity: 4,
  status: 'DRAFT',
  organizationId: 'org-1',
  createdAt: '2026-07-27T00:00:00.000Z',
  arrivalTime: '2026-08-01T09:00:00.000Z',
};

function setupMocks(overrides: { role?: string; eventStatus?: EventStatus }) {
  const role = overrides.role ?? 'ORG_ADMIN';
  const eventStatus = overrides.eventStatus ?? 'DRAFT';
  mockUseEvent.mockReturnValue({
    data: { ...baseEvent, status: eventStatus },
    isLoading: false,
    error: null,
  });
  mockUseSession.mockReturnValue({
    data: {
      user: { id: 'user-1', name: 'Admin', email: 'admin@test.com' },
      memberships: [
        { role, organization: { id: 'org-1', name: 'Org 1', slug: 'org-1' } },
      ],
    },
    isLoading: false,
  });
}

beforeEach(() => {
  vi.clearAllMocks();
  setupMocks({ role: 'ORG_ADMIN', eventStatus: 'DRAFT' });
});

describe('EventDetailPage — Edit Button', () => {
  it('shows Edit button for ORG_ADMIN on DRAFT event', async () => {
    setupMocks({ role: 'ORG_ADMIN', eventStatus: 'DRAFT' });
    render(<EventDetailPage />);

    const editBtn = screen.queryByRole('button', { name: /editar/i });
    expect(editBtn).toBeInTheDocument();
  });

  it('shows Edit button for ORG_ADMIN on PUBLISHED event', async () => {
    setupMocks({ role: 'ORG_ADMIN', eventStatus: 'PUBLISHED' });
    render(<EventDetailPage />);

    const editBtn = screen.queryByRole('button', { name: /editar/i });
    expect(editBtn).toBeInTheDocument();
  });

  it('hides Edit button for PASSENGER role', async () => {
    setupMocks({ role: 'PASSENGER', eventStatus: 'DRAFT' });
    render(<EventDetailPage />);

    const editBtn = screen.queryByRole('button', { name: /editar/i });
    expect(editBtn).not.toBeInTheDocument();
  });

  it('hides Edit button for OPEN event status', async () => {
    setupMocks({ role: 'ORG_ADMIN', eventStatus: 'OPEN' });
    render(<EventDetailPage />);

    const editBtn = screen.queryByRole('button', { name: /editar/i });
    expect(editBtn).not.toBeInTheDocument();
  });

  it('hides Edit button for CLOSED event status', async () => {
    setupMocks({ role: 'ORG_ADMIN', eventStatus: 'CLOSED' });
    render(<EventDetailPage />);

    const editBtn = screen.queryByRole('button', { name: /editar/i });
    expect(editBtn).not.toBeInTheDocument();
  });

  it('hides Edit button for FINISHED event status', async () => {
    setupMocks({ role: 'ORG_ADMIN', eventStatus: 'FINISHED' });
    render(<EventDetailPage />);

    const editBtn = screen.queryByRole('button', { name: /editar/i });
    expect(editBtn).not.toBeInTheDocument();
  });
});
