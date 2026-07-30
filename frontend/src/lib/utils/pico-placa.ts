/**
 * Pico y Placa client-side utility
 * Exact replica of EventVehiclesService.checkPicoYPlaca() from backend
 * Bogotá Pico y Placa rules (Monday-Friday):
 *   Monday: plates ending in 1,2 → restricted
 *   Tuesday: 3,4 → restricted
 *   Wednesday: 5,6 → restricted
 *   Thursday: 7,8 → restricted
 *   Friday: 9,0 → restricted
 *   Weekend: no restriction
 */

/** Day names in English (matching getDay() index) */
export const DAY_NAMES_EN = [
  'Sun',
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
] as const;

/** Day names in Spanish for UI display */
export const DAY_NAMES_ES: Record<'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri', string> = {
  Mon: 'Lunes',
  Tue: 'Martes',
  Wed: 'Miércoles',
  Thu: 'Jueves',
  Fri: 'Viernes',
} as const;

/** Restricted digits by day of week (0=Sunday, 6=Saturday) */
const RESTRICTED_DIGITS: Record<number, number[]> = {
  1: [1, 2], // Monday
  2: [3, 4], // Tuesday
  3: [5, 6], // Wednesday
  4: [7, 8], // Thursday
  5: [9, 0], // Friday
};

/**
 * Check if a vehicle has Pico y Placa restriction on a given date.
 * Exact replica of backend EventVehiclesService.checkPicoYPlaca()
 *
 * @param plate - Vehicle license plate (e.g., "ABC123")
 * @param date - Date to check restriction for
 * @returns true if restricted, false otherwise
 */
export function checkPicoYPlacaClient(plate: string | null | undefined, date: Date): boolean {
  if (!plate || plate.trim().length === 0) return false;

  const trimmedPlate = plate.trim();
  const lastDigit = parseInt(trimmedPlate.slice(-1), 10);
  if (isNaN(lastDigit)) return false;

  // Evaluate day and time strictly in Bogotá timezone to avoid browser-locale drift
  const bogotaParts = new Intl.DateTimeFormat('en-US', {
    timeZone: 'America/Bogota',
    weekday: 'short',
    hour: 'numeric',
    minute: 'numeric',
    hour12: false,
  }).formatToParts(date);

  const weekdayStr = bogotaParts.find((p) => p.type === 'weekday')?.value ?? '';
  const hourStr = bogotaParts.find((p) => p.type === 'hour')?.value ?? '0';
  const minuteStr = bogotaParts.find((p) => p.type === 'minute')?.value ?? '0';

  // Map English short weekday to getDay() equivalent (0=Sun ... 6=Sat)
  const WEEKDAY_MAP: Record<string, number> = {
    Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6,
  };
  const dayOfWeek = WEEKDAY_MAP[weekdayStr] ?? -1;
  if (dayOfWeek === 0 || dayOfWeek === 6) return false; // Weekend: no restriction

  const restrictedDigits = RESTRICTED_DIGITS[dayOfWeek] ?? [];
  if (!restrictedDigits.includes(lastDigit)) return false;

  const hours = parseInt(hourStr, 10);
  const minutes = parseInt(minuteStr, 10);
  const timeInMinutes = hours * 60 + minutes;

  // 7:00 AM (420) to 9:00 AM exclusive (< 540)
  const isMorning = timeInMinutes >= 420 && timeInMinutes < 540;
  // 5:00 PM (1020) to 8:00 PM exclusive (< 1200)
  const isEvening = timeInMinutes >= 1020 && timeInMinutes < 1200;

  return isMorning || isEvening;
}

/**
 * Get the restricted days of week for a given plate.
 * Returns array of day codes ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')
 * when the plate is restricted.
 *
 * @param plate - Vehicle license plate
 * @returns Array of restricted day codes
 */
export function getRestrictedDays(
  plate: string | null | undefined,
): ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] {
  if (!plate || plate.trim().length === 0) return [];

  const trimmedPlate = plate.trim();
  const lastDigit = parseInt(trimmedPlate.slice(-1), 10);
  if (isNaN(lastDigit)) return [];

  const restrictedDays: ('Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri')[] = [];

  // Monday (1) -> digits 1,2
  if ([1, 2].includes(lastDigit)) restrictedDays.push('Mon');
  // Tuesday (2) -> digits 3,4
  if ([3, 4].includes(lastDigit)) restrictedDays.push('Tue');
  // Wednesday (3) -> digits 5,6
  if ([5, 6].includes(lastDigit)) restrictedDays.push('Wed');
  // Thursday (4) -> digits 7,8
  if ([7, 8].includes(lastDigit)) restrictedDays.push('Thu');
  // Friday (5) -> digits 9,0
  if ([9, 0].includes(lastDigit)) restrictedDays.push('Fri');

  return restrictedDays;
}

/**
 * Get the restricted day name in Spanish for a specific date and plate.
 * Returns the day name if restricted on that date, null otherwise.
 *
 * @param plate - Vehicle license plate
 * @param date - Date to check
 * @returns Spanish day name if restricted, null otherwise
 */
export function getRestrictedDayNameES(plate: string | null | undefined, date: Date): string | null {
  if (!plate || plate.trim().length === 0) return null;

  const trimmedPlate = plate.trim();
  const lastDigit = parseInt(trimmedPlate.slice(-1), 10);
  if (isNaN(lastDigit)) return null;

  const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
  if (dayOfWeek === 0 || dayOfWeek === 6) return null;

  const dayCodes: Record<number, 'Mon' | 'Tue' | 'Wed' | 'Thu' | 'Fri'> = {
    1: 'Mon',
    2: 'Tue',
    3: 'Wed',
    4: 'Thu',
    5: 'Fri',
  };

  const dayCode = dayCodes[dayOfWeek];
  if (!dayCode) return null;

  const restrictedDays = getRestrictedDays(plate);
  if (!restrictedDays.includes(dayCode)) return null;

  return DAY_NAMES_ES[dayCode];
}

/**
 * Get the last digit of a plate.
 * Returns -1 if plate is invalid or empty.
 */
export function getLastDigit(plate: string | null | undefined): number {
  if (!plate || plate.trim().length === 0) return -1;
  const digit = parseInt(plate.trim().slice(-1), 10);
  return isNaN(digit) ? -1 : digit;
}