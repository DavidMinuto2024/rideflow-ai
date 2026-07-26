// ═══════════════════════════════════════════════════════════════
// RideFlow AI — Database Seed
//
// Seeds: INALDE EMBA organization, default EMBA Clase event,
//        34 users with roles/vehicles from carpool.html data.
//
// Run: npx prisma db seed
// ═══════════════════════════════════════════════════════════════

import { PrismaClient, Role, EventStatus } from '@prisma/client';

const prisma = new PrismaClient();

// ── Zone definitions (from carpool.html ZONES) ────────────────
const ZONES: Record<string, { label: string }> = {
  norte:  { label: 'Cedritos–Contador' },
  chico:  { label: 'Chicó–Rosales–Sta. Bárbara' },
  colina: { label: 'Colina–Autopista Norte' },
  suba:   { label: 'Suba–Guaymaral' },
  sabana: { label: 'Chía–Cajicá' },
  calera: { label: 'La Calera' },
  centro: { label: 'Centro–Occidente' },
};

// ── Raw people data (from carpool.html PEOPLE array) ─────────
interface RawPerson {
  n: string;     // name
  z: string;     // zone key
  lat: number;
  lng: number;
  rol: 'conductor' | 'busca' | 'ambos';
  lugar: string; // place
  dias: string;  // days
  cupos: number | null;
  placa: string | null;
  nota: string;
}

const PEOPLE: RawPerson[] = [
  { n: 'Ricardo Andrés Barreto', z: 'chico', lat: 4.669, lng: -74.056, rol: 'ambos', lugar: 'Chicó Navarra', dias: 'Días pares y sábados', cupos: null, placa: null, nota: 'Sin carro el 31-jul (día 1 de clase) — necesita cupo ese día' },
  { n: 'Carolina Ruiz', z: 'chico', lat: 4.6685, lng: -74.057, rol: 'ambos', lugar: 'Chicó Navarra / 105 con 19A', dias: 'Días pares y sábados', cupos: null, placa: null, nota: 'Sin carro el 31-jul — coordinó con Verónica' },
  { n: 'Heli', z: 'sabana', lat: 4.860, lng: -74.043, rol: 'conductor', lugar: 'Chía', dias: 'Ofrece llevar si alguien no tiene carro', cupos: null, placa: null, nota: '' },
  { n: 'Maria Andrea Nader H.', z: 'chico', lat: 4.672, lng: -74.053, rol: 'conductor', lugar: 'Chicó Norte II', dias: 'Todos los días', cupos: null, placa: null, nota: '' },
  { n: 'Andrés Holguín', z: 'norte', lat: 4.727, lng: -74.039, rol: 'conductor', lugar: 'Cedritos', dias: '—', cupos: null, placa: '6', nota: '' },
  { n: 'Lucas Congote', z: 'chico', lat: 4.666, lng: -74.054, rol: 'conductor', lugar: 'Chicó Reservado', dias: 'Todos los días (viernes desde 127 con 53)', cupos: null, placa: null, nota: '' },
  { n: 'Diana Moreno', z: 'centro', lat: 4.678, lng: -74.081, rol: 'conductor', lugar: 'La Floresta', dias: 'Todos los días', cupos: null, placa: null, nota: '' },
  { n: 'Verónica', z: 'chico', lat: 4.691, lng: -74.041, rol: 'ambos', lugar: 'Calle 119 con 19', dias: 'Placa impar', cupos: null, placa: 'impar', nota: 'El 31-jul sí tiene carro disponible' },
  { n: 'Diana Cárdenas', z: 'colina', lat: 4.729, lng: -74.057, rol: 'conductor', lugar: 'Colina / 182 con Autopista', dias: 'Todos los días', cupos: null, placa: null, nota: '31-jul sale desde Colina; el resto de viernes desde 182 con Autopista' },
  { n: 'Felipe Gast', z: 'norte', lat: 4.727, lng: -74.039, rol: 'conductor', lugar: 'Cedritos', dias: '—', cupos: null, placa: '1', nota: 'Sale por la séptima desde la 140' },
  { n: 'Felipe', z: 'colina', lat: 4.729, lng: -74.058, rol: 'conductor', lugar: 'Colina', dias: 'Viernes', cupos: 3, placa: 'Híbrido (sin pico y placa)', nota: '' },
  { n: 'Caro Ortiz', z: 'sabana', lat: 4.859, lng: -74.045, rol: 'ambos', lugar: 'Chía', dias: 'Cuando tiene carro disponible', cupos: null, placa: null, nota: 'Cuando no tiene carro, busca que la acerquen' },
  { n: 'Sebastian Baena', z: 'norte', lat: 4.716, lng: -74.035, rol: 'conductor', lugar: 'Calle 134', dias: 'Todos los días', cupos: null, placa: null, nota: '' },
  { n: 'Jaime Gacharná Madrigal', z: 'colina', lat: 4.686, lng: -74.057, rol: 'conductor', lugar: 'Calle 80 (Pte. Guadua) / Colina sábados', dias: 'Viernes y sábados', cupos: 1, placa: null, nota: 'Viernes 1 cupo (va en Twizy); sábados desde Colina (Arturo Calle) 4 cupos' },
  { n: 'Linares', z: 'suba', lat: 4.770, lng: -74.093, rol: 'conductor', lugar: 'Suba (vía Guaymaral) / vive en Cajicá', dias: 'Días pares', cupos: 2, placa: null, nota: '' },
  { n: 'Orlando Martínez', z: 'sabana', lat: 4.919, lng: -74.026, rol: 'ambos', lugar: 'Cajicá', dias: '—', cupos: null, placa: null, nota: 'A la orden si alguien necesita' },
  { n: 'Germán David Escobar', z: 'calera', lat: 4.720, lng: -73.969, rol: 'busca', lugar: 'La Calera', dias: '—', cupos: null, placa: null, nota: 'Buscaba compañero de zona; ya coordinó con John Gabriel y Rau1' },
  { n: 'Cristina Rodríguez', z: 'chico', lat: 4.687, lng: -74.040, rol: 'conductor', lugar: 'Rosales / 105 con 19A', dias: 'Todos los días', cupos: 3, placa: null, nota: '' },
  { n: 'German Narváez', z: 'centro', lat: 4.647, lng: -74.093, rol: 'conductor', lugar: 'Calle 26 con 30', dias: '—', cupos: 2, placa: '4', nota: '' },
  { n: 'Yesid Santamaría', z: 'chico', lat: 4.675, lng: -74.045, rol: 'conductor', lugar: 'Santa Bárbara', dias: 'Todos los días', cupos: null, placa: null, nota: '' },
  { n: 'Rau1', z: 'calera', lat: 4.718, lng: -73.972, rol: 'busca', lugar: 'Cerca a La Calera', dias: 'Placa impar', cupos: null, placa: 'impar', nota: 'Coordinó con Germán David por cercanía' },
  { n: 'Stefania P.', z: 'norte', lat: 4.716, lng: -74.035, rol: 'conductor', lugar: 'Calle 134 con Cra 11 (Cedritos–Contador)', dias: 'Todos los días', cupos: null, placa: null, nota: '' },
  { n: 'Cristian Dueñas', z: 'norte', lat: 4.701, lng: -74.033, rol: 'conductor', lugar: '127 con Séptima', dias: 'Placa impar', cupos: null, placa: 'impar', nota: '' },
  { n: 'Edgar Martínez', z: 'centro', lat: 4.702, lng: -74.147, rol: 'conductor', lugar: 'Aeropuerto El Dorado (vie) / Quinta Paredes (sáb)', dias: 'Viernes y sábados', cupos: null, placa: 'Híbrido (sin pico y placa)', nota: '' },
  { n: 'Erika', z: 'colina', lat: 4.729, lng: -74.057, rol: 'busca', lugar: 'Colina', dias: 'Un día puntual sin carro', cupos: null, placa: null, nota: 'Le pidió cupo a Diana Cárdenas' },
  { n: 'Paula Cabas', z: 'norte', lat: 4.707, lng: -74.033, rol: 'conductor', lugar: 'Torre Pacific 110 con 9na (vie) / Quirinal (sáb)', dias: 'Viernes y sábados', cupos: null, placa: 'Híbrido (sin pico y placa)', nota: '' },
  { n: 'Daniel Ojeda', z: 'norte', lat: 4.701, lng: -74.033, rol: 'conductor', lugar: '127 con Séptima', dias: 'Turna Bogotá / Chía', cupos: null, placa: '0', nota: '' },
  { n: 'Juan Garcés', z: 'norte', lat: 4.735, lng: -74.030, rol: 'conductor', lugar: '7ma con 146', dias: '—', cupos: null, placa: '2', nota: '' },
  { n: 'Silvia Aristizábal', z: 'chico', lat: 4.675, lng: -74.045, rol: 'conductor', lugar: 'Santa Bárbara', dias: 'Todos los días', cupos: null, placa: null, nota: '' },
  { n: 'John Gabriel Guerrero B.', z: 'calera', lat: 4.719, lng: -73.970, rol: 'conductor', lugar: 'La Calera', dias: '—', cupos: null, placa: null, nota: 'Ofreció rotarse con Germán David' },
  { n: 'Julia María', z: 'colina', lat: 4.7295, lng: -74.0575, rol: 'conductor', lugar: 'Cerca ed. Arturo Calle (Colina)', dias: '—', cupos: null, placa: null, nota: 'Propuso rotarse con el grupo de Colina' },
  { n: 'David Eduardo', z: 'norte', lat: 4.741, lng: -74.033, rol: 'conductor', lugar: 'Calle 138 con 11', dias: 'Días pares', cupos: null, placa: null, nota: 'Zona Cedritos — varios compañeros cerca' },
  { n: 'Olga Santamaría Aguilera', z: 'chico', lat: 4.677, lng: -74.050, rol: 'conductor', lugar: 'Calle 93', dias: 'Placa impar', cupos: null, placa: 'impar', nota: '' },
];

// ── Helper: create email from name ──────────────────────────
function emailFromName(name: string): string {
  return name
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '.')
    .replace(/^\.|\.$/g, '')
    .replace(/\.+/g, '.')
    .concat('@rideflow.ai');
}

// ── Helper: determine user role ─────────────────────────────
function mapRole(rol: RawPerson['rol']): Role {
  switch (rol) {
    case 'conductor':
      return Role.DRIVER;
    case 'ambos':
      return Role.DRIVER; // primary role: driver (can also be passenger)
    case 'busca':
      return Role.PASSENGER;
    default:
      return Role.PASSENGER;
  }
}

// ── Helper: should this person have a vehicle? ──────────────
function hasVehicle(p: RawPerson): boolean {
  return (p.rol === 'conductor' || p.rol === 'ambos');
}

// ── Main seed ───────────────────────────────────────────────
async function main() {
  console.log('🌱 Seeding RideFlow AI database...\n');

  // Clean existing data in dependency order
  await prisma.passengerAssignment.deleteMany();
  await prisma.rideRequest.deleteMany();
  await prisma.trip.deleteMany();
  await prisma.event.deleteMany();
  await prisma.vehicle.deleteMany();
  await prisma.organizationMember.deleteMany();
  await prisma.user.deleteMany();
  await prisma.organization.deleteMany();

  // ── 1. Create Organization ──────────────────────────────
  const org = await prisma.organization.create({
    data: {
      name: 'INALDE EMBA',
      slug: 'inalde-emba',
    },
  });
  console.log(`  ✓ Organization: ${org.name} (${org.slug})`);

  // ── 2. Create Users + Memberships + Vehicles ────────────
  const createdUsers: Array<{ id: string; name: string; raw: RawPerson }> = [];

  for (const p of PEOPLE) {
    const role = mapRole(p.rol);
    const email = emailFromName(p.n);

    const user = await prisma.user.create({
      data: {
        email,
        name: p.n,
        phone: null,
        avatar: null,
      },
    });

    // Create membership
    await prisma.organizationMember.create({
      data: {
        userId: user.id,
        organizationId: org.id,
        role,
      },
    });

    createdUsers.push({ id: user.id, name: p.n, raw: p });

    // Create vehicle for drivers with explicit capacity or default
    if (hasVehicle(p)) {
      const capacity = p.cupos ?? 4; // default 4 if not specified
      await prisma.vehicle.create({
        data: {
          plate: p.placa ?? null,
          model: null,
          capacity,
          isActive: true,
          organizationId: org.id,
          driverId: user.id,
        },
      });
    }
  }

  console.log(`  ✓ Users: ${createdUsers.length} created`);
  const vehicleCount = await prisma.vehicle.count();
  console.log(`  ✓ Vehicles: ${vehicleCount} created`);
  const memberCount = await prisma.organizationMember.count();
  console.log(`  ✓ Memberships: ${memberCount} created`);

  // ── 3. Create default Event ─────────────────────────────
  const event = await prisma.event.create({
    data: {
      title: 'EMBA Clase',
      description:
        'Clase regular del programa EMBA 2026-2028 — coordinación de transporte compartido.',
      date: new Date('2026-07-31T07:00:00-05:00'), // first class day
      origin: 'INALDE — Universidad de la Sabana',
      originLat: 4.861, // approximate Chía campus
      originLng: -74.034,
      destination: 'INALDE — Universidad de la Sabana',
      destLat: 4.861,
      destLng: -74.034,
      capacity: 50,
      status: EventStatus.DRAFT,
      organizationId: org.id,
    },
  });
  console.log(`  ✓ Event: ${event.title} (${event.status})`);

  // ── 4. Platform owner (user behind the app) ──────────────
  const ownerEmail = 'dsp5502@gmail.com';
  const existingOwner = await prisma.user.findUnique({ where: { email: ownerEmail } });
  if (!existingOwner) {
    const owner = await prisma.user.create({
      data: {
        email: ownerEmail,
        name: 'David Santiago',
        phone: null,
        avatar: null,
      },
    });
    await prisma.organizationMember.create({
      data: {
        userId: owner.id,
        organizationId: org.id,
        role: Role.ORG_ADMIN,
      },
    });
    console.log(`  ✓ Platform owner: ${owner.name} (${owner.email}) — ADMIN role`);
  } else {
    console.log(`  ✓ Platform owner already exists: ${existingOwner.email}`);
  }

  // ── 5. Note about pending users ─────────────────────────
  console.log('\n  ⚠️  Javi López: mencionado en el chat pero sin coordenadas — agregar manualmente cuando comparta ubicación.');

  console.log('\n✅ Seed complete!');
  console.log(`   Organization: ${org.slug}`);
  console.log(`   Users:        ${createdUsers.length}`);
  console.log(`   Vehicles:     ${vehicleCount}`);
  console.log(`   Memberships:  ${memberCount}`);
  console.log(`   Events:       1 (${event.status})`);
}

main()
  .catch((e) => {
    console.error('❌ Seed failed:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
