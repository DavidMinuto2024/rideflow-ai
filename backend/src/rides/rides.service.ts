import {
  Injectable,
  BadRequestException,
  NotFoundException,
  ConflictException,
  ForbiddenException,
  Inject,
  forwardRef,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { NotificationsService } from '../notifications/notifications.service';
import { SuggestionsService } from '../suggestions/suggestions.service';
import { RequestStatus, Role, EventStatus } from '@prisma/client';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { UpdateRideRequestDto } from './dto/update-ride-request.dto';

@Injectable()
export class RidesService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: NotificationsService,
    private readonly suggestionsService: SuggestionsService,
  ) {}

  // ─── Ride Requests ─────────────────────────────────────

  async createRequest(eventId: string, passengerId: string, dto: CreateRideRequestDto) {
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
      data: {
        eventId,
        passengerId,
        pickupLat: dto.pickupLat ?? null,
        pickupLng: dto.pickupLng ?? null,
        pickupAddress: dto.pickupAddress ?? null,
      },
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
      userId: request.passengerId,
    });

    // On cancellation, trigger re-optimization and notify affected passengers
    if (dto.status === RequestStatus.CANCELLED) {
      await this.handleCancellationReoptimization(request.eventId);
    }

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
          originLat: event.originLat,
          originLng: event.originLng,
          dest: event.destination,
          destLat: event.destLat,
          destLng: event.destLng,
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

    const trips = await this.prisma.trip.findMany({
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

    return trips.map((t) => this.mapTripResponse(t));
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
    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
      include: { organization: true },
    });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    // Verify authorizer
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
        'Only admins or drivers can assign trips',
      );
    }

    // Find the ride request (must be ACCEPTED or PENDING)
    const rideRequest = await this.prisma.rideRequest.findUnique({
      where: {
        eventId_passengerId: {
          eventId,
          passengerId: dto.passengerId,
        },
      },
      include: { passenger: true },
    });
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
    if (rideRequest.tripId) {
      throw new ConflictException(
        'Passenger is already assigned to a trip',
      );
    }

    // Find driver's vehicle
    const vehicle = await this.prisma.vehicle.findFirst({
      where: { driverId: dto.driverId, isActive: true },
      include: { driver: true },
    });
    if (!vehicle) {
      throw new BadRequestException(
        `Driver ${dto.driverId} has no active vehicle`,
      );
    }

    // Build driver start name from driver's name
    const driverStartName = `${vehicle.driver?.name || 'Conductor'} (${vehicle.model || vehicle.plate || 'Carro'})`;

    // Create the trip with driver's coordinates
    // We store the driver's starting point in originLat/Lng
    // and the final destination in destLat/Lng (event destination)
    const trip = await this.prisma.trip.create({
      data: {
        eventId,
        driverId: dto.driverId,
        vehicleId: vehicle.id,
        origin: driverStartName,
        dest: event.destination,
        destLat: event.destLat,
        destLng: event.destLng,
        notes: `Asignación directa: ${driverStartName}`,
      },
    });

    // Assign passenger to trip + update request
    const assignment = await this.prisma.$transaction([
      this.prisma.passengerAssignment.create({
        data: {
          tripId: trip.id,
          userId: dto.passengerId,
        },
      }),
      this.prisma.rideRequest.update({
        where: { id: rideRequest.id },
        data: {
          tripId: trip.id,
          status: rideRequest.status === RequestStatus.PENDING
            ? RequestStatus.ACCEPTED
            : undefined,
        },
      }),
    ]);

    // Notify passenger
    await this.notifications.create({
      type: 'TRIP_ASSIGNED',
      title: 'Viaje asignado',
      message: `Has sido asignado al viaje de ${vehicle.driver?.name || 'conductor'} para "${event.title}"`,
      userId: dto.passengerId,
    });

    const newTrip = await this.prisma.trip.findUnique({
      where: { id: trip.id },
      include: {
        driver: { select: { id: true, name: true, email: true } },
        vehicle: true,
        passengerAssignments: {
          include: { user: { select: { id: true, name: true, email: true } } },
        },
      },
    });

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
