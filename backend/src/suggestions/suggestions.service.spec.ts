import { ConfigService } from '@nestjs/config';
import { SuggestionsService } from './suggestions.service';

function createThenable<T>(value: T) {
  const promise = Promise.resolve(value);
  return {
    then: promise.then.bind(promise),
    catch: promise.catch.bind(promise),
  };
}

interface MockQuery {
  select: jest.Mock;
  eq: jest.Mock;
  in: jest.Mock;
  not: jest.Mock;
  order: jest.Mock;
  limit: jest.Mock;
  single: jest.Mock;
  maybeSingle: jest.Mock;
  insert: jest.Mock;
  update: jest.Mock;
  delete: jest.Mock;
  then: <T>(resolve: (value: T) => void) => Promise<T>;
  catch: <T>(reject: (reason: any) => void) => Promise<T>;
}

function createQuery(resolveValue: { data: any; error: any }) {
  const thenable = createThenable(resolveValue);
  const query: MockQuery = {
    select: jest.fn().mockReturnThis(),
    eq: jest.fn().mockReturnThis(),
    in: jest.fn().mockReturnThis(),
    not: jest.fn().mockReturnThis(),
    order: jest.fn().mockReturnThis(),
    limit: jest.fn().mockReturnThis(),
    single: jest.fn().mockReturnValue(Promise.resolve(resolveValue)),
    maybeSingle: jest.fn().mockReturnValue(Promise.resolve(resolveValue)),
    insert: jest.fn().mockReturnThis(),
    update: jest.fn().mockReturnThis(),
    delete: jest.fn().mockReturnThis(),
    then: thenable.then as any,
    catch: thenable.catch as any,
  };
  return query;
}

describe('SuggestionsService', () => {
  let supabase: { from: jest.Mock };
  let config: Pick<ConfigService, 'get'>;
  let service: SuggestionsService;

  /**
   * Create a mock query that returns specific data when awaited.
   * Each call to `from()` returns a fresh chain whose terminal
   * methods resolve to the passed result.
   */
  function mockFromResult(result: { data: any; error: any }) {
    return createQuery(result);
  }

  beforeEach(() => {
    supabase = {
      from: jest.fn(),
    };

    config = {
      get: jest.fn().mockReturnValue('http://osrm.test'),
    };

    service = new SuggestionsService(supabase as any, config as ConfigService);
  });

  describe('getSuggestions', () => {
    it('ranks the closest driver first for a passenger pickup', async () => {
      // 1. Event lookup: .from('events').select('id').eq('id', eventId).maybeSingle()
      supabase.from
        .mockReturnValueOnce(mockFromResult({ data: { id: 'event-1' }, error: null }))
        // 2. EventVehicles lookup: .from('event_vehicles').select('...').eq(...).not(...).not(...)
        .mockReturnValueOnce(
          mockFromResult({
            data: [
              {
                driver_id: 'driver-near',
                start_lat: 4.7112,
                start_lng: -74.0721,
                vehicle_id: 'vehicle-near',
                driver: { name: 'Near Driver' },
                vehicle: { model: 'Mazda 2', capacity: 4 },
              },
              {
                driver_id: 'driver-far',
                start_lat: 4.6486,
                start_lng: -74.2479,
                vehicle_id: 'vehicle-far',
                driver: { name: 'Far Driver' },
                vehicle: { model: 'Renault Logan', capacity: 4 },
              },
            ],
            error: null,
          }),
        )
        // 3. RideRequest lookup: .from('ride_requests').select('...').eq(...).eq(...).not(...).not(...)
        .mockReturnValueOnce(
          mockFromResult({
            data: [
              {
                passenger_id: 'passenger-1',
                pickup_lat: 4.7109,
                pickup_lng: -74.0728,
                passenger: { name: 'Passenger One' },
              },
            ],
            error: null,
          }),
        );

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
      // 1. Event lookup: .from('events').select('*').eq('id', eventId).maybeSingle()
      supabase.from
        .mockReturnValueOnce(
          mockFromResult({
            data: {
              id: 'event-1',
              arrival_time: '2026-08-01T09:00:00.000Z',
              dest_lat: 4.6097,
              dest_lng: -74.0817,
              destination: 'Destino final',
            },
            error: null,
          }),
        )
        // 2. Trips lookup: .from('trips').select('..., passenger_assignments:...').eq(...).order(...)
        .mockReturnValueOnce(
          mockFromResult({
            data: [
              {
                id: 'trip-1',
                driver_id: 'driver-1',
                origin: 'Fallback origin',
                origin_lat: 4.7001,
                origin_lng: -74.0501,
                dest: 'Destino final',
                dest_lat: 4.6097,
                dest_lng: -74.0817,
                passenger_assignments: [
                  { id: 'assignment-1', user_id: 'passenger-1', user: { id: 'passenger-1' } },
                  { id: 'assignment-2', user_id: 'passenger-2', user: { id: 'passenger-2' } },
                ],
              },
            ],
            error: null,
          }),
        )
        // 3. EventVehicle lookup for trip: .from('event_vehicles').select(...).eq(...).eq(...).maybeSingle()
        .mockReturnValueOnce(
          mockFromResult({
            data: {
              start_location: 'Driver start',
              start_lat: 4.7001,
              start_lng: -74.0501,
            },
            error: null,
          }),
        )
        // 4. RideRequest #1: .from('ride_requests').select(...).eq(...).eq(...).not(...).not(...).limit(1).maybeSingle()
        .mockReturnValueOnce(
          mockFromResult({
            data: {
              pickup_address: 'Pickup 1',
              pickup_lat: 4.6891,
              pickup_lng: -74.0552,
            },
            error: null,
          }),
        )
        // 5. RideRequest #2
        .mockReturnValueOnce(
          mockFromResult({
            data: {
              pickup_address: 'Pickup 2',
              pickup_lat: 4.6765,
              pickup_lng: -74.0628,
            },
            error: null,
          }),
        )
        // 6. Trip update: .from('trips').update(...).eq('id', trip.id)
        .mockReturnValueOnce(
          mockFromResult({ data: null, error: null }),
        )
        // 7. PassengerAssignment update #1: .from('passenger_assignments').update(...).eq('id', ...)
        .mockReturnValueOnce(
          mockFromResult({ data: null, error: null }),
        )
        // 8. PassengerAssignment update #2
        .mockReturnValueOnce(
          mockFromResult({ data: null, error: null }),
        );

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

      // Verify update calls
      expect(supabase.from).toHaveBeenNthCalledWith(6, 'trips');
      const tripUpdateQuery = supabase.from.mock.results[5].value;
      expect(tripUpdateQuery.update).toHaveBeenCalledWith({
        estimated_departure_time: '2026-08-01T08:30:00.000Z',
      });
      expect(tripUpdateQuery.eq).toHaveBeenCalledWith('id', 'trip-1');

      expect(supabase.from).toHaveBeenNthCalledWith(7, 'passenger_assignments');
      const paUpdateQuery1 = supabase.from.mock.results[6].value;
      expect(paUpdateQuery1.update).toHaveBeenCalledWith({
        estimated_pickup_time: '2026-08-01T08:40:00.000Z',
        pickup_order: 1,
      });
      expect(paUpdateQuery1.eq).toHaveBeenCalledWith('id', 'assignment-1');

      expect(supabase.from).toHaveBeenNthCalledWith(8, 'passenger_assignments');
      const paUpdateQuery2 = supabase.from.mock.results[7].value;
      expect(paUpdateQuery2.update).toHaveBeenCalledWith({
        estimated_pickup_time: '2026-08-01T08:45:00.000Z',
        pickup_order: 2,
      });
      expect(paUpdateQuery2.eq).toHaveBeenCalledWith('id', 'assignment-2');

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
