import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { EventStatus, Role } from '@prisma/client';
import { JoinEventDto, JoinRole } from './dto/join-event.dto';

@Injectable()
export class InvitationsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  /**
   * Validate an invite token and return the associated event info.
   * Throws if token is invalid, expired, or event is not open for joining.
   */
  async validateToken(token: string) {
    const event = await this.prisma.event.findUnique({
      where: { inviteToken: token },
      include: {
        organization: { select: { id: true, name: true } },
      },
    });

    if (!event) {
      throw new NotFoundException('Invalid invite token');
    }

    if (
      event.inviteTokenExpiresAt &&
      new Date() > event.inviteTokenExpiresAt
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
      arrivalTime: event.arrivalTime,
    };
  }

  /**
   * Join an event via invite token with a selected role.
   * Drivers: creates an EventVehicle record.
   * Passengers: creates a RideRequest record.
   */
  async joinEvent(token: string, userId: string, dto: JoinEventDto) {
    const event = await this.prisma.event.findUnique({
      where: { inviteToken: token },
      include: {
        organization: {
          include: {
            members: {
              where: { userId },
            },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException('Invalid invite token');
    }

    if (
      event.inviteTokenExpiresAt &&
      new Date() > event.inviteTokenExpiresAt
    ) {
      throw new BadRequestException('Invite token has expired');
    }

    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException('This event is not open for joining');
    }

    // Ensure user is a member of the organization
    if (!event.organization.members || event.organization.members.length === 0) {
      throw new ForbiddenException('You are not a member of this organization');
    }

    const member = event.organization.members[0];

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
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, driverId: userId },
    });

    if (!vehicle) {
      throw new BadRequestException('Vehicle not found or not assigned to you');
    }

    // Check if already registered for this event
    const existing = await this.prisma.eventVehicle.findUnique({
      where: { eventId_vehicleId: { eventId, vehicleId: dto.vehicleId } },
    });

    if (existing) {
      throw new ConflictException('This vehicle is already registered for this event');
    }

    // Check the event's driver capacity (rough check: at least 1 spot available)
    const registeredDrivers = await this.prisma.eventVehicle.count({
      where: { eventId },
    });

    // We use capacity as a rough proxy — actual limit is tracked per trip
    // Allow generous driver registration (up to event capacity is fine)
    if (registeredDrivers >= 20) {
      throw new ConflictException('Event has reached maximum driver capacity');
    }

    // Compute pico y placa for the event date
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    const picoYPlaca = this.checkPicoYPlaca(
      vehicle.plate,
      event?.date ?? new Date(),
    );

    // Create EventVehicle
    const eventVehicle = await this.prisma.eventVehicle.create({
      data: {
        eventId,
        vehicleId: dto.vehicleId,
        driverId: userId,
        startLocation: dto.startLocation,
        startLat: dto.startLat,
        startLng: dto.startLng,
        picoYPlaca,
      },
      include: {
        vehicle: true,
        event: { select: { id: true, title: true } },
      },
    });

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
    const existing = await this.prisma.rideRequest.findUnique({
      where: { eventId_passengerId: { eventId, passengerId: userId } },
    });

    if (existing) {
      throw new ConflictException('You already have a request for this event');
    }

    // Check event capacity
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException('Event not found');
    }

    const acceptedCount = await this.prisma.rideRequest.count({
      where: { eventId, status: 'ACCEPTED' as any },
    });

    if (acceptedCount >= event.capacity) {
      throw new ConflictException('Event has reached full capacity');
    }

    // If pickup location is provided, it will be stored on the RideRequest
    const rideRequest = await this.prisma.rideRequest.create({
      data: {
        eventId,
        passengerId: userId,
        pickupLat: dto.pickupLat ?? null,
        pickupLng: dto.pickupLng ?? null,
        pickupAddress: dto.pickupAddress ?? null,
      },
      include: {
        passenger: { select: { id: true, name: true, email: true } },
      },
    });

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
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      select: { organizationId: true },
    });
    if (!event) return;

    const admins = await this.prisma.organizationMember.findMany({
      where: {
        organizationId: event.organizationId,
        role: { in: [Role.ORG_ADMIN, Role.SUPER_ADMIN] },
      },
    });

    for (const admin of admins) {
      await this.notifications.create({
        type,
        title: data.title,
        message: data.message,
        userId: admin.userId,
      });
    }
  }
}
