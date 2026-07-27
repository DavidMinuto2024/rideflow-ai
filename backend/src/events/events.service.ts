import {
  Injectable,
  BadRequestException,
  ConflictException,
  NotFoundException,
  UnprocessableEntityException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
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
  constructor(private readonly supabase: SupabaseDataService) {}

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

    const { data: event, error } = await this.supabase
      .from('events')
      .insert({
        id: crypto.randomUUID(),
        title: dto.title,
        description: dto.description,
        date: new Date(dto.date),
        origin: dto.origin,
        origin_lat: dto.originLat,
        origin_lng: dto.originLng,
        destination: dto.destination,
        dest_lat: dto.destLat,
        dest_lng: dto.destLng,
        capacity: dto.capacity ?? 4,
        organization_id: organizationId,
        invite_token: inviteToken,
        invite_token_expires_at: inviteTokenExpiresAt,
        arrival_time: dto.arrivalTime ? new Date(dto.arrivalTime) : null,
      })
      .select()
      .single();

    if (error) this.supabase.handleError(error, 'events');

    return {
      ...event,
      qrCodeSvg,
    };
  }

  async findByOrganization(organizationId: string) {
    const { data, error } = await this.supabase
      .from('events')
      .select('*')
      .eq('organization_id', organizationId)
      .order('date', { ascending: true });

    if (error) this.supabase.handleError(error, 'events');
    return data || [];
  }

  async findOne(id: string) {
    const { data: event, error } = await this.supabase
      .from('events')
      .select('*, trips:trips(*, driver:users(*), vehicle:vehicles(*), ride_requests:ride_requests(*), passenger_assignments:passenger_assignments(*, user:users(*)))')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Event ${id} not found`);
      }
      this.supabase.handleError(error, 'events');
    }

    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    return event;
  }

  async update(id: string, dto: UpdateEventDto) {
    const { data: event, error: findError } = await this.supabase
      .from('events')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Only allow edits in DRAFT or PUBLISHED status
    if (event.status !== EventStatus.DRAFT && event.status !== EventStatus.PUBLISHED) {
      throw new BadRequestException(
        `Cannot edit event in ${event.status} status`,
      );
    }

    // Build update data with snake_case column mapping
    const updateData: Record<string, unknown> = {};
    if (dto.title !== undefined) updateData['title'] = dto.title;
    if (dto.description !== undefined) updateData['description'] = dto.description;
    if (dto.date !== undefined) updateData['date'] = new Date(dto.date);
    if (dto.origin !== undefined) updateData['origin'] = dto.origin;
    if (dto.originLat !== undefined) updateData['origin_lat'] = dto.originLat;
    if (dto.originLng !== undefined) updateData['origin_lng'] = dto.originLng;
    if (dto.destination !== undefined) updateData['destination'] = dto.destination;
    if (dto.destLat !== undefined) updateData['dest_lat'] = dto.destLat;
    if (dto.destLng !== undefined) updateData['dest_lng'] = dto.destLng;
    if (dto.capacity !== undefined) updateData['capacity'] = dto.capacity;
    if (dto.arrivalTime !== undefined) updateData['arrival_time'] = dto.arrivalTime ? new Date(dto.arrivalTime) : null;

    const { data: updated, error: updateError } = await this.supabase
      .from('events')
      .update(updateData)
      .eq('id', id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'events');
    return updated;
  }

  async updateStatus(id: string, dto: UpdateEventStatusDto) {
    const { data: event, error: findError } = await this.supabase
      .from('events')
      .select('id, status, date, organization_id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Validate state transition
    const currentStatus = event.status as EventStatus;
    const allowed = VALID_TRANSITIONS[currentStatus];
    if (!allowed || !allowed.includes(dto.status)) {
      throw new BadRequestException(
        `Invalid state transition: ${event.status} → ${dto.status}. ` +
        `Allowed transitions from ${event.status}: ${allowed?.join(', ') || 'none'}`,
      );
    }

    // Check for overlapping events when transitioning to OPEN
    if (dto.status === EventStatus.OPEN) {
      const overlapping = await this.checkOverlapping({
        id: event.id,
        date: new Date(event.date),
        organizationId: event.organization_id,
      });
      if (overlapping) {
        throw new ConflictException(
          'An overlapping event already exists for this time slot',
        );
      }
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('events')
      .update({ status: dto.status })
      .eq('id', id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'events');
    return updated;
  }

  async remove(id: string) {
    const { data: event, error: findError } = await this.supabase
      .from('events')
      .select('status')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${id} not found`);
    }

    // Only allow deleting DRAFT events
    if (event.status !== EventStatus.DRAFT) {
      throw new BadRequestException(
        'Only draft events can be deleted',
      );
    }

    const { error: deleteError } = await this.supabase
      .from('events')
      .delete()
      .eq('id', id);

    if (deleteError) this.supabase.handleError(deleteError, 'events');
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

    const { data: sameDayEvents, error } = await this.supabase
      .from('events')
      .select('id')
      .eq('organization_id', event.organizationId)
      .neq('id', event.id)
      .gte('date', startOfDay.toISOString())
      .lte('date', endOfDay.toISOString())
      .in('status', [EventStatus.OPEN, EventStatus.PUBLISHED, EventStatus.CLOSED]);

    if (error) this.supabase.handleError(error, 'events');
    return (sameDayEvents?.length ?? 0) > 0;
  }
}
