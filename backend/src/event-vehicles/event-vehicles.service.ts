import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { RegisterVehicleDto, UpdateEventVehicleDto } from './dto/register-vehicle.dto';

@Injectable()
export class EventVehiclesService {
  constructor(private readonly supabase: SupabaseDataService) {}

  /**
   * Register a vehicle for a specific event.
   * Computes pico y placa status based on event date and plate.
   */
  async register(eventId: string, driverId: string, dto: RegisterVehicleDto) {
    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id, date')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const { data: vehicle, error: vehicleError } = await this.supabase
      .from('vehicles')
      .select('id, plate')
      .eq('id', dto.vehicleId)
      .eq('driver_id', driverId)
      .maybeSingle();

    if (vehicleError) this.supabase.handleError(vehicleError, 'vehicles');
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found or not assigned to you');
    }

    // Check for duplicate registration
    const { data: existing, error: existingError } = await this.supabase
      .from('event_vehicles')
      .select('id')
      .eq('event_id', eventId)
      .eq('vehicle_id', dto.vehicleId)
      .maybeSingle();

    if (existingError) this.supabase.handleError(existingError, 'event_vehicles');
    if (existing) {
      throw new ConflictException('Vehicle already registered for this event');
    }

    const picoYPlaca = this.checkPicoYPlaca(vehicle.plate, event.date);

    const { data: eventVehicle, error: createError } = await this.supabase
      .from('event_vehicles')
      .insert({
        id: crypto.randomUUID(),
        event_id: eventId,
        vehicle_id: dto.vehicleId,
        driver_id: driverId,
        start_location: dto.startLocation,
        start_lat: dto.startLat,
        start_lng: dto.startLng,
        pico_y_placa: picoYPlaca,
      })
      .select('*, vehicle:vehicles(*), event:events(id, title, date)')
      .single();

    if (createError) this.supabase.handleError(createError, 'event_vehicles');
    return eventVehicle;
  }

  /**
   * Find all vehicles registered for an event.
   */
  async findByEvent(eventId: string) {
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
      .from('event_vehicles')
      .select('*, vehicle:vehicles(*), driver:users(id, name, email)')
      .eq('event_id', eventId)
      .order('created_at', { ascending: true });

    if (error) this.supabase.handleError(error, 'event_vehicles');
    return data || [];
  }

  /**
   * Find a single EventVehicle by ID.
   */
  async findOne(id: string) {
    const { data: eventVehicle, error } = await this.supabase
      .from('event_vehicles')
      .select(
        '*, vehicle:vehicles(*), driver:users(id, name, email), event:events(id, title, date)',
      )
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`EventVehicle ${id} not found`);
      }
      this.supabase.handleError(error, 'event_vehicles');
    }

    if (!eventVehicle) {
      throw new NotFoundException(`EventVehicle ${id} not found`);
    }

    return eventVehicle;
  }

  /**
   * Update an EventVehicle's start location.
   */
  async update(id: string, dto: UpdateEventVehicleDto) {
    const { data: existing, error: findError } = await this.supabase
      .from('event_vehicles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'event_vehicles');
    if (!existing) {
      throw new NotFoundException(`EventVehicle ${id} not found`);
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('event_vehicles')
      .update({
        start_location: dto.startLocation,
        start_lat: dto.startLat,
        start_lng: dto.startLng,
      })
      .eq('id', id)
      .select('*, vehicle:vehicles(*), driver:users(id, name, email)')
      .single();

    if (updateError) this.supabase.handleError(updateError, 'event_vehicles');
    return updated;
  }

  /**
   * Remove a vehicle registration from an event.
   */
  async remove(id: string) {
    const { data: existing, error: findError } = await this.supabase
      .from('event_vehicles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'event_vehicles');
    if (!existing) {
      throw new NotFoundException(`EventVehicle ${id} not found`);
    }

    const { error: deleteError } = await this.supabase
      .from('event_vehicles')
      .delete()
      .eq('id', id);

    if (deleteError) this.supabase.handleError(deleteError, 'event_vehicles');
    return { deleted: true };
  }

  // ─── Pico y Placa ────────────────────────────────────────

  /**
   * Check pico y placa restriction for a vehicle on a given date.
   * Bogotá rule:
   *   Monday: plates ending in 1,2 → restricted
   *   Tuesday: 3,4 → restricted
   *   Wednesday: 5,6 → restricted
   *   Thursday: 7,8 → restricted
   *   Friday: 9,0 → restricted
   *   Weekend: no restriction
   */
  checkPicoYPlaca(plate: string | null, date: Date): boolean {
    if (!plate || plate.length === 0) return false;

    const lastDigit = parseInt(plate.slice(-1), 10);
    if (isNaN(lastDigit)) return false;

    const dayOfWeek = date.getDay(); // 0=Sunday, 6=Saturday
    if (dayOfWeek === 0 || dayOfWeek === 6) return false;

    const restrictions: Record<number, number[]> = {
      1: [1, 2], // Monday
      2: [3, 4], // Tuesday
      3: [5, 6], // Wednesday
      4: [7, 8], // Thursday
      5: [9, 0], // Friday
    };

    const restrictedDigits = restrictions[dayOfWeek] ?? [];
    return restrictedDigits.includes(lastDigit);
  }

  /**
   * Check pico y placa by vehicleId and eventId.
   * Returns boolean — non-blocking alert.
   */
  async checkPicoYPlacaForEvent(vehicleId: string, eventId: string): Promise<boolean> {
    const { data: vehicle, error: vehicleError } = await this.supabase
      .from('vehicles')
      .select('id, plate')
      .eq('id', vehicleId)
      .maybeSingle();

    if (vehicleError) this.supabase.handleError(vehicleError, 'vehicles');
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const { data: event, error: eventError } = await this.supabase
      .from('events')
      .select('id, date')
      .eq('id', eventId)
      .maybeSingle();

    if (eventError) this.supabase.handleError(eventError, 'events');
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return this.checkPicoYPlaca(vehicle.plate, event.date);
  }
}
