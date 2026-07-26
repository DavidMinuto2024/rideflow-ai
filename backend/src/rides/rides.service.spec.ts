import { RequestStatus, Role } from '@prisma/client';
import { RidesService } from './rides.service';

describe('RidesService', () => {
  let prisma: any;
  let notifications: { create: jest.Mock };
  let suggestionsService: { optimizeTimes: jest.Mock };
  let service: RidesService;

  beforeEach(() => {
    prisma = {
      rideRequest: {
        findUnique: jest.fn(),
        count: jest.fn(),
        update: jest.fn(),
      },
      organizationMember: {
        findUnique: jest.fn(),
        findMany: jest.fn(),
      },
    };

    notifications = {
      create: jest.fn().mockResolvedValue(undefined),
    };

    suggestionsService = {
      optimizeTimes: jest.fn(),
    };

    service = new RidesService(
      prisma,
      notifications as any,
      suggestionsService as any,
    );
  });

  describe('updateRequestStatus', () => {
    it('reoptimizes times and notifies affected passengers when cancelling an accepted request', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({
        id: 'request-1',
        eventId: 'event-1',
        passengerId: 'passenger-1',
        tripId: 'trip-1',
        status: RequestStatus.ACCEPTED,
        event: {
          title: 'Morning commute',
          organizationId: 'org-1',
          capacity: 4,
          organization: {},
        },
        passenger: { id: 'passenger-1', name: 'Passenger One' },
      });
      prisma.organizationMember.findUnique.mockResolvedValue({
        userId: 'driver-1',
        role: Role.DRIVER,
      });
      prisma.rideRequest.update.mockResolvedValue({
        id: 'request-1',
        eventId: 'event-1',
        passengerId: 'passenger-1',
        status: RequestStatus.CANCELLED,
        passenger: { id: 'passenger-1', name: 'Passenger One' },
      });
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

      expect(prisma.rideRequest.update).toHaveBeenCalledWith({
        where: { id: 'request-1' },
        data: { status: RequestStatus.CANCELLED },
        include: {
          passenger: { select: { id: true, name: true, email: true } },
        },
      });
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
      expect(result).toMatchObject({
        id: 'request-1',
        status: RequestStatus.CANCELLED,
      });
    });

    it('keeps cancellation successful when reoptimization fails', async () => {
      prisma.rideRequest.findUnique.mockResolvedValue({
        id: 'request-2',
        eventId: 'event-2',
        passengerId: 'passenger-9',
        tripId: 'trip-9',
        status: RequestStatus.ACCEPTED,
        event: {
          title: 'Evening return',
          organizationId: 'org-1',
          capacity: 4,
          organization: {},
        },
        passenger: { id: 'passenger-9', name: 'Passenger Nine' },
      });
      prisma.organizationMember.findUnique.mockResolvedValue({
        userId: 'admin-1',
        role: Role.ORG_ADMIN,
      });
      prisma.rideRequest.update.mockResolvedValue({
        id: 'request-2',
        status: RequestStatus.CANCELLED,
        passenger: { id: 'passenger-9', name: 'Passenger Nine' },
      });
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
      expect(notifications.create).toHaveBeenCalledTimes(1);
      expect(notifications.create).toHaveBeenCalledWith({
        type: 'RIDE_CANCELLED',
        title: 'Ride cancelled',
        message: 'Your ride request for "Evening return" was cancelled',
        userId: 'passenger-9',
      });
    });
  });
});
