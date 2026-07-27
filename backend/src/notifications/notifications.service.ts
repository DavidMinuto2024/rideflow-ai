import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

/**
 * Notification types used across the platform:
 * - RIDE_REQUESTED — new ride request for event admins
 * - RIDE_APPROVED — passenger's ride was approved
 * - RIDE_REJECTED — passenger's ride was rejected
 * - RIDE_CANCELLED — passenger cancelled their ride
 * - TRIP_ASSIGNED — passenger was assigned to a trip
 * - EVENT_REMINDER — upcoming event reminder
 * - ESTIMATED_PICKUP_TIME — pickup time changed due to re-optimization
 */
export type NotificationType =
  | 'RIDE_REQUESTED'
  | 'RIDE_APPROVED'
  | 'RIDE_REJECTED'
  | 'RIDE_CANCELLED'
  | 'TRIP_ASSIGNED'
  | 'EVENT_REMINDER'
  | 'ESTIMATED_PICKUP_TIME';

@Injectable()
export class NotificationsService {
  constructor(private readonly supabase: SupabaseDataService) {}

  async findByUser(userId: string) {
    const { data, error } = await this.supabase
      .from('notifications')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false });

    if (error) this.supabase.handleError(error, 'notifications');
    return data || [];
  }

  async markAsRead(id: string, userId: string) {
    const { data: notification, error: findError } = await this.supabase
      .from('notifications')
      .select('id')
      .eq('id', id)
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'notifications');
    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    const { data: updated, error: updateError } = await this.supabase
      .from('notifications')
      .update({ read: true })
      .eq('id', id)
      .select()
      .single();

    if (updateError) this.supabase.handleError(updateError, 'notifications');
    return updated;
  }

  async create(dto: CreateNotificationDto) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        type: dto.type,
        title: dto.title,
        message: dto.message,
        user_id: dto.userId,
        read: dto.read ?? false,
      })
      .select()
      .single();

    if (error) this.supabase.handleError(error, 'notifications');
    return data;
  }

  /**
   * Create an ESTIMATED_PICKUP_TIME notification for a passenger
   * when their estimated pickup time changes due to re-optimization.
   */
  async createPickupTimeNotification(
    tripId: string,
    passengerId: string,
    estimatedPickupTime: Date,
  ) {
    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        type: 'ESTIMATED_PICKUP_TIME',
        title: 'Pickup time updated',
        message: `Your estimated pickup time has been updated to ${estimatedPickupTime.toLocaleTimeString()}`,
        user_id: passengerId,
      })
      .select()
      .single();

    if (error) this.supabase.handleError(error, 'notifications');
    return data;
  }
}
