/**
 * Pure seeding data + helpers for the E2E test users (R1).
 *
 * Kept free of side effects so the contract is unit-testable:
 * - TEST_USERS / TEST_VEHICLE / TEST_ORG_* define the exact seeded state.
 * - findUserByEmail / isDuplicateEmailError implement the idempotency logic
 *   used by the seed script against the Supabase Admin API.
 */

export type TestRole = 'SUPER_ADMIN' | 'ORG_ADMIN' | 'DRIVER' | 'PASSENGER';

export interface TestUser {
  email: string;
  password: string;
  name: string;
  role: TestRole;
  /** True only for the DRIVER: a vehicle (ABC-123) is created for them. */
  hasVehicle?: boolean;
}

export const TEST_PASSWORD = 'TestRideFlow2026!';
export const TEST_ORG_SLUG = 'inalde-emba';
export const TEST_ORG_NAME = 'INALDE EMBA';
export const TEST_VEHICLE = { plate: 'ABC-123', capacity: 4, isActive: true } as const;

export const TEST_USERS: TestUser[] = [
  { email: 'test-admin@rideflow.ai', password: TEST_PASSWORD, name: 'Test Admin', role: 'ORG_ADMIN' },
  {
    email: 'test-driver@rideflow.ai',
    password: TEST_PASSWORD,
    name: 'Test Driver',
    role: 'DRIVER',
    hasVehicle: true,
  },
  { email: 'test-passenger1@rideflow.ai', password: TEST_PASSWORD, name: 'Test Passenger 1', role: 'PASSENGER' },
  { email: 'test-passenger2@rideflow.ai', password: TEST_PASSWORD, name: 'Test Passenger 2', role: 'PASSENGER' },
  { email: 'test-passenger3@rideflow.ai', password: TEST_PASSWORD, name: 'Test Passenger 3', role: 'PASSENGER' },
];

/** Shape of a Supabase Auth user record as returned by the Admin API. */
export interface AuthUserRecord {
  id: string;
  email?: string;
}

/**
 * Case-insensitive lookup of an auth user by email (R1 idempotency).
 * Returns the record so callers can reuse the UID; `undefined` when absent.
 */
export function findUserByEmail(
  users: AuthUserRecord[],
  email: string,
): AuthUserRecord | undefined {
  const target = email.toLowerCase();
  return users.find((user) => (user.email ?? '').toLowerCase() === target);
}

/**
 * Detects the "email already registered" error returned by
 * supabaseAdmin.auth.admin.createUser() when the user already exists.
 */
export function isDuplicateEmailError(
  error: { status?: number; code?: string; message?: string } | null,
): boolean {
  if (!error) return false;
  if (error.code === 'user_already_exists' || error.code === 'email_exists') return true;
  return (
    error.status === 422 &&
    /already registered|already been registered|another user/i.test(error.message ?? '')
  );
}
