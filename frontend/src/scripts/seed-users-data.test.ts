import { describe, it, expect } from 'vitest';
import {
  TEST_PASSWORD,
  TEST_ORG_NAME,
  TEST_ORG_SLUG,
  TEST_USERS,
  TEST_VEHICLE,
  findUserByEmail,
  isDuplicateEmailError,
} from '../../scripts/seed-users-data';

describe('TEST_USERS (R1 seeding contract)', () => {
  it('defines exactly the 5 spec users with unique @rideflow.ai emails', () => {
    expect(TEST_USERS).toHaveLength(5);
    const emails = TEST_USERS.map((u) => u.email);
    expect(new Set(emails).size).toBe(5);
    for (const email of emails) {
      expect(email).toMatch(/@rideflow\.ai$/);
    }
  });

  it('uses the shared test password for every user', () => {
    for (const user of TEST_USERS) {
      expect(user.password).toBe(TEST_PASSWORD);
    }
  });

  it('matches the spec roles: ORG_ADMIN, DRIVER with vehicle, and 3 PASSENGERs', () => {
    expect(TEST_USERS.find((u) => u.email === 'test-admin@rideflow.ai')?.role).toBe('ORG_ADMIN');
    expect(TEST_USERS.find((u) => u.email === 'test-driver@rideflow.ai')).toMatchObject({
      role: 'DRIVER',
      hasVehicle: true,
    });
    const passengers = TEST_USERS.filter((u) => u.role === 'PASSENGER');
    expect(passengers).toHaveLength(3);
  });

  it('defines the driver vehicle per spec', () => {
    expect(TEST_VEHICLE).toEqual({ plate: 'ABC-123', capacity: 4, isActive: true });
  });

  it('uses the inalde-emba org slug', () => {
    expect(TEST_ORG_SLUG).toBe('inalde-emba');
    expect(TEST_ORG_NAME.length).toBeGreaterThan(0);
  });
});

describe('findUserByEmail', () => {
  const users = [
    { id: 'uid-1', email: 'test-driver@rideflow.ai' },
    { id: 'uid-2', email: 'test-passenger1@rideflow.ai' },
  ];

  it('returns the matching auth user for an existing email', () => {
    expect(findUserByEmail(users, 'test-driver@rideflow.ai')?.id).toBe('uid-1');
  });

  it('matches case-insensitively', () => {
    expect(findUserByEmail(users, 'TEST-PASSENGER1@rideflow.ai')?.id).toBe('uid-2');
  });

  it('returns undefined when the email does not exist', () => {
    expect(findUserByEmail(users, 'nobody@rideflow.ai')).toBeUndefined();
  });

  it('returns undefined for an empty user list', () => {
    expect(findUserByEmail([], 'test-admin@rideflow.ai')).toBeUndefined();
  });
});

describe('isDuplicateEmailError', () => {
  it('detects the user_already_exists code from the Supabase admin API', () => {
    expect(
      isDuplicateEmailError({
        status: 422,
        code: 'user_already_exists',
        message: 'User already registered',
      }),
    ).toBe(true);
  });

  it('detects the legacy duplicate shape (422 + message)', () => {
    expect(isDuplicateEmailError({ status: 422, message: 'User already registered' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isDuplicateEmailError({ status: 400, message: 'invalid email' })).toBe(false);
    expect(isDuplicateEmailError(null)).toBe(false);
  });
});
