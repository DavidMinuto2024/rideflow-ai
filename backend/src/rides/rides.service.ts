import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { RequestStatus, Role, EventStatus } from '@prisma/client';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { UpdateRideRequestDto } from './dto/update-ride-request.dto';

@Injectable()
export class RidesService {
  constructor(
    private readonly supabase: SupabaseDataService,
    private readonly notifications: NotificationsService,
    private readonly suggestionsService: SuggestionsService,
  ) {}

  // ─── Ride Requests ─────────────────────────────────────

  async createRequest(eventId: string, passengerId: string, dto: CreateRideRequestDto) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id, status, capacity, organization_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException('Can only request rides for OPEN events');
    }

    // Check for existing pending/accepted request by this passenger
    const { data: existing, error: existingError } = await this.supabase
      .from('ride_requests')
      .select('id')
      .eq('event_id', eventId)
      .eq('passenger_id', passengerId)
      .maybeSingle();

    if (existingError) this.supabase.handleError(existingError, 'ride_requests');
    if (existing) {
      throw new ConflictException('You already have a ride request for this event');
    }

    // Check event capacity — count accepted requests + assignments
    const { count: acceptedCount, error: countError } = await this.supabase
      .from('ride_requests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', RequestStatus.ACCEPTED);

    if (countError) this.supabase.handleError(countError, 'ride_requests');
    if ((acceptedCount ?? 0) >= event.capacity) {
      throw new ConflictException('Event has reached full capacity');
    }

    const { data: request, error: createError } = await this.supabase
      .from('ride_requests')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        passenger_id: passengerId,
        pickup_lat: dto.pickupLat ?? null,
        pickup_lng: dto.pickupLng ?? null,
        pickup_address: dto.pickupAddress ?? null,
      })
      .select('*, passenger:users!inner(id, name, email)')
      .single();

    if (createError) this.supabase.handleError(createError, 'ride_requests');

    // Notify event organizers/admins
    await this.notifyEventAdmins(event.organization_id, 'RIDE_REQUESTED', {
      title: 'New ride request',
      message: `${request.passenger.name} requested a ride`,
      eventId,
    });

    return request;
  }

  async findRequestsByEvent(eventId: string) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const { data, error } = await this.supabase
      .from('ride_requests')
      .select('*, passenger:users!inner(id, name, email, phone), trip:trips(*)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) this.supabase.handleError(error, 'ride_requests');
    return data || [];
  }

  async updateRequestStatus(
    id: string,
    dto: UpdateRideRequestDto,
    userId: string,
  ) {
    const { data: request, error: requestError } = await this.supabase
      .from('ride_requests')
      .select('*, event:events!inner(*, organization:organizations(*)), passenger:users(*)')
      .eq('id', id)
      .maybeSingle();

    if (requestError) this.supabase.handleError(requestError, 'ride_requests');
    if (!request) {
      throw new NotFoundException(`Ride request ${id} not found`);
    }

    // Passenger can cancel own PENDING request without role check
    const isPassengerCancellingOwn =
      request.passenger_id === userId &&
      dto.status === RequestStatus.CANCELLED &&
      request.status === RequestStatus.PENDING;

    if (!isPassengerCancellingOwn) {
      // Verify authorizer is driver or admin for this event's org
      const { data: authorizer, error: authError } = await this.supabase
        .from('organization_members')
        .select('role')
        .eq('organization_id', request.event.organization_id)
        .eq('user_id', userId)
        .maybeSingle();

      if (authError) this.supabase.handleError(authError, 'organization_members');

      if (
        !authorizer ||
        (authorizer.role !== Role.ORG_ADMIN &&
          authorizer.role !== Role.DRIVER &&
          authorizer.role !== Role.SUPER_ADMIN)
      ) {
        throw new ForbiddenException(
          'Only event drivers or admins can approve/reject ride requests',
        );
      }
    }

    // Validate transition
    const isPendingTransition =
      request.status === RequestStatus.PENDING &&
      (dto.status === RequestStatus.ACCEPTED ||
        dto.status === RequestStatus.REJECTED ||
        dto.status === RequestStatus.CANCELLED);

    const isAcceptedCancellation =
      request.status === RequestStatus.ACCEPTED &&
      dto.status === RequestStatus.CANCELLED;

    if (!isPendingTransition && !isAcceptedCancellation) {
      throw new BadRequestException(
        `Invalid status transition: ${request.status} → ${dto.status}`,
      );
    }

    // If approving, check capacity
    if (dto.status === RequestStatus.ACCEPTED) {
      const { count: acceptedCount, error: countError } = await this.supabase
        .from('ride_requests')
        .select('*', { count: 'exact', head: true })
        .eq('event_id', request.event_id)
        .eq('status', RequestStatus.ACCEPTED);

      if (countError) this.supabase.handleError(countError, 'ride_requests');
      if ((acceptedCount ?? 0) >= request.event.capacity) {
        throw new ConflictException('Event has reached full capacity');
      }
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('ride_requests')
      .update({ status: dto.status })
      .eq('id', id)
      .select('*, passenger:users!inner(id, name, email)')
      .single();

    if (updateError) this.supabase.handleError(updateError, 'ride_requests');

    // Create notification for passenger
    const notifTitle =
      dto.status === RequestStatus.ACCEPTED
        ? 'Ride approved'
        : dto.status === RequestStatus.REJECTED
          ? 'Ride rejected'
          : 'Ride cancelled';

    const notifType =
      dto.status === RequestStatus.ACCEPTED
        ? 'RIDE_APPROVED'
        : dto.status === RequestStatus.CANCELLED
          ? 'RIDE_CANCELLED'
          : 'RIDE_REJECTED';

    await this.notifications.create({
      type: notifType,
      title: notifTitle,
      message: `Your ride request for "${request.event.title}" was ${dto.status.toLowerCase()}`,
      userId: request.passenger_id,
    });

    // On cancellation, trigger re-optimization and notify affected passengers
    if (dto.status === RequestStatus.CANCELLED) {
      await this.handleCancellationReoptimization(request.event_id);
    }

    return updated;
  }

  // ─── Auto-Assignment Engine ────────────────────────────

  async autoAssign(eventId: string, userId: string) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('*, organization:organizations(*)')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify authorizer has rights
    const { data: authorizer, error: authError } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (authError) this.supabase.handleError(authError, 'organization_members');

    if (
      !authorizer ||
      (authorizer.role !== Role.ORG_ADMIN &&
        authorizer.role !== Role.DRIVER &&
        authorizer.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Only admins or drivers can run auto-assignment',
      );
    }

    // Get all PENDING ride requests for this event
    const { data: pendingRequests, error: pendingError } = await this.supabase
      .from('ride_requests')
      .select('*, passenger:users(*)')
      .eq('event_id', eventId)
      .eq('status', RequestStatus.PENDING);

    if (pendingError) this.supabase.handleError(pendingError, 'ride_requests');

    if (!pendingRequests || pendingRequests.length === 0) {
      return { message: 'No pending requests to assign', assignments: [] };
    }

    // Get available vehicles with drivers from this org
    const { data: availableVehicles, error: vehiclesError } = await this.supabase
      .from('vehicles')
      .select('*, driver:users(*)')
      .eq('organization_id', event.organization_id)
      .eq('is_active', true)
      .not('driver_id', 'is', null);

    if (vehiclesError) this.supabase.handleError(vehiclesError, 'vehicles');

    if (!availableVehicles || availableVehicles.length === 0) {
      throw new BadRequestException(
        'No available vehicles with drivers in this organization',
      );
    }

    // Get already-accepted requests to know remaining capacity
    const { count: acceptedCount, error: countError } = await this.supabase
      .from('ride_requests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', RequestStatus.ACCEPTED);

    if (countError) this.supabase.handleError(countError, 'ride_requests');

    const remainingCapacity = event.capacity - (acceptedCount ?? 0);
    const assignable = pendingRequests.slice(0, remainingCapacity);

    if (assignable.length === 0) {
      return { message: 'Event is at full capacity', assignments: [] };
    }

    // Greedy assignment: sort vehicles by capacity (largest first),
    // assign riders to each vehicle until full
    const sortedVehicles = [...availableVehicles].sort(
      (a, b) => b.capacity - a.capacity,
    );

    const assignments: Array<{
      tripId: string;
      passengerId: string;
      passengerName: string;
      vehiclePlate: string | null;
      driverName: string;
    }> = [];

    let riderIndex = 0;

    for (const vehicle of sortedVehicles) {
      if (riderIndex >= assignable.length) break;

      const slots = Math.min(vehicle.capacity, assignable.length - riderIndex);
      if (slots === 0) break;

      // Create a trip for this vehicle + driver
      const { data: trip, error: tripError } = await this.supabase
        .from('trips')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        driver_id: vehicle.driver_id,
        vehicle_id: vehicle.id,
        origin: event.origin,
        origin_lat: event.origin_lat,
        origin_lng: event.origin_lng,
        dest: event.destination,
        dest_lat: event.dest_lat,
        dest_lng: event.dest_lng,
        notes: `Auto-assigned - ${vehicle.model || vehicle.plate || 'Vehicle'}`,
      })
      .select()
      .single();

    if (tripError) this.supabase.handleError(tripError, 'trips');

      // Assign riders to this trip
      for (let i = 0; i < slots && riderIndex < assignable.length; i++) {
        const request = assignable[riderIndex];

        // Create passenger assignment
        const { error: assignmentError } = await this.supabase
          .from('passenger_assignments')
      .insert({
        id: crypto.randomUUID(),
        trip_id: trip.id,
        user_id: request.passenger_id,
      });

    if (assignmentError) this.supabase.handleError(assignmentError, 'passenger_assignments');

        // Update ride request status
        const { error: reqUpdateError } = await this.supabase
          .from('ride_requests')
          .update({
            status: RequestStatus.ACCEPTED,
            trip_id: trip.id,
          })
          .eq('id', request.id);

        if (reqUpdateError) this.supabase.handleError(reqUpdateError, 'ride_requests');

        // Notify passenger
        await this.notifications.create({
          type: 'TRIP_ASSIGNED',
          title: 'Trip assigned',
          message: `You've been assigned to a trip for "${event.title}"`,
          userId: request.passenger_id,
        });

        assignments.push({
          tripId: trip.id,
          passengerId: request.passenger_id,
          passengerName: request.passenger.name,
          vehiclePlate: vehicle.plate,
          driverName: vehicle.driver?.name || 'Unknown',
        });

        riderIndex++;
      }
    }

    return {
      message: `Assigned ${assignments.length} passenger(s) across ${new Set(assignments.map((a) => a.tripId)).size} trip(s)`,
      assignments,
    };
  }

  // ─── Trips ─────────────────────────────────────────────

  async findTripsByEvent(eventId: string) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const { data: trips, error } = await this.supabase
      .from('trips')
      .select('*, driver:users!inner(id, name, email), vehicle:vehicles(*), ride_requests:ride_requests(*, passenger:users!inner(id, name, email)), passenger_assignments:passenger_assignments(*, user:users!inner(id, name, email))')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) this.supabase.handleError(error, 'trips');
    return (trips || []).map((t) => this.mapTripResponse(t));
  }

  async findTripById(eventId: string, tripId: string) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const { data: trip, error } = await this.supabase
      .from('trips')
      .select('*, driver:users!inner(id, name, email, phone), vehicle:vehicles(*), ride_requests:ride_requests(*, passenger:users!inner(id, name, email)), passenger_assignments:passenger_assignments(*, user:users!inner(id, name, email, phone))')
      .eq('id', tripId)
      .eq('event_id', eventId)
      .maybeSingle();

    if (error) this.supabase.handleError(error, 'trips');
    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} not found in event ${eventId}`);
    }

    return this.mapTripResponse(trip);
  }

  // ─── Direct Assignment ─────────────────────────────────
  // Bypasses auto-assign engine — directly assigns an ACCEPTED
  // request to a specific driver/vehicle with proper coordinates.

  async directAssign(
    eventId: string,
    dto: { passengerId: string; driverId: string },
    userId: string,
  ) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('*, organization:organizations(*)')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify authorizer
    const { data: authorizer, error: authError } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (authError) this.supabase.handleError(authError, 'organization_members');
    if (
      !authorizer ||
      (authorizer.role !== Role.ORG_ADMIN &&
        authorizer.role !== Role.DRIVER &&
        authorizer.role !== Role.SUPER_ADMIN)
    ) {
      throw new ForbiddenException(
        'Only admins or drivers can assign trips',
      );
    }

    // Find the ride request (must be ACCEPTED or PENDING)
    const { data: rideRequest, error: reqError } = await this.supabase
      .from('ride_requests')
      .select('*, passenger:users(*)')
      .eq('event_id', eventId)
      .eq('passenger_id', dto.passengerId)
      .maybeSingle();

    if (reqError) this.supabase.handleError(reqError, 'ride_requests');
    if (!rideRequest) {
      throw new NotFoundException(
        `No ride request found for passenger ${dto.passengerId} in event ${eventId}`,
      );
    }
    if (rideRequest.status === RequestStatus.REJECTED || rideRequest.status === RequestStatus.CANCELLED) {
      throw new BadRequestException(
        `Cannot assign a ${rideRequest.status} request`,
      );
    }
    if (rideRequest.trip_id) {
      throw new ConflictException(
        'Passenger is already assigned to a trip',
      );
    }

    // Find driver's vehicle
    const { data: vehicle, error: vehicleError } = await this.supabase
      .from('vehicles')
      .select('*, driver:users(*)')
      .eq('driver_id', dto.driverId)
      .eq('is_active', true)
      .maybeSingle();

    if (vehicleError) this.supabase.handleError(vehicleError, 'vehicles');
    if (!vehicle) {
      throw new BadRequestException(
        `Driver ${dto.driverId} has no active vehicle`,
      );
    }

    // Build driver start name from driver's name
    const driverStartName = `${vehicle.driver?.name || 'Conductor'} (${vehicle.model || vehicle.plate || 'Carro'})`;

    // Create the trip with driver's coordinates
    const { data: trip, error: tripError } = await this.supabase
      .from('trips')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        driver_id: dto.driverId,
        vehicle_id: vehicle.id,
        origin: driverStartName,
        dest: event.destination,
        dest_lat: event.dest_lat,
        dest_lng: event.dest_lng,
        notes: `Asignación directa: ${driverStartName}`,
      })
      .select()
      .single();

    if (tripError) this.supabase.handleError(tripError, 'trips');

    // Create passenger assignment
    const { error: assignmentError } = await this.supabase
      .from('passenger_assignments')
      .insert({
        id: crypto.randomUUID(),
        trip_id: trip.id,
        user_id: dto.passengerId,
      });

    if (assignmentError) this.supabase.handleError(assignmentError, 'passenger_assignments');

    // Update ride request
    const updateData: Record<string, unknown> = { trip_id: trip.id };
    if (rideRequest.status === RequestStatus.PENDING) {
      updateData['status'] = RequestStatus.ACCEPTED;
    }

    const { error: reqUpdateError } = await this.supabase
      .from('ride_requests')
      .update(updateData)
      .eq('id', rideRequest.id);

    if (reqUpdateError) this.supabase.handleError(reqUpdateError, 'ride_requests');

    // Notify passenger
    await this.notifications.create({
      type: 'TRIP_ASSIGNED',
      title: 'Viaje asignado',
      message: `Has sido asignado al viaje de ${vehicle.driver?.name || 'conductor'} para "${event.title}"`,
      userId: dto.passengerId,
    });

    // Fetch the complete trip for response
    const { data: newTrip, error: fetchError } = await this.supabase
      .from('trips')
      .select('*, driver:users!inner(id, name, email), vehicle:vehicles(*), passenger_assignments:passenger_assignments(*, user:users!inner(id, name, email))')
      .eq('id', trip.id)
      .maybeSingle();

    if (fetchError) this.supabase.handleError(fetchError, 'trips');

    return this.mapTripResponse(newTrip!);
  }

  // ─── Response Mapper ──────────────────────────────────
  // Maps Prisma's passengerAssignments[].user → assignments[].passenger
  // so the frontend gets a clean interface.

  private mapTripResponse(trip: Record<string, unknown>) {
    const { passengerAssignments, rideRequests, ...rest } = trip as any;
    return {
      ...rest,
      assignments: (passengerAssignments || []).map((pa: any) => ({
        id: pa.id,
        passenger: pa.user,
      })),
    };
  }

  // ─── Helpers ───────────────────────────────────────────

  /**
   * Handle post-cancellation re-optimization.
   * Re-optimizes departure/pickup times for all trips in the event
   * and sends ESTIMATED_PICKUP_TIME notifications to affected passengers.
   */
  private async handleCancellationReoptimization(eventId: string) {
    try {
      const result = await this.suggestionsService.optimizeTimes(eventId);

      if (result.trips && result.trips.length > 0) {
        for (const trip of result.trips) {
          for (const pt of trip.pickupTimes) {
            await this.notifications.create({
              type: 'ESTIMATED_PICKUP_TIME',
              title: 'Pickup time updated',
              message: `Your estimated pickup time has been updated to ${new Date(pt.pickupTime).toLocaleTimeString()}`,
              userId: pt.passengerId,
            });
          }
        }
      }
    } catch {
      // Re-optimization is best-effort — don't fail the cancellation
    }
  }

  private async notifyEventAdmins(
    organizationId: string,
    type: string,
    data: { title: string; message: string; eventId: string },
  ) {
    // Notify all ORG_ADMIN + DRIVER members of this org
    const { data: admins, error } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', organizationId)
      .in('role', [Role.ORG_ADMIN, Role.SUPER_ADMIN]);

    if (error) this.supabase.handleError(error, 'organization_members');

    if (!admins) return;

    for (const admin of admins) {
      await this.notifications.create({
        type,
        title: data.title,
        message: data.message,
        userId: admin.user_id,
      });
    }
  }
}
