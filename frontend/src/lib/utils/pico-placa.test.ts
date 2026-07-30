import { describe, it, expect } from 'vitest';
import {
  checkPicoYPlacaClient,
  getRestrictedDays,
  DAY_NAMES_ES,
  getRestrictedDayNameES,
  getLastDigit,
} from '../utils/pico-placa';

describe('Pico y Placa Client Utility', () => {
  describe('checkPicoYPlacaClient', () => {
    // Monday: plates ending in 1,2
    it('returns true for plate ending in 1 on Monday', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z'); // Monday
      expect(checkPicoYPlacaClient('ABC121', monday)).toBe(true);
    });

    it('returns true for plate ending in 2 on Monday', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(checkPicoYPlacaClient('XYZ992', monday)).toBe(true);
    });

    it('returns false for plate ending in 3 on Monday', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(checkPicoYPlacaClient('ABC123', monday)).toBe(false);
    });

    // Tuesday: plates ending in 3,4
    it('returns true for plate ending in 3 on Tuesday', () => {
      const tuesday = new Date('2026-07-21T12:00:00.000Z'); // Tuesday
      expect(checkPicoYPlacaClient('ABC123', tuesday)).toBe(true);
    });

    it('returns true for plate ending in 4 on Tuesday', () => {
      const tuesday = new Date('2026-07-21T12:00:00.000Z');
      expect(checkPicoYPlacaClient('XYZ994', tuesday)).toBe(true);
    });

    // Wednesday: plates ending in 5,6
    it('returns true for plate ending in 5 on Wednesday', () => {
      const wednesday = new Date('2026-07-22T12:00:00.000Z'); // Wednesday
      expect(checkPicoYPlacaClient('ABC125', wednesday)).toBe(true);
    });

    it('returns true for plate ending in 6 on Wednesday', () => {
      const wednesday = new Date('2026-07-22T12:00:00.000Z');
      expect(checkPicoYPlacaClient('XYZ996', wednesday)).toBe(true);
    });

    // Thursday: plates ending in 7,8
    it('returns true for plate ending in 7 on Thursday', () => {
      const thursday = new Date('2026-07-23T12:00:00.000Z'); // Thursday
      expect(checkPicoYPlacaClient('ABC127', thursday)).toBe(true);
    });

    it('returns true for plate ending in 8 on Thursday', () => {
      const thursday = new Date('2026-07-23T12:00:00.000Z');
      expect(checkPicoYPlacaClient('XYZ998', thursday)).toBe(true);
    });

    // Friday: plates ending in 9,0
    it('returns true for plate ending in 9 on Friday', () => {
      const friday = new Date('2026-07-24T12:00:00.000Z'); // Friday
      expect(checkPicoYPlacaClient('ABC129', friday)).toBe(true);
    });

    it('returns true for plate ending in 0 on Friday', () => {
      const friday = new Date('2026-07-24T12:00:00.000Z');
      expect(checkPicoYPlacaClient('XYZ990', friday)).toBe(true);
    });

    // Weekend: no restriction
    it('returns false on Saturday regardless of plate', () => {
      const saturday = new Date('2026-07-25T12:00:00.000Z'); // Saturday
      expect(checkPicoYPlacaClient('ABC129', saturday)).toBe(false);
      expect(checkPicoYPlacaClient('ABC121', saturday)).toBe(false);
    });

    it('returns false on Sunday regardless of plate', () => {
      const sunday = new Date('2026-07-26T12:00:00.000Z'); // Sunday
      expect(checkPicoYPlacaClient('ABC129', sunday)).toBe(false);
      expect(checkPicoYPlacaClient('ABC121', sunday)).toBe(false);
    });

    // Edge cases
    it('returns false for null plate', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(checkPicoYPlacaClient(null, monday)).toBe(false);
    });

    it('returns false for undefined plate', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(checkPicoYPlacaClient(undefined, monday)).toBe(false);
    });

    it('returns false for empty string plate', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(checkPicoYPlacaClient('', monday)).toBe(false);
    });

    it('returns false for plate with non-numeric last character', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(checkPicoYPlacaClient('ABCDEF', monday)).toBe(false);
    });
  });

  describe('getRestrictedDays', () => {
    it('returns ["Mon"] for plate ending in 1', () => {
      expect(getRestrictedDays('ABC121')).toEqual(['Mon']);
    });

    it('returns ["Mon"] for plate ending in 2', () => {
      expect(getRestrictedDays('ABC122')).toEqual(['Mon']);
    });

    it('returns ["Tue"] for plate ending in 3', () => {
      expect(getRestrictedDays('ABC123')).toEqual(['Tue']);
    });

    it('returns ["Tue"] for plate ending in 4', () => {
      expect(getRestrictedDays('ABC124')).toEqual(['Tue']);
    });

    it('returns ["Wed"] for plate ending in 5', () => {
      expect(getRestrictedDays('ABC125')).toEqual(['Wed']);
    });

    it('returns ["Wed"] for plate ending in 6', () => {
      expect(getRestrictedDays('ABC126')).toEqual(['Wed']);
    });

    it('returns ["Thu"] for plate ending in 7', () => {
      expect(getRestrictedDays('ABC127')).toEqual(['Thu']);
    });

    it('returns ["Thu"] for plate ending in 8', () => {
      expect(getRestrictedDays('ABC128')).toEqual(['Thu']);
    });

    it('returns ["Fri"] for plate ending in 9', () => {
      expect(getRestrictedDays('ABC129')).toEqual(['Fri']);
    });

    it('returns ["Fri"] for plate ending in 0', () => {
      expect(getRestrictedDays('ABC120')).toEqual(['Fri']);
    });

    it('returns [] for null plate', () => {
      expect(getRestrictedDays(null)).toEqual([]);
    });

    it('returns [] for undefined plate', () => {
      expect(getRestrictedDays(undefined)).toEqual([]);
    });

    it('returns [] for empty string plate', () => {
      expect(getRestrictedDays('')).toEqual([]);
    });

    it('returns [] for plate with non-numeric last character', () => {
      expect(getRestrictedDays('ABCDEF')).toEqual([]);
    });
  });

  describe('DAY_NAMES_ES', () => {
    it('has correct Spanish day names', () => {
      expect(DAY_NAMES_ES.Mon).toBe('Lunes');
      expect(DAY_NAMES_ES.Tue).toBe('Martes');
      expect(DAY_NAMES_ES.Wed).toBe('Miércoles');
      expect(DAY_NAMES_ES.Thu).toBe('Jueves');
      expect(DAY_NAMES_ES.Fri).toBe('Viernes');
    });
  });

  describe('getRestrictedDayNameES', () => {
    it('returns "Lunes" for plate ending in 1 on Monday', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(getRestrictedDayNameES('ABC121', monday)).toBe('Lunes');
    });

    it('returns "Miércoles" for plate ending in 5 on Wednesday', () => {
      const wednesday = new Date('2026-07-22T12:00:00.000Z');
      expect(getRestrictedDayNameES('ABC125', wednesday)).toBe('Miércoles');
    });

    it('returns "Viernes" for plate ending in 9 on Friday', () => {
      const friday = new Date('2026-07-24T12:00:00.000Z');
      expect(getRestrictedDayNameES('ABC129', friday)).toBe('Viernes');
    });

    it('returns null for weekend', () => {
      const saturday = new Date('2026-07-25T12:00:00.000Z');
      const sunday = new Date('2026-07-26T12:00:00.000Z');
      expect(getRestrictedDayNameES('ABC129', saturday)).toBeNull();
      expect(getRestrictedDayNameES('ABC129', sunday)).toBeNull();
    });

    it('returns null for non-restricted day', () => {
      const tuesday = new Date('2026-07-21T12:00:00.000Z');
      // Plate ending in 1 is restricted on Monday, not Tuesday
      expect(getRestrictedDayNameES('ABC121', tuesday)).toBeNull();
    });

    it('returns null for null/empty plate', () => {
      const monday = new Date('2026-07-20T12:00:00.000Z');
      expect(getRestrictedDayNameES(null, monday)).toBeNull();
      expect(getRestrictedDayNameES('', monday)).toBeNull();
    });
  });

  describe('getLastDigit', () => {
    it('returns last digit for valid plate', () => {
      expect(getLastDigit('ABC123')).toBe(3);
      expect(getLastDigit('XYZ990')).toBe(0);
      expect(getLastDigit('A1')).toBe(1);
    });

    it('returns -1 for null/empty/undefined plate', () => {
      expect(getLastDigit(null)).toBe(-1);
      expect(getLastDigit(undefined)).toBe(-1);
      expect(getLastDigit('')).toBe(-1);
    });

    it('returns -1 for plate with non-numeric last character', () => {
      expect(getLastDigit('ABCDEF')).toBe(-1);
    });
  });
});