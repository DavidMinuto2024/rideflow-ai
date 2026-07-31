/**
 * Seeds the 5 E2E test users (R1) into the RideFlow AI Supabase project.
 *
 * Usage (from frontend/):
 *   pnpm seed:test-users
 *
 * Env:
 *   SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY — read from frontend/.env.test.local
 *   when not already present (CI injects them via GitHub Secrets; dotenv never
 *   overrides already-set variables).
 *
 * Behavior (idempotent, R1):
 *   1. Org upsert by slug `inalde-emba` (find, else create).
 *   2. Per user: admin.createUser({ email, password, email_confirm: true });
 *      on duplicate email the existing Auth UID is resolved via listUsers().
 *   3. Upsert `users` row (Auth UID as id) and `organization_members` row.
 *   4. Create/re-link the DRIVER's vehicle ABC-123 (capacity 4, active).
 *   5. Per-user status report; exits non-zero if any user failed.
 *
 * Table/column names match the production schema used by the backend
 * (snake_case): users, organizations, organization_members, vehicles.
 */
import { existsSync } from 'node:fs';
import path from 'node:path';
import { config as loadEnv } from 'dotenv';
import { createClient, SupabaseClient } from '@supabase/supabase-js';
import {
  TEST_ORG_NAME,
  TEST_ORG_SLUG,
  TEST_USERS,
  TEST_VEHICLE,
  findUserByEmail,
  isDuplicateEmailError,
} from './seed-users-data';

const ENV_PATH = path.resolve(process.cwd(), '.env.test.local');
if (existsSync(ENV_PATH)) {
  // override: false — already-set env vars (e.g. CI secrets) always win.
  loadEnv({ path: ENV_PATH, override: false, quiet: true });
}

const SUPABASE_URL = process.env.SUPABASE_URL;
const SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SERVICE_ROLE_KEY) {
  console.error(
    '[seed] Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY. ' +
      'Provide them in the environment or frontend/.env.test.local',
  );
  process.exit(1);
}

// Same admin-client pattern as backend/src/auth/supabase-auth.service.ts.
const admin: SupabaseClient = createClient(SUPABASE_URL, SERVICE_ROLE_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

// ── Organization (Task 2.2) ────────────────────────────────────────────────

async function ensureOrg(): Promise<{ id: string }> {
  const { data: existing, error: findError } = await admin
    .from('organizations')
    .select('id')
    .eq('slug', TEST_ORG_SLUG)
    .maybeSingle();

  if (findError) throw new Error(`organizations lookup failed: ${findError.message}`);
  if (existing) return existing;

  const { data: created, error: insertError } = await admin
    .from('organizations')
    .insert({ id: crypto.randomUUID(), name: TEST_ORG_NAME, slug: TEST_ORG_SLUG })
    .select('id')
    .single();

  if (insertError) throw new Error(`organizations insert failed: ${insertError.message}`);
  return created;
}

// ── Supabase Auth users (Task 2.3) ─────────────────────────────────────────

/** Resolves the existing Auth UID for an email via listUsers() pagination. */
async function findAuthUserIdByEmail(email: string): Promise<string | null> {
  const perPage = 1000;
  let page = 1;

  for (;;) {
    const { data, error } = await admin.auth.admin.listUsers({ page, perPage });
    if (error) throw new Error(`listUsers failed: ${error.message}`);

    const match = findUserByEmail(data.users, email);
    if (match) return match.id;
    if (data.users.length < perPage) return null;
    page += 1;
  }
}

/** Ensures the Auth user exists; returns its UID (create or resolve existing). */
async function ensureAuthUser(email: string, password: string): Promise<string> {
  const { data, error } = await admin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (!error && data.user) return data.user.id;

  if (isDuplicateEmailError(error)) {
    const existingId = await findAuthUserIdByEmail(email);
    if (existingId) return existingId;
    throw new Error(`duplicate email reported but "${email}" not found via listUsers`);
  }

  throw new Error(`createUser failed: ${error?.message ?? 'unknown error'}`);
}

// ── DB rows (Task 2.4) ─────────────────────────────────────────────────────

async function ensureUserRow(uid: string, email: string, name: string): Promise<void> {
  const { error } = await admin.from('users').upsert(
    { id: uid, email, name },
    { onConflict: 'id' },
  );
  if (error) throw new Error(`users upsert failed for ${email}: ${error.message}`);
}

async function ensureMembership(orgId: string, uid: string, role: string): Promise<void> {
  const { error } = await admin.from('organization_members').upsert(
    { id: crypto.randomUUID(), organization_id: orgId, user_id: uid, role },
    { onConflict: 'organization_id,user_id' },
  );
  if (error) throw new Error(`organization_members upsert failed for ${role} ${uid}: ${error.message}`);
}

// ── Vehicle (Task 2.5) ─────────────────────────────────────────────────────

async function ensureVehicle(orgId: string, driverUid: string): Promise<void> {
  const { data: existing, error: findError } = await admin
    .from('vehicles')
    .select('id')
    .eq('organization_id', orgId)
    .eq('plate', TEST_VEHICLE.plate)
    .maybeSingle();

  if (findError) throw new Error(`vehicles lookup failed: ${findError.message}`);

  if (existing) {
    // Re-link / normalize so re-runs converge (idempotent, R1).
    const { error: updateError } = await admin
      .from('vehicles')
      .update({
        driver_id: driverUid,
        capacity: TEST_VEHICLE.capacity,
        is_active: TEST_VEHICLE.isActive,
      })
      .eq('id', existing.id);
    if (updateError) throw new Error(`vehicles update failed: ${updateError.message}`);
    return;
  }

  const { error: insertError } = await admin.from('vehicles').insert({
    id: crypto.randomUUID(),
    plate: TEST_VEHICLE.plate,
    capacity: TEST_VEHICLE.capacity,
    is_active: TEST_VEHICLE.isActive,
    organization_id: orgId,
    driver_id: driverUid,
  });
  if (insertError) throw new Error(`vehicles insert failed: ${insertError.message}`);
}

// ── Entry (Task 2.6) ───────────────────────────────────────────────────────

async function main(): Promise<void> {
  const startedAt = Date.now();
  console.log(`[seed] Ensuring org "${TEST_ORG_SLUG}" ...`);
  const org = await ensureOrg();
  console.log(`[seed] Org ready: ${org.id}`);

  const report: string[] = [];
  let failed = 0;

  for (const user of TEST_USERS) {
    try {
      const uid = await ensureAuthUser(user.email, user.password);
      await ensureUserRow(uid, user.email, user.name);
      await ensureMembership(org.id, uid, user.role);

      let extra = '';
      if (user.hasVehicle) {
        await ensureVehicle(org.id, uid);
        extra = ` + vehicle ${TEST_VEHICLE.plate}`;
      }

      report.push(`  OK  ${user.email} (${user.role}) [${uid}]${extra}`);
      console.log(`[seed] OK  ${user.email} (${user.role})`);
    } catch (err) {
      failed += 1;
      const message = err instanceof Error ? err.message : String(err);
      report.push(`  FAIL ${user.email}: ${message}`);
      console.error(`[seed] FAIL ${user.email}: ${message}`);
    }
  }

  console.log('\n[seed] Status report:');
  console.log(report.join('\n'));
  const seconds = ((Date.now() - startedAt) / 1000).toFixed(1);
  console.log(
    `\n[seed] Done in ${seconds}s — ${TEST_USERS.length - failed}/${TEST_USERS.length} users OK.`,
  );

  process.exitCode = failed > 0 ? 1 : 0;
}

main().catch((err) => {
  console.error('[seed] Fatal:', err instanceof Error ? err.message : err);
  process.exitCode = 1;
});
