import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Injectable()
export class VehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(organizationId: string, dto: CreateVehicleDto, driverId: string) {
    // Check capacity doesn't exceed limit
    if (dto.capacity && dto.capacity > 20) {
      throw new BadRequestException('Capacity cannot exceed 20');
    }

    return this.prisma.vehicle.create({
      data: {
        plate: dto.plate,
        model: dto.model,
        capacity: dto.capacity ?? 4,
        organizationId,
        driverId,
      },
    });
  }

  async findByOrganization(organizationId: string, includeInactive = false) {
    const where: Record<string, unknown> = { organizationId };

    if (!includeInactive) {
      where['isActive'] = true;
    }

    return this.prisma.vehicle.findMany({
      where,
      include: { driver: { select: { id: true, name: true, email: true } } },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id },
      include: { driver: true },
    });

    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    return vehicle;
  }

  async update(id: string, dto: UpdateVehicleDto) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    // Validate capacity change
    if (dto.capacity !== undefined && dto.capacity > 20) {
      throw new BadRequestException('Capacity cannot exceed 20');
    }

    // If driverId is explicitly set to null, unassign the driver
    const data: Record<string, unknown> = { ...dto };
    if (dto.driverId === null) {
      data['driverId'] = null;
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: data as any,
    });
  }

  async remove(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    // Check if vehicle has active trips
    const activeTrips = await this.prisma.trip.findFirst({
      where: {
        vehicleId: id,
        event: {
          status: {
            in: ['DRAFT', 'PUBLISHED', 'OPEN'],
          },
        },
      },
    });

    if (activeTrips) {
      throw new ConflictException(
        'Cannot delete vehicle with active trips',
      );
    }

    await this.prisma.vehicle.delete({ where: { id } });
    return { deleted: true };
  }

  async toggleActive(id: string) {
    const vehicle = await this.prisma.vehicle.findUnique({ where: { id } });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${id} not found`);
    }

    return this.prisma.vehicle.update({
      where: { id },
      data: { isActive: !vehicle.isActive },
    });
  }
}
