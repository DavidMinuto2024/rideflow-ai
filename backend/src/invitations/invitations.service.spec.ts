import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  NotFoundException,
} from '@nestjs/common';
import { EventStatus, Role } from '@prisma/client';
import { InvitationsService } from './invitations.service';
import { JoinRole } from './dto/join-event.dto';

describe('InvitationsService', () => {
  let prisma: any;
  let notifications: { create: jest.Mock };
  let service: InvitationsService;

  beforeEach(() => {
    prisma = {
      event: { findUnique: jest.fn() },
      vehicle: { findFirst: jest.fn() },
      eventVehicle: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      rideRequest: {
        findUnique: jest.fn(),
        count: jest.fn(),
        create: jest.fn(),
      },
      organizationMember: { findMany: jest.fn() },
    };

    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    service = new InvitationsService(prisma, notifications as any);
  });

  describe('validateToken', () => {
    it('resolves event info for a valid invite token', async () => {
      prisma.event.findUnique.mockResolvedValue({
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
        inviteTokenExpiresAt: new Date('2026-08-08T12:00:00.000Z'),
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

      expect(prisma.event.findUnique).toHaveBeenCalledWith({
        where: { inviteToken: 'valid-token' },
        include: {
          organization: { select: { id: true, name: true } },
        },
      });
    });

    it('rejects expired invite tokens', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.OPEN,
        inviteTokenExpiresAt: new Date('2000-01-01T00:00:00.000Z'),
        organization: { id: 'org-1', name: 'RideFlow' },
      });

      await expect(service.validateToken('expired-token')).rejects.toBeInstanceOf(
        BadRequestException,
      );
      await expect(service.validateToken('expired-token')).rejects.toThrow(
        'Invite token has expired',
      );
    });

    it('rejects unknown invite tokens', async () => {
      prisma.event.findUnique.mockResolvedValue(null);

      await expect(service.validateToken('missing-token')).rejects.toBeInstanceOf(
        NotFoundException,
      );
    });
  });

  describe('joinEvent', () => {
    it('creates an EventVehicle when joining as driver', async () => {
      prisma.event.findUnique
        .mockResolvedValueOnce({
          id: 'event-1',
          status: EventStatus.OPEN,
          inviteTokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
          organization: {
            members: [{ userId: 'user-1', role: Role.DRIVER }],
          },
        })
        .mockResolvedValueOnce({
          id: 'event-1',
          date: new Date('2026-07-22T12:00:00.000Z'),
        })
        .mockResolvedValueOnce({
          organizationId: 'org-1',
        });
      prisma.vehicle.findFirst.mockResolvedValue({
        id: 'vehicle-1',
        driverId: 'user-1',
        plate: 'ABC125',
      });
      prisma.eventVehicle.findUnique.mockResolvedValue(null);
      prisma.eventVehicle.count.mockResolvedValue(0);
      prisma.eventVehicle.create.mockResolvedValue({
        id: 'event-vehicle-1',
        eventId: 'event-1',
        vehicleId: 'vehicle-1',
        driverId: 'user-1',
        startLocation: 'Zona T',
        startLat: 4.667,
        startLng: -74.053,
        picoYPlaca: true,
        vehicle: { id: 'vehicle-1', plate: 'ABC125' },
        event: { id: 'event-1', title: 'Morning commute' },
      });
      prisma.organizationMember.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      const result = await service.joinEvent('driver-token', 'user-1', {
        role: JoinRole.DRIVER,
        vehicleId: 'vehicle-1',
        startLocation: 'Zona T',
        startLat: 4.667,
        startLng: -74.053,
      });

      expect(prisma.eventVehicle.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          vehicleId: 'vehicle-1',
          driverId: 'user-1',
          startLocation: 'Zona T',
          startLat: 4.667,
          startLng: -74.053,
          picoYPlaca: true,
        },
        include: {
          vehicle: true,
          event: { select: { id: true, title: true } },
        },
      });
      expect(notifications.create).toHaveBeenCalledWith({
        type: 'EVENT_VEHICLE_REGISTERED',
        title: 'New driver registered',
        message: 'A driver registered for "Morning commute"',
        userId: 'admin-1',
      });
      expect(result).toMatchObject({
        id: 'event-vehicle-1',
        eventId: 'event-1',
        vehicleId: 'vehicle-1',
        driverId: 'user-1',
      });
    });

    it('creates a RideRequest with pickup fields when joining as passenger', async () => {
      prisma.event.findUnique
        .mockResolvedValueOnce({
          id: 'event-1',
          status: EventStatus.OPEN,
          inviteTokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
          organization: {
            members: [{ userId: 'user-2', role: Role.PASSENGER }],
          },
        })
        .mockResolvedValueOnce({
          id: 'event-1',
          capacity: 3,
        })
        .mockResolvedValueOnce({
          organizationId: 'org-1',
        });
      prisma.rideRequest.findUnique.mockResolvedValue(null);
      prisma.rideRequest.count.mockResolvedValue(1);
      prisma.rideRequest.create.mockResolvedValue({
        id: 'request-1',
        eventId: 'event-1',
        passengerId: 'user-2',
        pickupLat: 4.711,
        pickupLng: -74.072,
        pickupAddress: 'Calle 85 #12-34',
        passenger: {
          id: 'user-2',
          name: 'Passenger One',
          email: 'passenger@example.com',
        },
      });
      prisma.organizationMember.findMany.mockResolvedValue([
        { userId: 'admin-1' },
      ]);

      const result = await service.joinEvent('passenger-token', 'user-2', {
        role: JoinRole.PASSENGER,
        pickupLat: 4.711,
        pickupLng: -74.072,
        pickupAddress: 'Calle 85 #12-34',
      });

      expect(prisma.rideRequest.create).toHaveBeenCalledWith({
        data: {
          eventId: 'event-1',
          passengerId: 'user-2',
          pickupLat: 4.711,
          pickupLng: -74.072,
          pickupAddress: 'Calle 85 #12-34',
        },
        include: {
          passenger: { select: { id: true, name: true, email: true } },
        },
      });
      expect(notifications.create).toHaveBeenCalledWith({
        type: 'RIDE_REQUESTED',
        title: 'New ride request',
        message: 'Passenger One requested a ride',
        userId: 'admin-1',
      });
      expect(result).toMatchObject({
        id: 'request-1',
        eventId: 'event-1',
        passengerId: 'user-2',
        pickupAddress: 'Calle 85 #12-34',
      });
    });

    it('rejects expired tokens during join', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.OPEN,
        inviteTokenExpiresAt: new Date('2000-01-01T00:00:00.000Z'),
        organization: {
          members: [{ userId: 'user-2', role: Role.PASSENGER }],
        },
      });

      await expect(
        service.joinEvent('expired-token', 'user-2', { role: JoinRole.PASSENGER }),
      ).rejects.toThrow('Invite token has expired');
    });

    it('rejects non-members before join creation', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        status: EventStatus.OPEN,
        inviteTokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
        organization: {
          members: [],
        },
      });

      await expect(
        service.joinEvent('valid-token', 'outsider', { role: JoinRole.PASSENGER }),
      ).rejects.toBeInstanceOf(ForbiddenException);
    });

    it('rejects duplicate passenger join requests', async () => {
      prisma.event.findUnique
        .mockResolvedValueOnce({
          id: 'event-1',
          status: EventStatus.OPEN,
          inviteTokenExpiresAt: new Date('2099-01-01T00:00:00.000Z'),
          organization: {
            members: [{ userId: 'user-2', role: Role.PASSENGER }],
          },
        });
      prisma.rideRequest.findUnique.mockResolvedValue({
        id: 'request-1',
      });

      await expect(
        service.joinEvent('valid-token', 'user-2', { role: JoinRole.PASSENGER }),
      ).rejects.toBeInstanceOf(ConflictException);
    });
  });
});
