import {
  Injectable,
  NotFoundException,
  Logger,
} from '@nestjs/common';
import { SupabaseDataService } from '../supabase/supabase-data.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { EmailService } from './email.service';
import { PushService } from './push.service';

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
  private readonly logger = new Logger(NotificationsService.name);

  constructor(
    private readonly supabase: SupabaseDataService,
    private readonly emailService: EmailService,
    private readonly pushService: PushService,
  ) {}

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

  /**
   * Get notification preferences for a user (internal method).
   * Creates default preferences (email=true, push=true) if none exist.
   */
  private async getPreferencesInternal(userId: string): Promise<{ email: boolean; push: boolean }> {
    const { data: pref, error: findError } = await this.supabase
      .from('notification_preferences')
      .select('email, push')
      .eq('user_id', userId)
      .maybeSingle();

    if (findError) this.supabase.handleError(findError, 'notification_preferences');

    if (pref) {
      return { email: pref.email, push: pref.push };
    }

    // Create default preferences
    const { data: newPref, error: createError } = await this.supabase
      .from('notification_preferences')
      .insert({
        id: crypto.randomUUID(),
        user_id: userId,
        email: true,
        push: true,
      })
      .select('email, push')
      .single();

    if (createError) this.supabase.handleError(createError, 'notification_preferences');
    return { email: newPref.email, push: newPref.push };
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

    // Check user preferences before sending multichannel
    const prefs = await this.getPreferencesInternal(dto.userId);

    // Multichannel dispatch (Push + Email) — only if user has enabled them
    if (prefs.push && this.pushService && dto.userId) {
      this.pushService.sendPush({
        userId: dto.userId,
        title: dto.title,
        body: dto.message ?? '',
        data: { type: dto.type },
      }).catch((err) => { this.logger.error('Push notification failed', err instanceof Error ? err.stack : err); });
    }

    if (prefs.email && this.emailService && dto.userEmail) {
      this.emailService.sendEmail({
        to: dto.userEmail,
        subject: dto.title,
        body: dto.message ?? ''
      }).catch((err) => { this.logger.error('Email notification failed', err instanceof Error ? err.stack : err); });
    }

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
    passengerEmail?: string,
  ) {
    const title = 'Pickup time updated';
    const message = `Your estimated pickup time has been updated to ${estimatedPickupTime.toLocaleTimeString()}`;

    const { data, error } = await this.supabase
      .from('notifications')
      .insert({
        id: crypto.randomUUID(),
        type: 'ESTIMATED_PICKUP_TIME',
        title,
        message,
        user_id: passengerId,
      })
      .select()
      .single();

    if (error) this.supabase.handleError(error, 'notifications');

    // Check user preferences before sending multichannel
    const prefs = await this.getPreferencesInternal(passengerId);

    // Multichannel dispatch: Push + Email for pickup time notification
    if (prefs.push && this.pushService && passengerId) {
      this.pushService.sendPush({
        userId: passengerId,
        title,
        body: message,
        data: { type: 'ESTIMATED_PICKUP_TIME', tripId },
      }).catch((err) => { this.logger.error('Push notification failed', err instanceof Error ? err.stack : err); });
    }

    if (prefs.email && this.emailService && passengerEmail) {
      this.emailService.sendEmail({
        to: passengerEmail,
        subject: title,
        body: message,
      }).catch((err) => { this.logger.error('Email notification failed', err instanceof Error ? err.stack : err); });
    }

    return data;
  }

  /**
   * Register or update a device token for push notifications.
   * Upserts by userId + token (unique constraint on token).
   */
  async registerDeviceToken(userId: string, token: string, platform: string) {
    const { data, error } = await this.supabase
      .from('user_device_tokens')
      .upsert({
        id: crypto.randomUUID(),
        user_id: userId,
        token,
        platform,
      }, { onConflict: 'token' })
      .select()
      .single();

    if (error) this.supabase.handleError(error, 'user_device_tokens');
    return data;
  }

  /**
   * Revoke all device tokens for a user (logout).
   */
  async revokeDeviceToken(userId: string) {
    const { error } = await this.supabase
      .from('user_device_tokens')
      .delete()
      .eq('user_id', userId);

    if (error) this.supabase.handleError(error, 'user_device_tokens');
  }

  /**
   * Get notification preferences for a user (public wrapper).
   */
  async getPreferences(userId: string): Promise<{ email: boolean; push: boolean }> {
    return this.getPreferencesInternal(userId);
  }

  /**
   * Update notification preferences for a user.
   */
  async updatePreferences(
    userId: string,
    dto: { email?: boolean; push?: boolean },
  ): Promise<{ email: boolean; push: boolean }> {
    const { data, error } = await this.supabase
      .from('notification_preferences')
      .upsert({
        id: crypto.randomUUID(),
        user_id: userId,
        email: dto.email ?? true,
        push: dto.push ?? true,
      }, { onConflict: 'user_id' })
      .select('email, push')
      .single();

    if (error) this.supabase.handleError(error, 'notification_preferences');
    return { email: data.email, push: data.push };
  }
}