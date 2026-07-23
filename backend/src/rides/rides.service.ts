import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { RequestStatus, Role, EventStatus } from '@prisma/client';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { UpdateRideRequestDto } from './dto/update-ride-request.dto';

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
  ) {}

  // ─── Ride Requests ─────────────────────────────────────

  async createRequest(eventId: string, passengerId: string, _dto: CreateRideRequestDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    if (event.status !== EventStatus.OPEN) {
      throw new BadRequestException('Can only request rides for OPEN events');
    }

    // Check for existing pending/accepted request by this passenger
    const existing = await this.prisma.rideRequest.findUnique({
      where: { eventId_passengerId: { eventId, passengerId } },
    });
    if (existing) {
      throw new ConflictException('You already have a ride request for this event');
    }

    // Check event capacity — count accepted requests + assignments
    const acceptedCount = await this.prisma.rideRequest.count({
      where: { eventId, status: RequestStatus.ACCEPTED },
    });
    if (acceptedCount >= event.capacity) {
      throw new ConflictException('Event has reached full capacity');
    }

    const request = await this.prisma.rideRequest.create({
      data: { eventId, passengerId },
      include: {
        passenger: { select: { id: true, name: true, email: true } },
      },
    });

    // Notify event organizers/admins
    await this.notifyEventAdmins(event.organizationId, 'RIDE_REQUESTED', {
      title: 'New ride request',
      message: `${request.passenger.name} requested a ride`,
      eventId,
    });

    return request;
  }

  async findRequestsByEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return this.prisma.rideRequest.findMany({
      where: { eventId },
      include: {
        passenger: { select: { id: true, name: true, email: true, phone: true } },
        trip: true,
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async updateRequestStatus(
    id: string,
    dto: UpdateRideRequestDto,
    userId: string,
  ) {
    const request = await this.prisma.rideRequest.findUnique({
      where: { id },
      include: {
        event: { include: { organization: true } },
        passenger: true,
      },
    });

    if (!request) {
      throw new NotFoundException(`Ride request ${id} not found`);
    }

    // Verify authorizer is driver or admin for this event's org
    const authorizer = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: request.event.organizationId,
          userId,
        },
      },
    });

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

    // Validate transition
    if (request.status !== RequestStatus.PENDING) {
      throw new BadRequestException(
        `Cannot update a ${request.status} request — only PENDING requests can be modified`,
      );
    }

    if (
      dto.status !== RequestStatus.ACCEPTED &&
      dto.status !== RequestStatus.REJECTED &&
      dto.status !== RequestStatus.CANCELLED
    ) {
      throw new BadRequestException(
        `Invalid status transition: PENDING → ${dto.status}`,
      );
    }

    // If approving, check capacity
    if (dto.status === RequestStatus.ACCEPTED) {
      const acceptedCount = await this.prisma.rideRequest.count({
        where: {
          eventId: request.eventId,
          status: RequestStatus.ACCEPTED,
        },
      });
      if (acceptedCount >= request.event.capacity) {
        throw new ConflictException('Event has reached full capacity');
      }
    }

    const updated = await this.prisma.rideRequest.update({
      where: { id },
      data: { status: dto.status },
      include: {
        passenger: { select: { id: true, name: true, email: true } },
      },
    });

    // Create notification for passenger
    const notifTitle =
      dto.status === RequestStatus.ACCEPTED
        ? 'Ride approved'
        : dto.status === RequestStatus.REJECTED
          ? 'Ride rejected'
          : 'Ride cancelled';

    await this.notifications.create({
      type: dto.status === RequestStatus.ACCEPTED ? 'RIDE_APPROVED' : 'RIDE_REJECTED',
      title: notifTitle,
      message: `Your ride request for "${request.event.title}" was ${dto.status.toLowerCase()}`,
      userId: request.passengerId,
    });

    return updated;
  }

  // ─── Auto-Assignment Engine ────────────────────────────

  async autoAssign(eventId: string, userId: string) {
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    });

    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify authorizer has rights
    const authorizer = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId: event.organizationId,
          userId,
        },
      },
    });

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
    const pendingRequests = await this.prisma.rideRequest.findMany({
      where: { eventId, status: RequestStatus.PENDING },
      include: { passenger: true },
    });

    if (pendingRequests.length === 0) {
      return { message: 'No pending requests to assign', assignments: [] };
    }

    // Get available vehicles with drivers from this org
    const availableVehicles = await this.prisma.vehicle.findMany({
      where: {
        organizationId: event.organizationId,
        isActive: true,
        driverId: { not: null },
      },
      include: { driver: true },
    });

    if (availableVehicles.length === 0) {
      throw new BadRequestException(
        'No available vehicles with drivers in this organization',
      );
    }

    // Get already-accepted requests to know remaining capacity
    const acceptedCount = await this.prisma.rideRequest.count({
      where: { eventId, status: RequestStatus.ACCEPTED },
    });

    const remainingCapacity = event.capacity - acceptedCount;
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
      const trip = await this.prisma.trip.create({
        data: {
          eventId,
          driverId: vehicle.driverId!,
          vehicleId: vehicle.id,
          origin: event.origin,
          dest: event.destination,
          notes: `Auto-assigned - ${vehicle.model || vehicle.plate || 'Vehicle'}`,
        },
      });

      // Assign riders to this trip
      for (let i = 0; i < slots && riderIndex < assignable.length; i++) {
        const request = assignable[riderIndex];

        await this.prisma.$transaction([
          this.prisma.passengerAssignment.create({
            data: {
              tripId: trip.id,
              userId: request.passengerId,
            },
          }),
          this.prisma.rideRequest.update({
            where: { id: request.id },
            data: {
              status: RequestStatus.ACCEPTED,
              tripId: trip.id,
            },
          }),
        ]);

        // Notify passenger
        await this.notifications.create({
          type: 'TRIP_ASSIGNED',
          title: 'Trip assigned',
          message: `You've been assigned to a trip for "${event.title}"`,
          userId: request.passengerId,
        });

        assignments.push({
          tripId: trip.id,
          passengerId: request.passengerId,
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
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return this.prisma.trip.findMany({
      where: { eventId },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        vehicle: true,
        rideRequests: {
          include: {
            passenger: { select: { id: true, name: true, email: true } },
          },
        },
        passengerAssignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  async findTripById(eventId: string, tripId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const trip = await this.prisma.trip.findFirst({
      where: { id: tripId, eventId },
      include: {
        driver: { select: { id: true, name: true, email: true, phone: true } },
        vehicle: true,
        rideRequests: {
          include: {
            passenger: { select: { id: true, name: true, email: true } },
          },
        },
        passengerAssignments: {
          include: { user: { select: { id: true, name: true, email: true, phone: true } } },
        },
      },
    });

    if (!trip) {
      throw new NotFoundException(`Trip ${tripId} not found in event ${eventId}`);
    }

    return trip;
  }

  // ─── Helpers ───────────────────────────────────────────

  private async notifyEventAdmins(
    organizationId: string,
    type: string,
    data: { title: string; message: string; eventId: string },
  ) {
    // Notify all ORG_ADMIN + DRIVER members of this org
    const admins = await this.prisma.organizationMember.findMany({
      where: {
        organizationId,
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
