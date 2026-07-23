import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { Role, EventStatus, RequestStatus } from '@prisma/client';

@Injectable()
export class DashboardService {
  constructor(private readonly prisma: PrismaService) {}

  async getStats(userId: string) {
    // Get all organizations the user belongs to
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId },
      include: { organization: true },
    });

    const organizationIds = memberships.map((m) => m.organizationId);

    if (organizationIds.length === 0) {
      return {
        organizations: 0,
        activeEvents: 0,
        totalParticipants: 0,
        tripsCompletedToday: 0,
        pendingRequests: 0,
        vehicleUtilization: 0,
      };
    }

    // ─── Active events count ───
    const activeEvents = await this.prisma.event.count({
      where: {
        organizationId: { in: organizationIds },
        status: { in: [EventStatus.OPEN, EventStatus.PUBLISHED] },
      },
    });

    // ─── Total participants (all users in user's orgs) ───
    const totalParticipants = await this.prisma.organizationMember.count({
      where: { organizationId: { in: organizationIds } },
    });

    // ─── Trips today (events happening today) ───
    const todayStart = new Date();
    todayStart.setHours(0, 0, 0, 0);
    const todayEnd = new Date();
    todayEnd.setHours(23, 59, 59, 999);

    const tripsToday = await this.prisma.trip.count({
      where: {
        event: {
          organizationId: { in: organizationIds },
          date: { gte: todayStart, lte: todayEnd },
        },
      },
    });

    // ─── Pending ride requests in active events ───
    const pendingRequests = await this.prisma.rideRequest.count({
      where: {
        status: RequestStatus.PENDING,
        event: {
          organizationId: { in: organizationIds },
        },
      },
    });

    // ─── Vehicle utilization ───
    // Calculate what percentage of available capacity is currently occupied
    const vehicleStats = await this.prisma.vehicle.findMany({
      where: {
        organizationId: { in: organizationIds },
        isActive: true,
      },
      select: { capacity: true, id: true },
    });

    const totalCapacity = vehicleStats.reduce(
      (sum, v) => sum + v.capacity,
      0,
    );

    // Count all accepted ride requests across user's orgs
    const acceptedRequests = await this.prisma.rideRequest.count({
      where: {
        status: RequestStatus.ACCEPTED,
        event: {
          organizationId: { in: organizationIds },
        },
      },
    });

    const vehicleUtilization =
      totalCapacity > 0
        ? Math.round((acceptedRequests / totalCapacity) * 100)
        : 0;

    return {
      organizations: organizationIds.length,
      activeEvents,
      totalParticipants,
      tripsToday,
      pendingRequests,
      vehicleUtilization,
    };
  }
}
