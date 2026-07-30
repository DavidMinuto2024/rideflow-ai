/**
 * RideFlow AI — End-to-End Integration Test
 *
 * Simulates the complete carpooling flow with 4 real users:
 *   - admin   → Creates org + event (becomes ORG_ADMIN)
 *   - driver  → Registers vehicle, joins via invite (DRIVER)
 *   - pax1    → Requests a ride, gets assigned (PASSENGER)
 *   - pax2    → Requests a ride, then self-cancels (PASSENGER)
 *
 * Steps:
 *  1.  Signup all 4 users
 *  2.  Admin creates organization
 *  3.  Admin creates event with arrivalTime + coordinates
 *  4.  Admin invites driver
 *  5.  Driver registers vehicle + joins event via invite token
 *  6.  Admin invites both passengers
 *  7.  Passengers join event via invite tokens
 *  8.  Passengers submit ride requests
 *  9.  Admin checks driver suggestions (ranked by proximity)
 * 10.  Admin direct-assigns both passengers to driver
 * 11.  Optimize trip pickup times
 * 12.  Driver checks their dashboard data
 * 13.  Passengers check their status (pax1 should be ACCEPTED)
 * 14.  Pax2 self-cancels their request
 * 15.  All users check notifications
 * 16.  Admin panel stats + user list
 *
 * Usage:
 *   node scripts/e2e-test.mjs
 */

const BASE = 'http://localhost:4000/api';
const TS = Date.now();

// Supabase admin (for creating test users without email rate limits)
const SUPABASE_URL = 'https://rkslwlpzvtdekeocsmtd.supabase.co';
const SUPABASE_SERVICE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InJrc2x3bHB6dnRkZWtlb2NzbXRkIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc4NDc4MTcyNSwiZXhwIjoyMTAwMzU3NzI1fQ.s_C7J8wE7Y4ZXlKDfzfmbZYpVzhfXJXZCY-uEg0SSCo';

// ── Test users ─────────────────────────────────────────────────────────────
const USERS = {
  admin: { email: `rfadmin${TS}@mailnull.com`, password: 'RideFlow2024!', name: 'Ana Admin' },
  driver: { email: `rfdriver${TS}@mailnull.com`, password: 'RideFlow2024!', name: 'Diego Driver' },
  pax1: { email: `rfpax1${TS}@mailnull.com`, password: 'RideFlow2024!', name: 'Pedro Pasajero' },
  pax2: { email: `rfpax2${TS}@mailnull.com`, password: 'RideFlow2024!', name: 'Laura Pasajera' },
};

// Admin-creates user in Supabase Auth (bypasses email rate limits)
async function createSupabaseUser(email, password, name) {
  // Use Supabase Admin API to create user without email confirmation
  const r = await fetch(`${SUPABASE_URL}/auth/v1/admin/users`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${SUPABASE_SERVICE_KEY}`,
      'apikey': SUPABASE_SERVICE_KEY,
    },
    body: JSON.stringify({
      email,
      password,
      email_confirm: true,  // skip email confirmation
      user_metadata: { name },
    }),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}

// Login via backend to get JWT token
async function loginUser(email, password) {
  const r = await fetch(`${BASE}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });
  const data = await r.json();
  return { ok: r.ok, status: r.status, data };
}


// ── State ──────────────────────────────────────────────────────────────────
const S = {
  tokens: {}, users: {},
  orgId: null, eventId: null,
  inviteToken: null,  // single token from event (used by all joiners)
  vehicleId: null, tripId: null,
  req1Id: null, req2Id: null,
};

// ── HTTP helpers ───────────────────────────────────────────────────────────
async function http(method, path, body, token) {
  const headers = { 'Content-Type': 'application/json' };
  if (token) headers['Authorization'] = `Bearer ${token}`;
  const res = await fetch(`${BASE}${path}`, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  });
  let data;
  try { data = await res.json(); } catch { data = { _raw: await res.text().catch(() => '') }; }
  return { status: res.status, ok: res.ok, data };
}
const GET = (p, t) => http('GET', p, null, t);
const POST = (p, b, t) => http('POST', p, b, t);
const PATCH = (p, b, t) => http('PATCH', p, b, t);

// ── Assertions ─────────────────────────────────────────────────────────────
let pass = 0, fail = 0;
const failures = [];

function assert(label, ok, detail = '') {
  if (ok) {
    console.log(`  ✅ ${label}`);
    pass++;
  } else {
    console.error(`  ❌ ${label}${detail ? `  ← ${detail}` : ''}`);
    fail++;
    failures.push({ label, detail });
  }
}

function section(n, title) {
  console.log(`\n${'═'.repeat(64)}`);
  console.log(`  STEP ${n}: ${title}`);
  console.log('═'.repeat(64));
}

// ── Steps ──────────────────────────────────────────────────────────────────

async function s1_signup() {
  section(1, 'Signup all 4 users');
  for (const [role, u] of Object.entries(USERS)) {
    const r = await POST('/auth/signup', { email: u.email, password: u.password, name: u.name });
    assert(`signup:${role}`, r.ok && r.data.access_token,
      `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 150)}`);
    if (r.ok) { S.tokens[role] = r.data.access_token; S.users[role] = r.data.user; }
  }
}

async function s2_create_org() {
  section(2, 'Admin creates organization');
  const r = await POST('/organizations',
    { name: `E2E Org ${TS}`, description: 'Automated E2E test org' },
    S.tokens.admin);
  assert('create:org', r.ok && r.data.id, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.ok) { S.orgId = r.data.id; console.log(`     orgId = ${S.orgId}`); }
}

async function s3_create_event() {
  section(3, 'Admin creates event with arrivalTime');
  const base = Date.now() + 2 * 86_400_000; // 2 days from now
  const date = new Date(base).toISOString();
  const arrivalTime = new Date(base + 3_600_000).toISOString(); // +1h
  const r = await POST(`/organizations/${S.orgId}/events`, {
    title: `Carpooling E2E ${TS}`,
    description: 'Full flow integration test',
    date,
    arrivalTime,
    origin: 'Usaquén, Bogotá',
    destination: 'Centro Empresarial Bogotá',
    originLat: 4.6951, originLng: -74.0462,
    destLat: 4.6097,  destLng: -74.0817,
    capacity: 10,
  }, S.tokens.admin);
  assert('create:event', r.ok && r.data.id, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 300)}`);
  if (r.ok) {
    S.eventId = r.data.id;
    S.inviteToken = r.data.invite_token;
    console.log(`     eventId     = ${S.eventId}`);
    console.log(`     inviteToken = ${S.inviteToken}`);
    console.log(`     arrivalTime = ${arrivalTime}`);
  }
}

async function s4_admin_creates_vehicle() {
  section(4, 'Admin creates vehicle for the organization');
  // Vehicle creation requires ORG_ADMIN role → admin creates it
  const r = await POST(`/organizations/${S.orgId}/vehicles`, {
    model: 'Chevrolet Spark GT',
    plate: `TEST${TS.toString().slice(-4)}`,
    capacity: 4,
    color: 'Blue',
  }, S.tokens.admin);
  assert('create:vehicle', r.ok && r.data.id, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.ok) { S.vehicleId = r.data.id; console.log(`     vehicleId = ${S.vehicleId}`); }
}

async function s5_driver_join() {
  section(5, 'Driver joins event via invite token (QR flow)');
  if (!S.inviteToken) { console.log('     ⚠ No inviteToken from event, skipping'); return; }
  if (!S.vehicleId) { console.log('     ⚠ No vehicleId, skipping'); return; }

  const r = await POST(`/invite/${S.inviteToken}/join`, {
    role: 'driver',
    vehicleId: S.vehicleId,
    startLat: 4.6951,
    startLng: -74.0462,
    startLocation: 'Usaquén, Bogotá',
  }, S.tokens.driver);
  assert('join:driver', r.ok, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.ok) console.log(`     Driver joined event → ${JSON.stringify(r.data).slice(0, 100)}`);
}

async function s6_passengers_join() {
  section(6, 'Passengers join event via invite token');
  if (!S.inviteToken) { console.log('     ⚠ No inviteToken, skipping'); return; }

  const joins = [
    { key: 'pax1', lat: 4.7109, lng: -74.0721, address: 'Calle 127, Bogotá' },
    { key: 'pax2', lat: 4.6782, lng: -74.0553, address: 'Calle 80, Bogotá' },
  ];
  for (const { key, lat, lng, address } of joins) {
    const r = await POST(`/invite/${S.inviteToken}/join`, {
      role: 'passenger',
      pickupLat: lat, pickupLng: lng, pickupAddress: address,
    }, S.tokens[key]);
    assert(`join:${key}`, r.ok, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
  }
}

async function s7_ride_requests() {
  section(7, 'Passengers submit ride requests');
  const requests = [
    { key: 'pax1', reqKey: 'req1Id', lat: 4.7109, lng: -74.0721, addr: 'Calle 127, Bogotá' },
    { key: 'pax2', reqKey: 'req2Id', lat: 4.6782, lng: -74.0553, addr: 'Calle 80, Bogotá' },
  ];
  for (const { key, reqKey, lat, lng, addr } of requests) {
    const r = await POST(`/events/${S.eventId}/requests`, {
      pickupLat: lat, pickupLng: lng, pickupAddress: addr,
    }, S.tokens[key]);
    assert(`request:${key}`, r.ok && r.data.id, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
    if (r.ok) { S[reqKey] = r.data.id; console.log(`     ${reqKey} = ${r.data.id}`); }
  }
}


async function s8_suggestions() {
  section(8, 'Admin views driver suggestions (ranked by proximity)');
  const r = await GET(`/events/${S.eventId}/suggestions`, S.tokens.admin);
  assert('suggestions:loaded', r.ok && Array.isArray(r.data),
    `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.ok && Array.isArray(r.data)) {
    r.data.forEach((s, i) =>
      console.log(`     Pax ${i+1}: ${s.passenger?.name} | ${s.rankedDrivers?.length ?? 0} driver(s) ranked`));
  }
}

async function s9_direct_assign() {
  section(9, 'Admin direct-assigns passengers to driver');
  const driverId = S.users.driver?.id;
  if (!driverId) { console.log('     ⚠ No driverId, skipping'); return; }

  for (const [paxKey, label] of [['pax1', 'pax1'], ['pax2', 'pax2']]) {
    const passengerId = S.users[paxKey]?.id;
    if (!passengerId) { console.log(`     ⚠ No ${paxKey} userId`); continue; }
    const r = await POST(`/events/${S.eventId}/direct-assign`,
      { passengerId, driverId },
      S.tokens.admin);
    assert(`direct-assign:${label}`, r.ok && r.data.id, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 300)}`);
    if (r.ok && !S.tripId) { S.tripId = r.data.id; console.log(`     tripId = ${S.tripId}`); }
  }
}

async function s10_optimize() {
  section(10, 'Optimize trip pickup times');
  const r = await POST(`/events/${S.eventId}/optimize-times`, {}, S.tokens.admin);
  assert('optimize:trips', r.ok && r.data.trips, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 300)}`);
  if (r.ok && r.data.trips) {
    r.data.trips.forEach(t =>
      console.log(`     Trip ${t.tripId}: departs ${t.estimatedDepartureTime} | ${t.pickupTimes?.length ?? 0} pickups`));
  }
}

async function s11_driver_dashboard() {
  section(11, 'Driver checks dashboard data');
  const session = await GET('/auth/session', S.tokens.driver);
  assert('driver:session', session.ok && session.data.memberships, `HTTP ${session.status}`);

  const events = await GET(`/organizations/${S.orgId}/events`, S.tokens.driver);
  assert('driver:events', events.ok, `HTTP ${events.status}`);

  const trips = await GET(`/events/${S.eventId}/trips`, S.tokens.driver);
  assert('driver:trips', trips.ok, `HTTP ${trips.status}`);
  if (trips.ok) console.log(`     ${Array.isArray(trips.data) ? trips.data.length : 0} trip(s) visible to driver`);
}

async function s12_passenger_status() {
  section(12, 'Passengers verify assignment status');
  const reqs = await GET(`/events/${S.eventId}/requests`, S.tokens.pax1);
  assert('pax1:can-view-requests', reqs.ok, `HTTP ${reqs.status}`);
  if (reqs.ok && Array.isArray(reqs.data)) {
    const myReq = reqs.data.find(r => r.passenger_id === S.users.pax1?.id);
    console.log(`     pax1 request status = ${myReq?.status}`);
    assert('pax1:request-is-accepted', myReq?.status === 'ACCEPTED', `actual = ${myReq?.status}`);
  }
  if (S.tripId) {
    const trip = await GET(`/events/${S.eventId}/trips/${S.tripId}`, S.tokens.pax1);
    assert('pax1:can-view-trip', trip.ok, `HTTP ${trip.status}`);
    if (trip.ok) console.log(`     Trip driver: ${trip.data?.driver?.name ?? '?'}`);
  }
}

async function s13_pax2_cancel() {
  section(13, 'Passenger 2 self-cancels their request');
  if (!S.req2Id) { console.log('     ⚠ No req2Id, skipping'); return; }
  const r = await PATCH(`/requests/${S.req2Id}`, { status: 'CANCELLED' }, S.tokens.pax2);
  assert('pax2:cancel-own-request', r.ok, `HTTP ${r.status} → ${JSON.stringify(r.data).slice(0, 200)}`);
  if (r.ok) {
    // Verify the status changed
    const check = await GET(`/events/${S.eventId}/requests`, S.tokens.admin);
    if (check.ok && Array.isArray(check.data)) {
      const req = check.data.find(x => x.id === S.req2Id);
      assert('pax2:status-is-cancelled', req?.status === 'CANCELLED', `actual = ${req?.status}`);
    }
  }
}

async function s14_notifications() {
  section(14, 'Notifications received by all users');
  for (const role of ['admin', 'driver', 'pax1', 'pax2']) {
    const r = await GET('/notifications', S.tokens[role]);
    assert(`notifications:${role}`, r.ok, `HTTP ${r.status}`);
    if (r.ok) console.log(`     ${role}: ${Array.isArray(r.data) ? r.data.length : '?'} notification(s)`);
  }
}

async function s15_admin_panel() {
  section(15, 'Admin panel — stats and user list');
  const stats = await GET('/admin/stats', S.tokens.admin);
  assert('admin:stats', stats.ok, `HTTP ${stats.status} → ${JSON.stringify(stats.data).slice(0, 200)}`);
  if (stats.ok) console.log(`     Stats: ${JSON.stringify(stats.data)}`);

  const users = await GET('/admin/users', S.tokens.admin);
  assert('admin:users', users.ok, `HTTP ${users.status}`);
  if (users.ok) console.log(`     Total users: ${Array.isArray(users.data) ? users.data.length : '?'}`);
}

// ── Main ───────────────────────────────────────────────────────────────────

async function main() {
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║        RideFlow AI — End-to-End Integration Test            ║');
  console.log('║        4 users · 16 steps · Full carpooling flow            ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  Run ID : ${TS}`);
  console.log(`  Backend: ${BASE}`);

  try {
    await s1_signup();
    await s2_create_org();
    await s3_create_event();
    await s4_admin_creates_vehicle();
    await s5_driver_join();
    await s6_passengers_join();
    await s7_ride_requests();
    await s8_suggestions();
    await s9_direct_assign();
    await s10_optimize();
    await s11_driver_dashboard();
    await s12_passenger_status();
    await s13_pax2_cancel();
    await s14_notifications();
    await s15_admin_panel();
  } catch (err) {
    console.error('\n💥 Unhandled error:', err);
    fail++;
  }

  // ── Summary ──────────────────────────────────────────────────────────
  console.log('\n');
  console.log('╔══════════════════════════════════════════════════════════════╗');
  console.log('║                       TEST SUMMARY                          ║');
  console.log('╚══════════════════════════════════════════════════════════════╝');
  console.log(`\n  ✅ Passed : ${pass}`);
  console.log(`  ❌ Failed : ${fail}`);
  console.log(`  Total    : ${pass + fail}`);

  if (failures.length > 0) {
    console.log('\n  ── Failed assertions ──────────────────────────────────────');
    failures.forEach(f => console.error(`  ❌ ${f.label}${f.detail ? `\n       ${f.detail}` : ''}`));
  }

  console.log('\n  ── Final State ────────────────────────────────────────────');
  console.log(`  orgId     : ${S.orgId}`);
  console.log(`  eventId   : ${S.eventId}`);
  console.log(`  vehicleId : ${S.vehicleId}`);
  console.log(`  tripId    : ${S.tripId}`);
  console.log(`  req1Id    : ${S.req1Id}`);
  console.log(`  req2Id    : ${S.req2Id}`);

  if (fail === 0) {
    console.log('\n  🎉 ALL TESTS PASSED — Carpooling flow is fully operational!\n');
  } else {
    console.log('\n  🔧 Some assertions failed — review output above.\n');
    process.exit(1);
  }
}

main();
