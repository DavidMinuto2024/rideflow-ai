import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Role } from '@prisma/client';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { InvitationsService } from './invitations.service';
import { JoinRole } from './dto/join-event.dto';

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
    _pushResult: (data: unknown, error: unknown = null, extra: Record<string, unknown> = {}) => {
      resultQueue.push({ data, error, ...extra });
    },
  };
}

describe('InvitationsService', () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  let notifications: { create: jest.Mock };
  let service: InvitationsService;

  beforeEach(() => {
    supabase = createMockSupabase();

    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    service = new InvitationsService(
      supabase as unknown as SupabaseDataService,
      notifications as any,
    );
  });

  describe('validateToken', () => {
    it('resolves event info for a valid invite token', async () => {
      supabase._pushResult({
        id: 'event-1',
        title: 'Morning commute',
        description: 'Ride together',
        date: new Date('2026-08-01T12:00:00.000Z'),
        origin: 'Chapinero',
        destination: 'Parque 93',
        organization: { id: 'org-1', name: 'RideFlow' },
        status: EventStatus.OPEN,
        capacity: 4,
        arrival_time: new Date('2026-08-01T13:00:00.000Z'),
        invite_token_expires_at: new Date('2026-08-08T12:00:00.000Z'),
      });

      await expect(service.validateToken('valid-token')).resolves.toEqual({
        id: 'event-1',
        title: 'Morning commute',
        description: 'Ride together',
        date: new Date('2026-08-01T12:00:00.000Z'),
        origin: 'Chapinero',
        destination: 'Parque 93',
        organization: { id: 'org-1', name: 'RideFlow' },
        status: EventStatus.OPEN,
        capacity: 4,
        arrivalTime: new Date('2026-08-01T13:00:00.000Z'),
      });

      expect(supabase.from).toHaveBeenCalledWith('events');
    });

    it('rejects expired invite tokens', async () => {
      // Push twice because the test calls validateToken twice
      const expiredEvent = {
        id: 'event-1',
        status: EventStatus.OPEN,
        invite_token_expires_at: new Date('2000-01-01T00:00:00.000Z'),
        organization: { id: 'org-1', name: 'RideFlow' },
      };
      supabase._pushResult(expiredEvent);
      supabase._pushResult(expiredEvent);

      await expect(service.validateToken('expired-token')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.validateToken('expired-token')).rejects.toThrow(
        'Invite token has expired',
      );
    });

    it('rejects unknown invite tokens', async () => {
      supabase._pushResult(null);

      await expect(service.validateToken('missing-token')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('joinEvent', () => {
    it('creates an EventVehicle when joining as driver', async () => {
      // Query 1: find event + organization + membership
      supabase._pushResult({
        id: 'event-1',
        status: EventStatus.OPEN,
        invite_token_expires_at: new Date('2099-01-01T00:00:00.000Z'),
        organization_id: 'org-1',
        organization: {
          members: [{ user_id: 'user-1', role: Role.DRIVER }],
        },
      });

      // Query 2: find org member (for role check)
      supabase._pushResult({
        role: Role.DRIVER,
      });

      // Query 3: find vehicle
      supabase._pushResult({
        id: 'vehicle-1',
        driver_id: 'user-1',
        plate: 'ABC125',
      });

      // Query 4: check existing event vehicle
      supabase._pushResult(null);

      // Query 5: count registered drivers
      supabase._pushResult(null, null, { count: 0 });

      // Query 6: find event date for pico y placa
      supabase._pushResult({
        date: new Date('2026-07-22T12:00:00.000Z'),
      });

      // Query 7: create event vehicle
      supabase._pushResult({
        id: 'event-vehicle-1',
        event_id: 'event-1',
        vehicle_id: 'vehicle-1',
        driver_id: 'user-1',
        start_location: 'Zona T',
        start_lat: 4.667,
        start_lng: -74.053,
        pico_y_placa: true,
        vehicle: { id: 'vehicle-1', plate: 'ABC125' },
        event: { id: 'event-1', title: 'Morning commute' },
      });

      // Query 8: find event for org_id (inside notifyEventAdmins)
      supabase._pushResult({ organization_id: 'org-1' });

      // Query 9: find org members for notification (notifyEventAdmins)
      supabase._pushResult([{ user_id: 'admin-1' }]);

      const result = await service.joinEvent('driver-token', 'user-1', {
        role: JoinRole.DRIVER,
        vehicleId: 'vehicle-1',
        startLocation: 'Zona T',
        startLat: 4.667,
        startLng: -74.053,
      });

      expect(notifications.create).toHaveBeenCalledWith({
        type: 'EVENT_VEHICLE_REGISTERED',
        title: 'New driver registered',
        message: 'A driver registered for "Morning commute"',
        userId: 'admin-1',
      });
      expect(result).toMatchObject({
        id: 'event-vehicle-1',
        event_id: 'event-1',
        vehicle_id: 'vehicle-1',
        driver_id: 'user-1',
      });
    });

    it('creates a RideRequest with pickup fields when joining as passenger', async () => {
      // Query 1: find event + org + membership
      supabase._pushResult({
        id: 'event-1',
        status: EventStatus.OPEN,
        invite_token_expires_at: new Date('2099-01-01T00:00:00.000Z'),
        organization_id: 'org-1',
        organization: {
          members: [{ user_id: 'user-2', role: Role.PASSENGER }],
        },
      });

      // Query 2: find org member (role check)
      supabase._pushResult({
        role: Role.PASSENGER,
      });

      // Query 3: check existing ride request
      supabase._pushResult(null);

      // Query 4: find event for capacity
      supabase._pushResult({
        capacity: 3,
      });

      // Query 5: count accepted requests
      supabase._pushResult(null, null, { count: 1 });

      // Query 6: create ride request
      supabase._pushResult({
        id: 'request-1',
        event_id: 'event-1',
        passenger_id: 'user-2',
        pickup_lat: 4.711,
        pickup_lng: -74.072,
        pickup_address: 'Calle 85 #12-34',
        passenger: {
          id: 'user-2',
          name: 'Passenger One',
          email: 'passenger@example.com',
        },
      });

      // Query 7: find event for org_id (inside notifyEventAdmins)
      supabase._pushResult({ organization_id: 'org-1' });

      // Query 8: find org members for notification
      supabase._pushResult([{ user_id: 'admin-1' }]);

      const result = await service.joinEvent('passenger-token', 'user-2', {
        role: JoinRole.PASSENGER,
        pickupLat: 4.711,
        pickupLng: -74.072,
        pickupAddress: 'Calle 85 #12-34',
      });

      expect(notifications.create).toHaveBeenCalledWith({
        type: 'RIDE_REQUESTED',
        title: 'New ride request',
        message: 'Passenger One requested a ride',
        userId: 'admin-1',
      });
      expect(result).toMatchObject({
        id: 'request-1',
        event_id: 'event-1',
        passenger_id: 'user-2',
        pickup_address: 'Calle 85 #12-34',
      });
    });

    it('rejects expired tokens during join', async () => {
      supabase._pushResult({
        id: 'event-1',
        status: EventStatus.OPEN,
        invite_token_expires_at: new Date('2000-01-01T00:00:00.000Z'),
        organization_id: 'org-1',
        organization: {
          members: [{ user_id: 'user-2', role: Role.PASSENGER }],
        },
      });

      await expect(
        service.joinEvent('expired-token', 'user-2', { role: JoinRole.PASSENGER }),
      ).rejects.toThrow('Invite token has expired');
    });

    it('rejects non-members before join creation', async () => {
      // Queries 1-2: event found but no matching org member
      supabase._pushResult(null);
      supabase._pushResult({ id: 'event-1' });

      await expect(
        service.joinEvent('valid-token', 'outsider', { role: JoinRole.PASSENGER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects duplicate passenger join requests', async () => {
      // Query 1: find event + org + membership
      supabase._pushResult({
        id: 'event-1',
        status: EventStatus.OPEN,
        invite_token_expires_at: new Date('2099-01-01T00:00:00.000Z'),
        organization_id: 'org-1',
        organization: {
          members: [{ user_id: 'user-2', role: Role.PASSENGER }],
        },
      });

      // Query 2: find org member
      supabase._pushResult({
        role: Role.PASSENGER,
      });

      // Query 3: check existing ride request — found (duplicate)
      supabase._pushResult({ id: 'request-1' });

      await expect(
        service.joinEvent('valid-token', 'user-2', { role: JoinRole.PASSENGER }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
