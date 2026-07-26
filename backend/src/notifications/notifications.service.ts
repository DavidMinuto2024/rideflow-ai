import {
  Injectable,
  NotFoundException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
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
  constructor(private readonly prisma: PrismaService) {}

  async findByUser(userId: string) {
    return this.prisma.notification.findMany({
      where: { userId },
      orderBy: { createdAt: 'desc' },
    });
  }

  async markAsRead(id: string, userId: string) {
    const notification = await this.prisma.notification.findFirst({
      where: { id, userId },
    });

    if (!notification) {
      throw new NotFoundException(`Notification ${id} not found`);
    }

    return this.prisma.notification.update({
      where: { id },
      data: { read: true },
    });
  }

  async create(dto: CreateNotificationDto) {
    return this.prisma.notification.create({
      data: {
        type: dto.type as any,
        title: dto.title,
        message: dto.message,
        userId: dto.userId,
        read: dto.read ?? false,
      },
    });
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
    return this.prisma.notification.create({
      data: {
        type: 'ESTIMATED_PICKUP_TIME',
        title: 'Pickup time updated',
        message: `Your estimated pickup time has been updated to ${estimatedPickupTime.toLocaleTimeString()}`,
        userId: passengerId,
      },
    });
  }
}
