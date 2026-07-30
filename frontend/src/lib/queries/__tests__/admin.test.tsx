import { describe, it, expect, vi, beforeEach } from 'vitest';
import { renderHook, waitFor } from '@testing-library/react';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type { ReactNode } from 'react';

const mockApiClientGet = vi.fn();
const mockApiClientPatch = vi.fn();

vi.mock('@/lib/api', () => ({
  apiClient: {
    get: (...args: any[]) => mockApiClientGet(...args),
    patch: (...args: any[]) => mockApiClientPatch(...args),
  },
}));

import {
  useAdminStats,
  useAdminUsers,
  useAdminOrganizations,
  useUpdateUserRole,
  adminStatsQueryKey,
  adminUsersQueryKey,
  adminOrganizationsQueryKey,
} from '../admin';
import type { AdminStats, AdminUser, AdminOrganization } from '../admin';

function createWrapper() {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });
  return function Wrapper({ children }: { children: ReactNode }) {
    return (
      <QueryClientProvider client={queryClient}>
        {children}
      </QueryClientProvider>
    );
  };
}

const baseStatsResponse: AdminStats = {
  totalOrganizations: 5,
  totalUsers: 120,
  totalEvents: 30,
  totalTrips: 200,
  eventsPerMonth: [
    { month: '2026-01', count: 4 },
    { month: '2026-02', count: 6 },
    { month: '2026-03', count: 8 },
  ],
};

const baseUsersResponse: AdminUser[] = [
  {
    id: 'user-1',
    email: 'alice@example.com',
    name: 'Alice',
    phone: '+1234567890',
    memberships: [
      {
        organizationId: 'org-1',
        organizationName: 'Acme Corp',
        role: 'admin',
      },
    ],
  },
  {
    id: 'user-2',
    email: 'bob@example.com',
    name: 'Bob',
    memberships: [],
  },
];

const baseOrganizationsResponse: AdminOrganization[] = [
  {
    id: 'org-1',
    name: 'Acme Corp',
    slug: 'acme-corp',
    memberCount: 25,
    eventCount: 10,
    createdAt: '2026-01-15T00:00:00.000Z',
  },
  {
    id: 'org-2',
    name: 'Globex Inc',
    slug: 'globex-inc',
    memberCount: 50,
    eventCount: 20,
    createdAt: '2026-02-01T00:00:00.000Z',
  },
];

describe('useAdminStats', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin stats from /admin/stats', async () => {
    mockApiClientGet.mockResolvedValue(baseStatsResponse);

    const { result } = renderHook(() => useAdminStats(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(baseStatsResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/admin/stats');
  });

  it('exports the correct queryKey', () => {
    expect(adminStatsQueryKey).toEqual(['admin', 'stats']);
  });
});

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin users from /admin/users', async () => {
    mockApiClientGet.mockResolvedValue(baseUsersResponse);

    const { result } = renderHook(() => useAdminUsers(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(baseUsersResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/admin/users');
  });

  it('exports the correct queryKey', () => {
    expect(adminUsersQueryKey).toEqual(['admin', 'users']);
  });
});

describe('useAdminOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin organizations from /admin/organizations', async () => {
    mockApiClientGet.mockResolvedValue(baseOrganizationsResponse);

    const { result } = renderHook(() => useAdminOrganizations(), {
      wrapper: createWrapper(),
    });

    await waitFor(() => expect(result.current.isSuccess).toBe(true));

    expect(result.current.data).toEqual(baseOrganizationsResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/admin/organizations');
  });

  it('exports the correct queryKey', () => {
    expect(adminOrganizationsQueryKey).toEqual(['admin', 'organizations']);
  });
});

describe('useUpdateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH /admin/users/:userId with organizationId and role', async () => {
    mockApiClientPatch.mockResolvedValue({});

    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: createWrapper(),
    });

    await result.current.mutateAsync({
      userId: 'user-1',
      organizationId: 'org-2',
      role: 'member',
    });

    expect(mockApiClientPatch).toHaveBeenCalledWith('/admin/users/user-1', {
      organizationId: 'org-2',
      role: 'member',
    });
  });

  it('returns the expected mutationFn shape', () => {
    const { result } = renderHook(() => useUpdateUserRole(), {
      wrapper: createWrapper(),
    });

    expect(result.current.mutateAsync).toBeTypeOf('function');
  });
});
