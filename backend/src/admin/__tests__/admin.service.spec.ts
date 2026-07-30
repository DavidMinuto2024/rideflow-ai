import { AdminService } from '../admin.service';
import { SupabaseDataService } from '../../supabase/supabase-data.service';
import {
  NotFoundException,
  BadRequestException,
  InternalServerErrorException,
  ServiceUnavailableException,
  ForbiddenException,
} from '@nestjs/common';

function createMockSupabase() {
  const resultQueue: Array<Record<string, unknown>> = [];

  const builder: Record<string, jest.Mock> = {};
  const chainMethods = [
    'select', 'insert', 'update', 'delete', 'eq', 'neq',
    'in', 'gte', 'lte', 'order', 'limit', 'single',
    'maybeSingle',
  ];
  for (const m of chainMethods) {
    builder[m] = jest.fn().mockReturnThis();
  }

  (builder as any).then = (onResolve: (v: unknown) => unknown) => {
    const r = resultQueue.shift() || { data: null, error: null };
    return Promise.resolve(r).then(onResolve);
  };

  (builder as any).not = jest.fn().mockReturnValue(builder);

  const from = jest.fn(() => builder);

  return {
    from,
    handleError: jest.fn((_error: unknown, _table?: string): never => {
      // Simulate Supabase error mapping — throw a generic error
      // so the test can verify the error path was exercised.
      throw new InternalServerErrorException('Database error');
    }),
    _pushResult: (data: unknown, error: unknown = null) => {
      resultQueue.push({ data, error });
    },
    _pushCountResult: (count: number, error: unknown = null) => {
      resultQueue.push({ data: null, count, error });
    },
    _pushDataOnly: (data: unknown) => {
      resultQueue.push({ data, error: null, count: null });
    },
  };
}

describe('AdminService', () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  let service: AdminService;

  beforeEach(() => {
    supabase = createMockSupabase();
    service = new AdminService(supabase as unknown as SupabaseDataService);
  });

  describe('getStats', () => {
    it('should return aggregated system stats', async () => {
      // 1. total organizations count
      supabase._pushCountResult(5);
      // 2. total users count
      supabase._pushCountResult(100);
      // 3. total events count
      supabase._pushCountResult(20);
      // 4. events data for monthly grouping
      supabase._pushDataOnly([
        { date: '2026-01-15T00:00:00Z' },
        { date: '2026-01-20T00:00:00Z' },
        { date: '2026-02-10T00:00:00Z' },
        { date: '2026-03-05T00:00:00Z' },
      ]);
      // 5. total trips count
      supabase._pushCountResult(150);

      const result = await service.getStats();

      expect(result.totalOrganizations).toBe(5);
      expect(result.totalUsers).toBe(100);
      expect(result.totalEvents).toBe(20);
      expect(result.totalTrips).toBe(150);
      expect(result.eventsPerMonth).toHaveLength(3);
      expect(result.eventsPerMonth).toContainEqual({ month: '2026-01', count: 2 });
      expect(result.eventsPerMonth).toContainEqual({ month: '2026-02', count: 1 });
      expect(result.eventsPerMonth).toContainEqual({ month: '2026-03', count: 1 });
    });

    it('should handle empty database gracefully', async () => {
      // 1. no organizations
      supabase._pushCountResult(0);
      // 2. no users
      supabase._pushCountResult(0);
      // 3. no events
      supabase._pushCountResult(0);
      // 4. empty events array
      supabase._pushDataOnly([]);
      // 5. no trips
      supabase._pushCountResult(0);

      const result = await service.getStats();

      expect(result.totalOrganizations).toBe(0);
      expect(result.totalUsers).toBe(0);
      expect(result.totalEvents).toBe(0);
      expect(result.totalTrips).toBe(0);
      expect(result.eventsPerMonth).toEqual([]);
    });

    it('should return eventsPerMonth as empty array when there are no events', async () => {
      supabase._pushCountResult(3);
      supabase._pushCountResult(10);
      supabase._pushCountResult(0);
      supabase._pushDataOnly([]);
      supabase._pushCountResult(25);

      const result = await service.getStats();
      expect(result.eventsPerMonth).toEqual([]);
    });
  });

  describe('getStats — error paths', () => {
    it('should throw when organization count fails', async () => {
      supabase._pushCountResult(0, { message: 'connection failed' });

      await expect(service.getStats()).rejects.toThrow(InternalServerErrorException);
      expect(supabase.handleError).toHaveBeenCalledWith(
        expect.objectContaining({ message: 'connection failed' }),
        'organizations',
      );
    });

    it('should throw when events date query fails', async () => {
      supabase._pushCountResult(5);
      supabase._pushCountResult(100);
      supabase._pushCountResult(20);
      // events date query fails
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(service.getStats()).rejects.toThrow(InternalServerErrorException);
    });

    it('should handle null eventsData gracefully', async () => {
      supabase._pushCountResult(3);
      supabase._pushCountResult(10);
      supabase._pushCountResult(0);
      supabase._pushDataOnly(null);
      supabase._pushCountResult(25);

      const result = await service.getStats();
      expect(result.eventsPerMonth).toEqual([]);
    });
  });

  describe('getUsers', () => {
    it('should return all users with their memberships', async () => {
      const mockUsers = [
        {
          id: 'user-1',
          email: 'admin@test.com',
          name: 'Admin',
          phone: '123456789',
          avatar: null,
          created_at: '2026-01-01T00:00:00Z',
          members: [
            {
              organization_id: 'org-1',
              role: 'SUPER_ADMIN',
              organization: { id: 'org-1', name: 'Org Alpha' },
            },
          ],
        },
        {
          id: 'user-2',
          email: 'driver@test.com',
          name: 'Driver',
          phone: null,
          avatar: null,
          created_at: '2026-02-01T00:00:00Z',
          members: [
            {
              organization_id: 'org-1',
              role: 'DRIVER',
              organization: { id: 'org-1', name: 'Org Alpha' },
            },
            {
              organization_id: 'org-2',
              role: 'PASSENGER',
              organization: { id: 'org-2', name: 'Org Beta' },
            },
          ],
        },
      ];

      supabase._pushDataOnly(mockUsers);

      const result = await service.getUsers();

      expect(result).toHaveLength(2);
      expect(result[0].id).toBe('user-1');
      expect(result[0].email).toBe('admin@test.com');
      expect(result[0].name).toBe('Admin');
      expect(result[0].phone).toBe('123456789');
      expect(result[0].memberships).toHaveLength(1);
      expect(result[0].memberships[0].organizationName).toBe('Org Alpha');
      expect(result[0].memberships[0].role).toBe('SUPER_ADMIN');

      expect(result[1].memberships).toHaveLength(2);
      expect(result[1].memberships[1].organizationName).toBe('Org Beta');
    });

    it('should return empty array when no users exist', async () => {
      supabase._pushDataOnly([]);
      const result = await service.getUsers();
      expect(result).toEqual([]);
    });

    it('should return empty array when users data is null', async () => {
      supabase._pushDataOnly(null);
      const result = await service.getUsers();
      expect(result).toEqual([]);
    });

    it('should handle user with null members gracefully', async () => {
      supabase._pushDataOnly([
        {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test',
          phone: null,
          avatar: null,
          members: null,
        },
      ]);

      const result = await service.getUsers();
      expect(result).toHaveLength(1);
      expect(result[0].memberships).toEqual([]);
    });

    it('should handle user with null organization in membership gracefully', async () => {
      supabase._pushDataOnly([
        {
          id: 'user-1',
          email: 'test@test.com',
          name: 'Test',
          phone: null,
          avatar: null,
          members: [
            {
              organization_id: 'org-1',
              role: 'DRIVER',
              organization: null,
            },
          ],
        },
      ]);

      const result = await service.getUsers();
      expect(result[0].memberships[0].organizationName).toBe('Unknown');
    });

    it('should throw when user query fails', async () => {
      supabase._pushResult(null, { message: 'permission denied', code: '403' });

      await expect(service.getUsers()).rejects.toThrow(InternalServerErrorException);
      expect(supabase.handleError).toHaveBeenCalled();
    });
  });

  describe('updateUserRole', () => {
    it('should update a user role in the specified organization', async () => {
      supabase._pushDataOnly({ id: 'user-1', email: 'test@test.com' });
      supabase._pushDataOnly({
        id: 'member-1',
        role: 'DRIVER',
        organization_id: 'org-1',
        user_id: 'user-1',
      });
      supabase._pushDataOnly({
        id: 'member-1',
        role: 'ORG_ADMIN',
        organization_id: 'org-1',
        user_id: 'user-1',
      });

      const result = await service.updateUserRole('user-1', {
        organizationId: 'org-1',
        role: 'ORG_ADMIN' as any,
      }, 'admin-user');

      expect(result.role).toBe('ORG_ADMIN');
      expect(supabase.from).toHaveBeenCalledWith('organization_members');
    });

    it('should throw NotFoundException when user does not exist', async () => {
      supabase._pushDataOnly(null);

      await expect(
        service.updateUserRole('user-nonexistent', {
          organizationId: 'org-1',
          role: 'DRIVER' as any,
        }, 'admin-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw BadRequestException when SUPER_ADMIN tries to self-demote', async () => {
      await expect(
        service.updateUserRole('self-user', {
          organizationId: 'org-1',
          role: 'PASSENGER' as any,
        }, 'self-user'),
      ).rejects.toThrow(BadRequestException);
    });

    it('should throw NotFoundException when user is not a member of the org', async () => {
      supabase._pushDataOnly({ id: 'user-1', email: 'test@test.com' });
      supabase._pushDataOnly(null);

      await expect(
        service.updateUserRole('user-1', {
          organizationId: 'org-nonexistent',
          role: 'DRIVER' as any,
        }, 'admin-user'),
      ).rejects.toThrow(NotFoundException);
    });

    it('should throw when user lookup fails', async () => {
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(
        service.updateUserRole('user-1', {
          organizationId: 'org-1',
          role: 'DRIVER' as any,
        }, 'admin-user'),
      ).rejects.toThrow(InternalServerErrorException);
      expect(supabase.handleError).toHaveBeenCalled();
    });

    it('should throw when member lookup fails', async () => {
      supabase._pushDataOnly({ id: 'user-1' });
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(
        service.updateUserRole('user-1', {
          organizationId: 'org-1',
          role: 'DRIVER' as any,
        }, 'admin-user'),
      ).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw when update fails', async () => {
      supabase._pushDataOnly({ id: 'user-1' });
      supabase._pushDataOnly({ id: 'member-1', role: 'DRIVER' });
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(
        service.updateUserRole('user-1', {
          organizationId: 'org-1',
          role: 'ORG_ADMIN' as any,
        }, 'admin-user'),
      ).rejects.toThrow(InternalServerErrorException);
    });
  });

  describe('getOrganizations', () => {
    it('should return organizations with member and event counts', async () => {
      const mockOrgs = [
        { id: 'org-1', name: 'Org Alpha', slug: 'org-alpha', created_at: '2026-01-01T00:00:00Z' },
        { id: 'org-2', name: 'Org Beta', slug: 'org-beta', created_at: '2026-02-01T00:00:00Z' },
      ];
      const mockMembers = [
        { organization_id: 'org-1' },
        { organization_id: 'org-1' },
        { organization_id: 'org-2' },
      ];
      const mockEvents = [
        { organization_id: 'org-1' },
        { organization_id: 'org-1' },
        { organization_id: 'org-1' },
        { organization_id: 'org-2' },
      ];

      // 1. orgs query → data
      supabase._pushDataOnly(mockOrgs);
      // 2. members batch query → data (not head)
      supabase._pushDataOnly(mockMembers);
      // 3. events batch query → data
      supabase._pushDataOnly(mockEvents);

      const result = await service.getOrganizations();

      expect(result).toHaveLength(2);
      expect(result[0].name).toBe('Org Alpha');
      expect(result[0].slug).toBe('org-alpha');
      expect(result[0].memberCount).toBe(2);
      expect(result[0].eventCount).toBe(3);
      expect(result[1].name).toBe('Org Beta');
      expect(result[1].memberCount).toBe(1);
      expect(result[1].eventCount).toBe(1);
    });

    it('should handle empty organizations list', async () => {
      supabase._pushDataOnly([]);

      const result = await service.getOrganizations();
      expect(result).toEqual([]);
    });

    it('should throw when organizations query fails', async () => {
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(service.getOrganizations()).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw when members batch query fails', async () => {
      supabase._pushDataOnly([{ id: 'org-1', name: 'Org', slug: 'org', created_at: '2026-01-01T00:00:00Z' }]);
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(service.getOrganizations()).rejects.toThrow(InternalServerErrorException);
    });

    it('should throw when events batch query fails', async () => {
      supabase._pushDataOnly([{ id: 'org-1', name: 'Org', slug: 'org', created_at: '2026-01-01T00:00:00Z' }]);
      supabase._pushDataOnly([]);
      supabase._pushResult(null, { message: 'db error', code: 'PGRST116' });

      await expect(service.getOrganizations()).rejects.toThrow(InternalServerErrorException);
    });
  });
});
