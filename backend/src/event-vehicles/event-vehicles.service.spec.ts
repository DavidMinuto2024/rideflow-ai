import { EventVehiclesService } from './event-vehicles.service';

describe('EventVehiclesService', () => {
  let service: EventVehiclesService;

  beforeEach(() => {
    service = new EventVehiclesService({} as any);
  });

  it.each([
    ['Monday', 'ABC121', new Date('2026-07-20T12:00:00.000Z'), true],
    ['Tuesday', 'ABC123', new Date('2026-07-21T12:00:00.000Z'), true],
    ['Wednesday', 'ABC125', new Date('2026-07-22T12:00:00.000Z'), true],
    ['Thursday', 'ABC127', new Date('2026-07-23T12:00:00.000Z'), true],
    ['Friday', 'ABC129', new Date('2026-07-24T12:00:00.000Z'), true],
    ['Tuesday non-matching plate', 'ABC125', new Date('2026-07-21T12:00:00.000Z'), false],
    ['Sunday', 'ABC127', new Date('2026-07-26T12:00:00.000Z'), false],
    ['Saturday', 'ABC129', new Date('2026-07-25T12:00:00.000Z'), false],
  ])('applies pico y placa rules for %s', (_label, plate, date, expected) => {
    expect(service.checkPicoYPlaca(plate, date)).toBe(expected);
  });
});
