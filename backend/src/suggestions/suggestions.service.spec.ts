import { ConfigService } from '@nestjs/config';
import { SuggestionsService } from './suggestions.service';

describe('SuggestionsService', () => {
  let prisma: any;
  let config: Pick<ConfigService, 'get'>;
  let service: SuggestionsService;

  beforeEach(() => {
    prisma = {
      event: { findUnique: jest.fn() },
      eventVehicle: { findMany: jest.fn(), findFirst: jest.fn() },
      rideRequest: { findMany: jest.fn(), findFirst: jest.fn() },
      trip: { findMany: jest.fn(), update: jest.fn() },
      passengerAssignment: { update: jest.fn() },
    };

    config = {
      get: jest.fn().mockReturnValue('http://osrm.test'),
    };

    service = new SuggestionsService(prisma, config as ConfigService);
  });

  describe('getSuggestions', () => {
    it('ranks the closest driver first for a passenger pickup', async () => {
      prisma.event.findUnique.mockResolvedValue({ id: 'event-1' });
      prisma.eventVehicle.findMany.mockResolvedValue([
        {
          driverId: 'driver-near',
          startLat: 4.7112,
          startLng: -74.0721,
          vehicleId: 'vehicle-near',
          driver: { name: 'Near Driver' },
          vehicle: { model: 'Mazda 2', capacity: 4 },
        },
        {
          driverId: 'driver-far',
          startLat: 4.6486,
          startLng: -74.2479,
          vehicleId: 'vehicle-far',
          driver: { name: 'Far Driver' },
          vehicle: { model: 'Renault Logan', capacity: 4 },
        },
      ]);
      prisma.rideRequest.findMany.mockResolvedValue([
        {
          passengerId: 'passenger-1',
          pickupLat: 4.7109,
          pickupLng: -74.0728,
          passenger: { name: 'Passenger One' },
        },
      ]);

      const result = await service.getSuggestions('event-1');

      expect(result.suggestions).toHaveLength(1);
      expect(result.suggestions[0].drivers).toHaveLength(2);

      const [first, second] = result.suggestions[0].drivers;
      expect(first.driverId).toBe('driver-near');
      expect(second.driverId).toBe('driver-far');
      expect(first.distanceFromPassenger).toBeLessThan(second.distanceFromPassenger);
      expect(first.score).toBeGreaterThan(second.score);
      expect(first.distanceFromPassenger).toBeLessThan(100);
      expect(second.distanceFromPassenger).toBeGreaterThan(10000);
    });
  });

  describe('optimizeTimes', () => {
    it('uses OSRM leg durations to compute departure and pickup times in route order', async () => {
      prisma.event.findUnique.mockResolvedValue({
        id: 'event-1',
        arrivalTime: new Date('2026-08-01T09:00:00.000Z'),
        destLat: 4.6097,
        destLng: -74.0817,
        destination: 'Destino final',
      });
      prisma.trip.findMany.mockResolvedValue([
        {
          id: 'trip-1',
          driverId: 'driver-1',
          origin: 'Fallback origin',
          originLat: 4.7001,
          originLng: -74.0501,
          dest: 'Destino final',
          destLat: 4.6097,
          destLng: -74.0817,
          passengerAssignments: [
            { id: 'assignment-1', userId: 'passenger-1', user: { id: 'passenger-1' } },
            { id: 'assignment-2', userId: 'passenger-2', user: { id: 'passenger-2' } },
          ],
        },
      ]);
      prisma.eventVehicle.findFirst.mockResolvedValue({
        startLocation: 'Driver start',
        startLat: 4.7001,
        startLng: -74.0501,
      });
      prisma.rideRequest.findFirst
        .mockResolvedValueOnce({
          pickupAddress: 'Pickup 1',
          pickupLat: 4.6891,
          pickupLng: -74.0552,
        })
        .mockResolvedValueOnce({
          pickupAddress: 'Pickup 2',
          pickupLat: 4.6765,
          pickupLng: -74.0628,
        });
      prisma.trip.update.mockResolvedValue(undefined);
      prisma.passengerAssignment.update.mockResolvedValue(undefined);

      jest.spyOn(service as any, 'callOSRM').mockResolvedValue({
        code: 'Ok',
        routes: [
          {
            geometry: '',
            distance: 0,
            duration: 1800,
            legs: [
              { steps: [], distance: 0, duration: 600, summary: 'start-p1' },
              { steps: [], distance: 0, duration: 300, summary: 'p1-p2' },
              { steps: [], distance: 0, duration: 900, summary: 'p2-dest' },
            ],
          },
        ],
        waypoints: [],
      });

      const result = await service.optimizeTimes('event-1');

      expect(prisma.trip.update).toHaveBeenCalledWith({
        where: { id: 'trip-1' },
        data: { estimatedDepartureTime: new Date('2026-08-01T08:30:00.000Z') },
      });
      expect(prisma.passengerAssignment.update).toHaveBeenNthCalledWith(1, {
        where: { id: 'assignment-1' },
        data: {
          estimatedPickupTime: new Date('2026-08-01T08:40:00.000Z'),
          pickupOrder: 1,
        },
      });
      expect(prisma.passengerAssignment.update).toHaveBeenNthCalledWith(2, {
        where: { id: 'assignment-2' },
        data: {
          estimatedPickupTime: new Date('2026-08-01T08:45:00.000Z'),
          pickupOrder: 2,
        },
      });
      expect(result).toEqual({
        message: 'Optimized times for 1 trip(s)',
        arrivalTime: '2026-08-01T09:00:00.000Z',
        trips: [
          {
            tripId: 'trip-1',
            estimatedDepartureTime: '2026-08-01T08:30:00.000Z',
            pickupTimes: [
              {
                passengerId: 'passenger-1',
                pickupTime: '2026-08-01T08:40:00.000Z',
                order: 1,
              },
              {
                passengerId: 'passenger-2',
                pickupTime: '2026-08-01T08:45:00.000Z',
                order: 2,
              },
            ],
            source: 'osrm',
          },
        ],
      });
    });
  });
});
