import { DashboardService } from './dashboard.service';
import { SupabaseDataService } from '../supabase/supabase-data.service';

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

  (builder as any).not = jest.fn().mockReturnValue(builder);

  const from = jest.fn(() => builder);

  return {
    from,
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

describe('DashboardService', () => {
  let supabase: ReturnType<typeof createMockSupabase>;
  let service: DashboardService;

  beforeEach(() => {
    supabase = createMockSupabase();
    service = new DashboardService(supabase as unknown as SupabaseDataService);
  });

  describe('getDriverDashboard', () => {
    it('should return driver dashboard stats with trips and upcoming events', async () => {
      const userId = 'driver-123';

      // Trip with event data
      const tripRow = {
        id: 'trip-1',
        event_id: 'event-1',
        driver_id: userId,
        dest: 'Destino A',
        estimated_departure_time: '2026-07-29T14:00:00Z',
        status: 'CONFIRMED',
        event: {
          id: 'event-1',
          title: 'Evento de prueba',
          date: '2026-07-29T00:00:00Z',
          origin: 'Origen A',
          destination: 'Destino A',
          status: 'OPEN',
        },
      };

      // 1. trips query returns tripRow
      supabase._pushDataOnly([tripRow]);

      // 2. passenger count for trip-1
      supabase._pushCountResult(3);

      // 3. upcoming events
      const upcomingRow = {
        id: 'ev-1',
        driver_id: userId,
        event_id: 'event-2',
        event: {
          id: 'event-2',
          title: 'Evento futuro',
          date: '2026-08-01T00:00:00Z',
          origin: 'Origen B',
          destination: 'Destino B',
          status: 'PUBLISHED',
        },
      };
      supabase._pushDataOnly([upcomingRow]);

      // 4. passenger count for todayTrips (same trip-1)
      supabase._pushCountResult(3);

      const result = await service.getDriverDashboard(userId);

      expect(result.tripsToday).toBe(1);
      expect(result.totalPassengersToday).toBe(3);
      expect(result.nextTrip).not.toBeNull();
      expect(result.nextTrip!.eventId).toBe('event-1');
      expect(result.nextTrip!.tripId).toBe('trip-1');
      expect(result.nextTrip!.destination).toBe('Destino A');
      expect(result.nextTrip!.estimatedDepartureTime).toBe('2026-07-29T14:00:00Z');
      expect(result.upcomingEvents).toHaveLength(1);
      expect(result.upcomingEvents[0].title).toBe('Evento futuro');
      expect(result.todayTrips).toHaveLength(1);
      expect(result.todayTrips[0].passengerCount).toBe(3);
    });

    it('should return empty arrays when driver has no trips', async () => {
      const userId = 'driver-empty';

      // 1. no trips
      supabase._pushDataOnly([]);
      // 2. no upcoming events
      supabase._pushDataOnly([]);

      const result = await service.getDriverDashboard(userId);

      expect(result.tripsToday).toBe(0);
      expect(result.totalPassengersToday).toBe(0);
      expect(result.nextTrip).toBeNull();
      expect(result.upcomingEvents).toHaveLength(0);
      expect(result.todayTrips).toHaveLength(0);
    });

    it('should return correct passenger count for multiple trips', async () => {
      const userId = 'driver-multi';

      const trip1 = {
        id: 'trip-1',
        event_id: 'event-1',
        driver_id: userId,
        dest: 'Destino A',
        event: { id: 'event-1', title: 'Evento 1', date: '2026-07-29T00:00:00Z', destination: 'Destino A', status: 'OPEN' },
      };
      const trip2 = {
        id: 'trip-2',
        event_id: 'event-1',
        driver_id: userId,
        dest: 'Destino B',
        event: { id: 'event-1', title: 'Evento 1', date: '2026-07-29T00:00:00Z', destination: 'Destino B', status: 'OPEN' },
      };

      // 1. two trips today
      supabase._pushDataOnly([trip1, trip2]);
      // 2. total passengers across ALL trip IDs (single count query)
      supabase._pushCountResult(3);
      // 3. no upcoming events
      supabase._pushDataOnly([]);
      // 4. trip-1 per-trip passenger count
      supabase._pushCountResult(2);
      // 5. trip-2 per-trip passenger count
      supabase._pushCountResult(1);

      const result = await service.getDriverDashboard(userId);

      expect(result.tripsToday).toBe(2);
      expect(result.totalPassengersToday).toBe(3);
      expect(result.todayTrips).toHaveLength(2);
    });
  });

  describe('getPassengerDashboard', () => {
    it('should return active requests, accepted trips, and available events', async () => {
      const userId = 'passenger-123';

      // 1. active ride requests
      const requestRow = {
        id: 'req-1',
        event_id: 'event-1',
        passenger_id: userId,
        status: 'PENDING',
        created_at: '2026-07-28T10:00:00Z',
        event: { id: 'event-1', title: 'Evento solicitado', date: '2026-08-05T00:00:00Z' },
      };
      supabase._pushDataOnly([requestRow]);

      // 2. passenger assignments (accepted trips)
      const assignmentRow = {
        id: 'pa-1',
        trip_id: 'trip-1',
        user_id: userId,
        estimated_pickup_time: '2026-08-05T08:00:00Z',
        trip: {
          id: 'trip-1',
          event_id: 'event-2',
          status: 'CONFIRMED',
          event: { id: 'event-2', title: 'Viaje aceptado', date: '2026-08-05T00:00:00Z' },
          driver: { id: 'driver-1', name: 'Carlos Conductor' },
        },
      };
      supabase._pushDataOnly([assignmentRow]);

      // 3. memberships
      supabase._pushDataOnly([{ organization_id: 'org-1' }]);

      // 4. open events
      const openEvent = {
        id: 'event-3',
        title: 'Evento disponible',
        date: '2026-08-10T00:00:00Z',
        origin: 'Origen X',
        destination: 'Destino X',
        status: 'OPEN',
        organization: { name: 'Mi Org' },
      };
      supabase._pushDataOnly([openEvent]);

      // 5. existing requests (none for event-3)
      supabase._pushDataOnly([]);

      const result = await service.getPassengerDashboard(userId);

      expect(result.activeRequests).toHaveLength(1);
      expect(result.activeRequests[0].id).toBe('req-1');
      expect(result.activeRequests[0].status).toBe('PENDING');

      expect(result.acceptedTrips).toHaveLength(1);
      expect(result.acceptedTrips[0].driverName).toBe('Carlos Conductor');

      expect(result.availableEvents).toHaveLength(1);
      expect(result.availableEvents[0].title).toBe('Evento disponible');
    });

    it('should filter out events where user already has a request', async () => {
      const userId = 'passenger-filter';

      // 1. active requests — user already requested event-1
      supabase._pushDataOnly([
        { id: 'req-1', event_id: 'event-1', passenger_id: userId, status: 'PENDING', created_at: '2026-07-28T10:00:00Z',
          event: { id: 'event-1', title: 'Ya solicitado', date: '2026-08-05T00:00:00Z' } },
      ]);

      // 2. no accepted trips
      supabase._pushDataOnly([]);

      // 3. memberships
      supabase._pushDataOnly([{ organization_id: 'org-1' }]);

      // 4. open events — event-1 and event-2
      supabase._pushDataOnly([
        { id: 'event-1', title: 'Ya solicitado', date: '2026-08-05T00:00:00Z', origin: 'A', destination: 'B', status: 'OPEN',
          organization: { name: 'Org' } },
        { id: 'event-2', title: 'Disponible', date: '2026-08-10T00:00:00Z', origin: 'C', destination: 'D', status: 'OPEN',
          organization: { name: 'Org' } },
      ]);

      // 5. existing requests — user requested event-1
      supabase._pushDataOnly([{ event_id: 'event-1' }]);

      const result = await service.getPassengerDashboard(userId);

      expect(result.availableEvents).toHaveLength(1);
      expect(result.availableEvents[0].id).toBe('event-2');
      expect(result.availableEvents[0].title).toBe('Disponible');
    });

    it('should return empty arrays when passenger has no data', async () => {
      const userId = 'passenger-empty';

      // 1. no active requests
      supabase._pushDataOnly([]);
      // 2. no accepted trips
      supabase._pushDataOnly([]);
      // 3. memberships
      supabase._pushDataOnly([{ organization_id: 'org-1' }]);
      // 4. no open events
      supabase._pushDataOnly([]);

      const result = await service.getPassengerDashboard(userId);

      expect(result.activeRequests).toHaveLength(0);
      expect(result.acceptedTrips).toHaveLength(0);
      expect(result.availableEvents).toHaveLength(0);
    });
  });
});
