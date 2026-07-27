import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventStatus, Role } from '@prisma/client';
import { JoinEventDto, JoinRole } from './dto/join-event.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly supabase: SupabaseDataService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Validate an invite token and return the associated event info.
   * Throws if token is invalid, expired, or event is not open for joining.
   */
  async validateToken(token: string) {
    const { data: event, error } = await this.supabase
      .from('events')
      .select('*, organization:organizations!inner(id, name)')
      .eq('invite_token', token)
      .maybeSingle();

    if (error) this.supabase.handleError(error, 'events');
    if (!event) {
      throw new NotFoundException('Invalid invite token');
    }

    if (
      event.invite_token_expires_at &&
      new Date() > new Date(event.invite_token_expires_at)
    ) {
      throw new BadRequestException('Invite token has expired');
    }

    if (event.status === EventStatus.FINISHED || event.status === EventStatus.CLOSED) {
      throw new BadRequestException('This event is no longer accepting participants');
    }

    return {
      id: event.id,
      title: event.title,
      description: event.description,
      date: event.date,
      origin: event.origin,
      destination: event.destination,
      organization: event.organization,
      status: event.status,
      capacity: event.capacity,
      arrivalTime: event.arrival_time,
    };
  }

  /**
   * Join an event via invite token with a selected role.
   * Drivers: creates an EventVehicle record.
   * Passengers: creates a RideRequest record.
   */
  async joinEvent(token: string, userId: string, dto: JoinEventDto) {
    // Fetch event by token
    const { data: event, error } = await this.supabase
      .from('events')
      .select('*, organization:organizations(*)')
      .eq('invite_token', token)
      .maybeSingle();

    if (error) this.supabase.handleError(error, 'events');
    if (!event) {
      throw new NotFoundException('Invalid invite token');
    }

    // Verify the user is a member of the event's organization
    const { data: membership } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!membership) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (
      event.invite_token_expires_at &&
      new Date() > new Date(event.invite_token_expires_at)
    ) {
      throw new BadRequestException('Invite token has expired');
    }

    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException('This event is not open for joining');
    }

    // Get user's role in the org
    const { data: member } = await this.supabase
      .from('organization_members')
      .select('role')
      .eq('organization_id', event.organization_id)
      .eq('user_id', userId)
      .maybeSingle();

    if (!member) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    if (dto.role === JoinRole.DRIVER) {
      return this.joinAsDriver(event.id, userId, member.role, dto);
    } else {
      return this.joinAsPassenger(event.id, userId, dto);
    }
  }

  private async joinAsDriver(
    eventId: string,
    userId: string,
    currentRole: Role,
    dto: JoinEventDto,
  ) {
    // Driver must provide a vehicleId
    if (!dto.vehicleId) {
      throw new BadRequestException('Driver must select a vehicle');
    }

    // Verify the vehicle exists and belongs to this user
    const { data: vehicle, error: vehicleError } = await this.supabase
      .from('vehicles')
      .select('*')
      .eq('id', dto.vehicleId)
      .eq('driver_id', userId)
      .maybeSingle();

    if (vehicleError) this.supabase.handleError(vehicleError, 'vehicles');
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found or not assigned to you');
    }

    // Check if already registered for this event
    const { data: existing, error: existingError } = await this.supabase
      .from('event_vehicles')
      .select('id')
      .eq('event_id', eventId)
      .eq('vehicle_id', dto.vehicleId)
      .maybeSingle();

    if (existingError) this.supabase.handleError(existingError, 'event_vehicles');
    if (existing) {
      throw new ConflictException('This vehicle is already registered for this event');
    }

    // Check the event's driver capacity
    const { count: registeredDrivers, error: countError } = await this.supabase
      .from('event_vehicles')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId);

    if (countError) this.supabase.handleError(countError, 'event_vehicles');

    if ((registeredDrivers ?? 0) >= 20) {
      throw new ConflictException('Event has reached maximum driver capacity');
    }

    // Compute pico y placa for the event date
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('date')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    const picoYPlaca = this.checkPicoYPlaca(
      vehicle.plate,
      event?.date ? new Date(event.date) : new Date(),
    );

    // Create EventVehicle
    const { data: eventVehicle, error: createError } = await this.supabase
      .from('event_vehicles')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        vehicle_id: dto.vehicleId,
        driver_id: userId,
        start_location: dto.startLocation,
        start_lat: dto.startLat,
        start_lng: dto.startLng,
        pico_y_placa: picoYPlaca,
      })
      .select('*, vehicle:vehicles(*), event:events!inner(id, title)')
      .single();

    if (createError) this.supabase.handleError(createError, 'event_vehicles');

    // Notify admins
    await this.notifyEventAdmins(eventId, 'EVENT_VEHICLE_REGISTERED', {
      title: 'New driver registered',
      message: `A driver registered for "${eventVehicle.event.title}"`,
      eventId,
    });

    return eventVehicle;
  }

  private async joinAsPassenger(
    eventId: string,
    userId: string,
    dto: JoinEventDto,
  ) {
    // Check existing request
    const { data: existing, error: existingError } = await this.supabase
      .from('ride_requests')
      .select('id')
      .eq('event_id', eventId)
      .eq('passenger_id', userId)
      .maybeSingle();

    if (existingError) this.supabase.handleError(existingError, 'ride_requests');
    if (existing) {
      throw new ConflictException('You already have a request for this event');
    }

    // Check event capacity
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('capacity')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const { count: acceptedCount, error: countError } = await this.supabase
      .from('ride_requests')
      .select('*', { count: 'exact', head: true })
      .eq('event_id', eventId)
      .eq('status', 'ACCEPTED');

    if (countError) this.supabase.handleError(countError, 'ride_requests');

    if ((acceptedCount ?? 0) >= event.capacity) {
      throw new ConflictException('Event has reached full capacity');
    }

    // If pickup location is provided, it will be stored on the RideRequest
    const { data: rideRequest, error: createError } = await this.supabase
      .from('ride_requests')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        passenger_id: userId,
        pickup_lat: dto.pickupLat ?? null,
        pickup_lng: dto.pickupLng ?? null,
        pickup_address: dto.pickupAddress ?? null,
      })
      .select('*, passenger:users!inner(id, name, email)')
      .single();

    if (createError) this.supabase.handleError(createError, 'ride_requests');

    // Notify admins
    await this.notifyEventAdmins(eventId, 'RIDE_REQUESTED', {
      title: 'New ride request',
      message: `${rideRequest.passenger.name} requested a ride`,
      eventId,
    });

    return rideRequest;
  }

  /**
   * Bogotá pico y placa check based on license plate last digit and weekday.
   * Monday: 1-2, Tuesday: 3-4, Wednesday: 5-6, Thursday: 7-8, Friday: 9-0, Weekend: no restriction.
   */
  private checkPicoYPlaca(plate: string | null, eventDate: Date): boolean {
    if (!plate || plate.length === 0) return false;

    const lastDigit = parseInt(plate.slice(-1), 10);
    if (isNaN(lastDigit)) return false;

    const dayOfWeek = eventDate.getDay(); // 0=Sunday, 6=Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const restrictions: Record<number, number[]> = {
      1: [1, 2],
      2: [3, 4],
      3: [5, 6],
      4: [7, 8],
      5: [9, 0],
    };

    const restrictedDigits = restrictions[dayOfWeek] ?? [];
    return restrictedDigits.includes(lastDigit);
  }

  private async notifyEventAdmins(
    eventId: string,
    type: string,
    data: { title: string; message: string; eventId: string },
  ) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('organization_id')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) return;

    const { data: admins, error: adminsError } = await this.supabase
      .from('organization_members')
      .select('user_id')
      .eq('organization_id', event.organization_id)
      .in('role', [Role.ORG_ADMIN, Role.SUPER_ADMIN]);

    if (adminsError) this.supabase.handleError(adminsError, 'organization_members');

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
