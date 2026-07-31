import { getAppContext } from '../context';
import { SupabaseDataService } from '../../supabase/supabase-data.service';
import { EventsService } from '../../events/events.service';
import { renderSimulationSummaryTable } from '../ui/tables';
import pc from 'picocolors';
import { EventStatus } from '@prisma/client';
import * as crypto from 'crypto';

export async function runSimulationHandler(passengerCount = 3, driverCount = 2) {
  console.log(pc.cyan(`\n⚡ Initializing RideFlow End-to-End Carpooling Simulation...`));

  const app = await getAppContext();
  const supabase = app.get(SupabaseDataService);
  const eventsService = app.get(EventsService);

  // 1. Ensure Organization
  let { data: orgs } = await supabase.from('organizations').select('id').limit(1);
  let orgId = orgs && orgs.length > 0 ? orgs[0].id : null;

  if (!orgId) {
    const { data: newOrg } = await supabase
      .from('organizations')
      .insert({ name: 'Simulated Org', slug: `sim-org-${Date.now()}` })
      .select('id')
      .single();
    orgId = newOrg?.id || '';
  }

  // 2. Create Event
  const event = await eventsService.create(orgId, {
    title: `Simulated Tech Meetup #${Math.floor(Math.random() * 1000)}`,
    origin: 'Bogotá (Zona Norte)',
    destination: 'Chía (Campus)',
    date: new Date(Date.now() + 86400000 * 3).toISOString(),
    capacity: 4,
  });

  // Transition status to PUBLISHED & OPEN
  await eventsService.updateStatus(event.id, { status: EventStatus.PUBLISHED });
  await eventsService.updateStatus(event.id, { status: EventStatus.OPEN });

  // 3. Create Drivers & Vehicles
  const drivers = [];
  for (let i = 1; i <= driverCount; i++) {
    const driverId = crypto.randomUUID();
    const { data: driver } = await supabase
      .from('users')
      .insert({
        id: driverId,
        email: `driver_${Date.now()}_${i}@rideflow.ai`,
        name: `Driver ${i}`,
      })
      .select()
      .single();

    const vehicleId = crypto.randomUUID();
    const { data: vehicle } = await supabase
      .from('vehicles')
      .insert({
        id: vehicleId,
        organization_id: orgId,
        driver_id: driverId,
        model: `Toyota Corolla ${i}`,
        plate: `SIM-${Math.floor(100 + Math.random() * 900)}`,
        capacity: 4,
      })
      .select()
      .single();

    await supabase.from('event_vehicles').insert({
      id: crypto.randomUUID(),
      event_id: event.id,
      vehicle_id: vehicleId,
      driver_id: driverId,
      start_location: 'Portal Norte',
    });

    const tripId = crypto.randomUUID();
    const { data: trip } = await supabase
      .from('trips')
      .insert({
        id: tripId,
        event_id: event.id,
        driver_id: driverId,
        vehicle_id: vehicleId,
        origin: 'Portal Norte',
        dest: 'Chía (Campus)',
      })
      .select()
      .single();

    drivers.push({ driver, vehicle, trip });
  }

  // 4. Create Passengers & Ride Requests
  let matchedCount = 0;
  for (let p = 1; p <= passengerCount; p++) {
    const passengerId = crypto.randomUUID();
    const { data: passenger } = await supabase
      .from('users')
      .insert({
        id: passengerId,
        email: `passenger_${Date.now()}_${p}@rideflow.ai`,
        name: `Passenger ${p}`,
      })
      .select()
      .single();

    const targetDriver = drivers[(p - 1) % drivers.length];

    if (targetDriver?.trip?.id) {
      await supabase.from('ride_requests').insert({
        id: crypto.randomUUID(),
        event_id: event.id,
        passenger_id: passengerId,
        trip_id: targetDriver.trip.id,
        status: 'ACCEPTED',
        pickup_address: `Calle ${100 + p} # 15-${p * 2}`,
      });

      await supabase.from('passenger_assignments').insert({
        id: crypto.randomUUID(),
        trip_id: targetDriver.trip.id,
        user_id: passengerId,
        pickup_order: p,
      });

      matchedCount++;
    }
  }

  // 5. Finish Event Lifecycle
  await eventsService.updateStatus(event.id, { status: EventStatus.CLOSED });
  const finishedEvent = await eventsService.updateStatus(event.id, { status: EventStatus.FINISHED });

  console.log(pc.green(`✔ End-to-End Simulation completed successfully!\n`));
  console.log(
    renderSimulationSummaryTable({
      eventId: finishedEvent.id,
      title: finishedEvent.title,
      driverCount: drivers.length,
      passengerCount,
      matchedCount,
      status: finishedEvent.status,
    })
  );

  return { event: finishedEvent, matchedCount };
}
