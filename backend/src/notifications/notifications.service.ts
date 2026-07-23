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
 * - TRIP_ASSIGNED — passenger was assigned to a trip
 * - EVENT_REMINDER — upcoming event reminder
 */
export type NotificationType =
  | 'RIDE_REQUESTED'
  | 'RIDE_APPROVED'
  | 'RIDE_REJECTED'
  | 'TRIP_ASSIGNED'
  | 'EVENT_REMINDER';

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
        type: dto.type,
        title: dto.title,
        message: dto.message,
        userId: dto.userId,
        read: dto.read ?? false,
      },
    });
  }
}
