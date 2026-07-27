import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly supabase: SupabaseDataService) {}

  async create(organizationId: string, dto: CreateVehicleDto, driverId: string) {
    // Check capacity doesn't exceed limit
    if (dto.capacity && dto.capacity > 20) {
      throw new BadRequestException('Capacity cannot exceed 20');
    }

    const { data, error } = await this.supabase
      .from('vehicles')
      .insert({
        id: crypto.randomUUID(),
        plate: dto.plate,
        model: dto.model,
        capacity: dto.capacity ?? 4,
        organization_id: organizationId,
        driver_id: driverId,
      })
      .select()
      .single();

    if (error) this.supabase.handleError(error, 'vehicles');
    return data;
  }

  async findByOrganization(organizationId: string, includeInactive = false) {
    let query = this.supabase
      .from('vehicles')
      .select('*, driver:users(id, name, email)')
      .eq('organization_id', organizationId);

    if (!includeInactive) {
      query = query.eq('is_active', true);
    }

    const { data, error } = await query.order('created_at', {
      ascending: false,
    });

    if (error) this.supabase.handleError(error, 'vehicles');
    return data || [];
  }

  async findOne(id: string) {
    const { data: vehicle, error } = await this.supabase
      .from('vehicles')
      .select('*, driver:users(*)')
      .eq('id', id)
      .single();

    if (error) {
      if (error.code === 'PGRST116') {
        throw new NotFoundException(`Vehicle ${id} not found`);
      }
      this.supabase.handleError(error, 'vehicles');
    }

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    // Verify exists
    const { data: existing, error: findError } = await this.supabase
      .from('vehicles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'vehicles');
    if (!existing) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    // Validate capacity change
    if (dto.capacity !== undefined && dto.capacity > 20) {
      throw new BadRequestException('Capacity cannot exceed 20');
    }

    // Build update data with snake_case column mapping
    const data: Record<string, unknown> = {};
    if (dto.plate !== undefined) data['plate'] = dto.plate;
    if (dto.model !== undefined) data['model'] = dto.model;
    if (dto.capacity !== undefined) data['capacity'] = dto.capacity;
    if (dto.isActive !== undefined) data['is_active'] = dto.isActive;
    if ('driverId' in dto) data['driver_id'] = dto.driverId;

    const { data: updated, error: updateError } = await this.supabase
      .from('vehicles')
      .update(data)
      .eq('id', id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'vehicles');
    return updated;
  }

  async remove(id: string) {
    // Verify exists
    const { data: existing, error: findError } = await this.supabase
      .from('vehicles')
      .select('id')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'vehicles');
    if (!existing) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    // Check if vehicle has active trips
    const { data: vehicleTrips, error: tripsError } = await this.supabase
      .from('trips')
      .select('id, event_id')
      .eq('vehicle_id', id);

    if (tripsError) this.supabase.handleError(tripsError, 'trips');

    const tripEventIds = (vehicleTrips || []).map((t: any) => t.event_id);
    let activeTrips: any[] = [];
    if (tripEventIds.length > 0) {
      const { data: activeEvents } = await this.supabase
        .from('events')
        .select('id')
        .in('id', tripEventIds)
        .in('status', ['DRAFT', 'PUBLISHED', 'OPEN']);

      if (activeEvents && activeEvents.length > 0) {
        activeTrips = vehicleTrips?.filter((t: any) =>
          activeEvents.some((e: any) => e.id === t.event_id),
        ) || [];
      }
    }
    if (activeTrips && activeTrips.length > 0) {
      throw new ConflictException('Cannot delete vehicle with active trips');
    }

    const { error: deleteError } = await this.supabase
      .from('vehicles')
      .delete()
      .eq('id', id);

    if (deleteError) this.supabase.handleError(deleteError, 'vehicles');
    return { deleted: true };
  }

  async toggleActive(id: string) {
    const { data: vehicle, error: findError } = await this.supabase
      .from('vehicles')
      .select('is_active')
      .eq('id', id)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'vehicles');
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('vehicles')
      .update({ is_active: !vehicle.is_active })
      .eq('id', id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'vehicles');
    return updated;
  }
}
