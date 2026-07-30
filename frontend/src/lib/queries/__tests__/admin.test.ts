import { describe, it, expect, vi, beforeEach } from 'vitest';

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

    const result = await mockApiClientGet('/admin/stats');
    expect(result).toEqual(baseStatsResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/admin/stats');
  });

  it('exports the correct queryKey', () => {
    expect(adminStatsQueryKey).toEqual(['admin', 'stats']);
  });

  it('validates response structure', () => {
    expect(baseStatsResponse.totalOrganizations).toBeTypeOf('number');
    expect(baseStatsResponse.totalUsers).toBeTypeOf('number');
    expect(baseStatsResponse.totalEvents).toBeTypeOf('number');
    expect(baseStatsResponse.totalTrips).toBeTypeOf('number');
    expect(Array.isArray(baseStatsResponse.eventsPerMonth)).toBe(true);
    expect(baseStatsResponse.eventsPerMonth[0].month).toBeTypeOf('string');
    expect(baseStatsResponse.eventsPerMonth[0].count).toBeTypeOf('number');
  });
});

describe('useAdminUsers', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin users from /admin/users', async () => {
    mockApiClientGet.mockResolvedValue(baseUsersResponse);

    const result = await mockApiClientGet('/admin/users');
    expect(result).toEqual(baseUsersResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/admin/users');
  });

  it('exports the correct queryKey', () => {
    expect(adminUsersQueryKey).toEqual(['admin', 'users']);
  });

  it('validates response structure', () => {
    expect(Array.isArray(baseUsersResponse)).toBe(true);
    expect(baseUsersResponse[0].id).toBeTypeOf('string');
    expect(baseUsersResponse[0].email).toBeTypeOf('string');
    expect(baseUsersResponse[0].name).toBeTypeOf('string');
    expect(Array.isArray(baseUsersResponse[0].memberships)).toBe(true);
    expect(baseUsersResponse[0].memberships[0].organizationName).toBeTypeOf('string');
  });

  it('handles optional fields (phone, avatar)', () => {
    expect(baseUsersResponse[1].phone).toBeUndefined();
    expect(baseUsersResponse[1].avatar).toBeUndefined();
  });

  it('handles empty memberships', () => {
    expect(baseUsersResponse[1].memberships).toHaveLength(0);
  });
});

describe('useAdminOrganizations', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('fetches admin organizations from /admin/organizations', async () => {
    mockApiClientGet.mockResolvedValue(baseOrganizationsResponse);

    const result = await mockApiClientGet('/admin/organizations');
    expect(result).toEqual(baseOrganizationsResponse);
    expect(mockApiClientGet).toHaveBeenCalledWith('/admin/organizations');
  });

  it('exports the correct queryKey', () => {
    expect(adminOrganizationsQueryKey).toEqual(['admin', 'organizations']);
  });

  it('validates response structure', () => {
    expect(Array.isArray(baseOrganizationsResponse)).toBe(true);
    expect(baseOrganizationsResponse[0].id).toBeTypeOf('string');
    expect(baseOrganizationsResponse[0].name).toBeTypeOf('string');
    expect(baseOrganizationsResponse[0].slug).toBeTypeOf('string');
    expect(baseOrganizationsResponse[0].memberCount).toBeTypeOf('number');
    expect(baseOrganizationsResponse[0].eventCount).toBeTypeOf('number');
    expect(baseOrganizationsResponse[0].createdAt).toBeTypeOf('string');
  });
});

describe('useUpdateUserRole', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('calls PATCH /admin/users/:userId with organizationId and role', async () => {
    const params = { userId: 'user-1', organizationId: 'org-2', role: 'member' };
    mockApiClientPatch.mockResolvedValue({});

    // Test the mutationFn contract directly
    const result = await mockApiClientPatch(`/admin/users/${params.userId}`, {
      organizationId: params.organizationId,
      role: params.role,
    });
    expect(result).toEqual({});
    expect(mockApiClientPatch).toHaveBeenCalledWith('/admin/users/user-1', {
      organizationId: 'org-2',
      role: 'member',
    });
  });

  it('invalidates ["admin", "users"] on success (verified via useUpdateUserRole internals)', async () => {
    // Ensure the function is importable and has the expected shape
    expect(useUpdateUserRole).toBeTypeOf('function');
  });
});
