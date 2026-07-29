import { RequestStatus, Role } from '@prisma/client';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { RidesService } from './rides.service';

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

  // Make the builder thenable — pops next result from the queue
  (builder as any).then = (onResolve: (v: unknown) => unknown) => {
    const r = resultQueue.shift() || { data: null, error: null };
    return Promise.resolve(r).then(onResolve);
  };

  // Expose a not() mock — it returns the builder
  (builder as any).not = jest.fn().mockReturnValue(builder);

  const from = jest.fn(() => builder);

  return {
    from,
    _pushResult: (data: unknown, error: unknown = null, extra: Record<string, unknown> = {}) => {
      resultQueue.push({ data, error, ...extra });
    },
  };
}

describe('RidesService', () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  let notifications: { create: jest.Mock };
  let suggestionsService: { optimizeTimes: jest.Mock };
  let service: RidesService;

  beforeEach(() => {
    supabase = createMockSupabase();

    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    suggestionsService = {
      optimizeTimes: jest.fn(),
    };

    service = new RidesService(
      supabase as unknown as SupabaseDataService,
      notifications as any,
      suggestionsService as any,
    );
  });

  describe('updateRequestStatus', () => {
    it('allows a passenger to cancel their own PENDING request (bypasses role check)', async () => {
      // Query 1: find ride request — PENDING, owned by passenger-1
      supabase._pushResult({
        id: 'request-3',
        event_id: 'event-3',
        passenger_id: 'passenger-1',
        trip_id: null,
        status: RequestStatus.PENDING,
        event: {
          title: 'Morning commute',
          organization_id: 'org-1',
          capacity: 4,
          organization: {},
        },
        passenger: { id: 'passenger-1', name: 'Passenger One' },
      });

      // Query 2: update ride request (no role check queried)
      supabase._pushResult({
        id: 'request-3',
        event_id: 'event-3',
        passenger_id: 'passenger-1',
        status: RequestStatus.CANCELLED,
        passenger: { id: 'passenger-1', name: 'Passenger One', email: 'p1@example.com' },
      });

      suggestionsService.optimizeTimes.mockResolvedValue({ message: 'No trips to optimize' });

      // Query 3: organization_members from notifyEventAdmins (empty — no admin notifications)
      supabase._pushResult([]);

      const result = await service.updateRequestStatus(
        'request-3',
        { status: RequestStatus.CANCELLED },
        'passenger-1',
      );

      expect(result).toMatchObject({
        id: 'request-3',
        status: RequestStatus.CANCELLED,
      });
      // notifyEventAdmins queries organization_members (role check still bypassed)
      const orgMemberCalls = (supabase.from as jest.Mock).mock.calls.filter(
        (call: unknown[]) => call[0] === 'organization_members',
      );
      expect(orgMemberCalls).toHaveLength(1);
    });

    it('enforces role check for a non-passenger cancelling a PENDING request', async () => {
      // Query 1: find ride request
      supabase._pushResult({
        id: 'request-4',
        event_id: 'event-3',
        passenger_id: 'passenger-2',
        trip_id: null,
        status: RequestStatus.PENDING,
        event: {
          title: 'Morning commute',
          organization_id: 'org-1',
          capacity: 4,
          organization: {},
        },
        passenger: { id: 'passenger-2', name: 'Passenger Two' },
      });

      // Query 2: find authorizer — no membership for user-99
      supabase._pushResult(null);

      await expect(
        service.updateRequestStatus(
          'request-4',
          { status: RequestStatus.CANCELLED },
          'user-99',
        ),
      ).rejects.toThrow('Only event drivers or admins can approve/reject ride requests');
    });

    it('reoptimizes times and notifies affected passengers when cancelling an accepted request', async () => {
      // Query 1: find ride request
      supabase._pushResult({
        id: 'request-1',
        event_id: 'event-1',
        passenger_id: 'passenger-1',
        trip_id: 'trip-1',
        status: RequestStatus.ACCEPTED,
        event: {
          title: 'Morning commute',
          organization_id: 'org-1',
          capacity: 4,
          organization: {},
        },
        passenger: { id: 'passenger-1', name: 'Passenger One' },
      });

      // Query 2: find authorizer
      supabase._pushResult({
        role: Role.DRIVER,
      });

      // Query 3: update ride request
      supabase._pushResult({
        id: 'request-1',
        event_id: 'event-1',
        passenger_id: 'passenger-1',
        status: RequestStatus.CANCELLED,
        passenger: { id: 'passenger-1', name: 'Passenger One', email: 'p1@example.com' },
      });

      // Query 4: organization_members from notifyEventAdmins
      supabase._pushResult([
        { user_id: 'admin-2' },
      ]);

      suggestionsService.optimizeTimes.mockResolvedValue({
        message: 'Optimized times for 1 trip(s)',
        arrivalTime: '2026-08-01T09:00:00.000Z',
        trips: [
          {
            tripId: 'trip-1',
            estimatedDepartureTime: '2026-08-01T08:35:00.000Z',
            pickupTimes: [
              {
                passengerId: 'passenger-2',
                pickupTime: '2026-08-01T08:43:00.000Z',
                order: 1,
              },
              {
                passengerId: 'passenger-3',
                pickupTime: '2026-08-01T08:49:00.000Z',
                order: 2,
              },
            ],
            source: 'osrm',
          },
        ],
      });

      const result = await service.updateRequestStatus(
        'request-1',
        { status: RequestStatus.CANCELLED },
        'driver-1',
      );

      expect(supabase.from).toHaveBeenCalledWith('ride_requests');
      expect(supabase.from).toHaveBeenCalledWith('organization_members');
      expect(suggestionsService.optimizeTimes).toHaveBeenCalledWith('event-1');
      expect(notifications.create).toHaveBeenNthCalledWith(1, {
        type: 'RIDE_CANCELLED',
        title: 'Ride cancelled',
        message: 'Your ride request for "Morning commute" was cancelled',
        userId: 'passenger-1',
      });
      expect(notifications.create).toHaveBeenNthCalledWith(2, {
        type: 'ESTIMATED_PICKUP_TIME',
        title: 'Pickup time updated',
        message: expect.stringContaining('Your estimated pickup time has been updated to'),
        userId: 'passenger-2',
      });
      expect(notifications.create).toHaveBeenNthCalledWith(3, {
        type: 'ESTIMATED_PICKUP_TIME',
        title: 'Pickup time updated',
        message: expect.stringContaining('Your estimated pickup time has been updated to'),
        userId: 'passenger-3',
      });
      // Admin notification from notifyEventAdmins
      expect(notifications.create).toHaveBeenNthCalledWith(4, {
        type: 'RIDE_CANCELLED',
        title: 'Ride cancelled',
        message: expect.stringContaining('Passenger One cancelled'),
        userId: 'admin-2',
      });
      expect(notifications.create).toHaveBeenCalledTimes(4);
      expect(result).toMatchObject({
        id: 'request-1',
        status: RequestStatus.CANCELLED,
      });
    });

    it('keeps cancellation successful when reoptimization fails', async () => {
      // Query 1: find ride request
      supabase._pushResult({
        id: 'request-2',
        event_id: 'event-2',
        passenger_id: 'passenger-9',
        trip_id: 'trip-9',
        status: RequestStatus.ACCEPTED,
        event: {
          title: 'Evening return',
          organization_id: 'org-1',
          capacity: 4,
          organization: {},
        },
        passenger: { id: 'passenger-9', name: 'Passenger Nine' },
      });

      // Query 2: find authorizer
      supabase._pushResult({
        role: Role.ORG_ADMIN,
      });

      // Query 3: update ride request
      supabase._pushResult({
        id: 'request-2',
        status: RequestStatus.CANCELLED,
        passenger: { id: 'passenger-9', name: 'Passenger Nine', email: 'p9@example.com' },
      });

      // Query 4: organization_members from notifyEventAdmins
      supabase._pushResult([
        { user_id: 'admin-2' },
      ]);

      suggestionsService.optimizeTimes.mockRejectedValue(new Error('OSRM unavailable'));

      await expect(
        service.updateRequestStatus(
          'request-2',
          { status: RequestStatus.CANCELLED },
          'admin-1',
        ),
      ).resolves.toMatchObject({
        id: 'request-2',
        status: RequestStatus.CANCELLED,
      });

      expect(suggestionsService.optimizeTimes).toHaveBeenCalledWith('event-2');
      expect(notifications.create).toHaveBeenCalledTimes(2);
      expect(notifications.create).toHaveBeenNthCalledWith(1, {
        type: 'RIDE_CANCELLED',
        title: 'Ride cancelled',
        message: 'Your ride request for "Evening return" was cancelled',
        userId: 'passenger-9',
      });
      expect(notifications.create).toHaveBeenNthCalledWith(2, {
        type: 'RIDE_CANCELLED',
        title: 'Ride cancelled',
        message: expect.stringContaining('Passenger Nine cancelled'),
        userId: 'admin-2',
      });
    });
  });
});
