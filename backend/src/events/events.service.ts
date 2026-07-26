import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { EventStatus } from '@prisma/client';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';
import * as crypto from 'crypto';
import * as qrcode from 'qrcode';

/**
 * Valid state transitions for the Event state machine.
 * DRAFT → PUBLISHED → OPEN → CLOSED → FINISHED
 * No backward transitions are allowed.
 */
const VALID_TRANSITIONS: Record<EventStatus, EventStatus[]> = {
  [EventStatus.DRAFT]: [EventStatus.PUBLISHED],
  [EventStatus.PUBLISHED]: [EventStatus.OPEN],
  [EventStatus.OPEN]: [EventStatus.CLOSED],
  [EventStatus.CLOSED]: [EventStatus.FINISHED],
  [EventStatus.FINISHED]: [],
};

@Injectable()
export class EventsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateEventDto) {
    // Validate required fields
    if (!dto.origin || dto.origin.trim().length === 0) {
      throw new UnprocessableEntityException('Origin is required');
    }

    if (!dto.destination || dto.destination.trim().length === 0) {
      throw new UnprocessableEntityException('Destination is required');
    }

    if (!dto.date) {
      throw new UnprocessableEntityException('Date is required');
    }

    // Generate invite token (expires in 7 days)
    const inviteToken = crypto.randomUUID();
    const inviteTokenExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000);

    // Generate QR SVG data URL
    const inviteUrl = `${this.getBaseUrl()}/invite/${inviteToken}`;
    let qrCodeSvg: string | null = null;
    try {
      qrCodeSvg = await qrcode.toString(inviteUrl, { type: 'svg' });
    } catch {
      // QR generation is non-critical — event can still be created
    }

    const event = await this.prisma.event.create({
      data: {
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        origin: dto.origin,
        originLat: dto.originLat,
        originLng: dto.originLng,
        destination: dto.destination,
        destLat: dto.destLat,
        destLng: dto.destLng,
        capacity: dto.capacity ?? 4,
        organizationId,
        inviteToken,
        inviteTokenExpiresAt,
        arrivalTime: dto.arrivalTime ? new Date(dto.arrivalTime) : null,
      },
    });

    return {
      ...event,
      qrCodeSvg,
    };
  }

  async findByOrganization(organizationId: string) {
    return this.prisma.event.findMany({
      where: { organizationId },
      orderBy: { date: 'asc' },
    });
  }

  async findOne(id: string) {
    const event = await this.prisma.event.findUnique({
      where: { id },
      include: {
        trips: {
          include: {
            driver: true,
            vehicle: true,
            rideRequests: true,
            passengerAssignments: { include: { user: true } },
          },
        },
      },
    });

    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Only allow edits in DRAFT or PUBLISHED status
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot edit event in ${event.status} status`,
      );
    }

    return this.prisma.event.update({
      where: { id },
      data: {
        ...dto,
        ...(dto.date ? { date: new Date(dto.date) } : {}),
      },
    });
  }

  async updateStatus(id: string, dto: UpdateEventStatusDto) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Validate state transition
    const allowed = VALID_TRANSITIONS[event.status];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid state transition: ${event.status} → ${dto.status}. ` +
        `Allowed transitions from ${event.status}: ${allowed?.join(', ') || 'none'}`,
      );
    }

    // Check for overlapping events when transitioning to OPEN
    if (dto.status === EventStatus.OPEN) {
      const overlapping = await this.checkOverlapping(event);
      if (overlapping) {
        throw new ConflictException(
          'An overlapping event already exists for this time slot',
        );
      }
    }

    return this.prisma.event.update({
      where: { id },
      data: { status: dto.status },
    });
  }

  async remove(id: string) {
    const event = await this.prisma.event.findUnique({ where: { id } });
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Only allow deleting DRAFT events
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft events can be deleted',
      );
    }

    await this.prisma.event.delete({ where: { id } });
    return { deleted: true };
  }

  /**
   * Check if there's an overlapping event in the same organization.
   * Two events overlap if they share the same date and have overlapping time windows.
   * For now, checks events on the same date.
   */
  /**
   * Get the base URL for constructing invite links.
   * Uses the APP_URL env var or defaults to localhost.
   */
  private getBaseUrl(): string {
    return process.env.APP_URL || 'http://localhost:3000';
  }

  private async checkOverlapping(event: {
    id: string;
    date: Date;
    organizationId: string;
  }): Promise<boolean> {
    // Get the date boundaries (same day)
    const startOfDay = new Date(event.date);
    startOfDay.setHours(0, 0, 0, 0);
    const endOfDay = new Date(event.date);
    endOfDay.setHours(23, 59, 59, 999);

    const sameDayEvents = await this.prisma.event.findMany({
      where: {
        organizationId: event.organizationId,
        id: { not: event.id },
        date: {
          gte: startOfDay,
          lte: endOfDay,
        },
        status: {
          in: [EventStatus.OPEN, EventStatus.PUBLISHED, EventStatus.CLOSED],
        },
      },
    });

    return sameDayEvents.length > 0;
  }
}
