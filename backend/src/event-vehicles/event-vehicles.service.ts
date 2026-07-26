import {
  Injectable,
  NotFoundException,
  ConflictException,
  BadRequestException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterVehicleDto, UpdateEventVehicleDto } from './dto/register-vehicle.dto';

@Injectable()
export class EventVehiclesService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Register a vehicle for a specific event.
   * Computes pico y placa status based on event date and plate.
   */
  async register(eventId: string, driverId: string, dto: RegisterVehicleDto) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    const vehicle = await this.prisma.vehicle.findFirst({
      where: { id: dto.vehicleId, driverId },
    });
    if (!vehicle) {
      throw new BadRequestException('Vehicle not found or not assigned to you');
    }

    // Check for duplicate registration
    const existing = await this.prisma.eventVehicle.findUnique({
      where: { eventId_vehicleId: { eventId, vehicleId: dto.vehicleId } },
    });
    if (existing) {
      throw new ConflictException('Vehicle already registered for this event');
    }

    const picoYPlaca = this.checkPicoYPlaca(vehicle.plate, event.date);

    return this.prisma.eventVehicle.create({
      data: {
        eventId,
        vehicleId: dto.vehicleId,
        driverId,
        startLocation: dto.startLocation,
        startLat: dto.startLat,
        startLng: dto.startLng,
        picoYPlaca,
      },
      include: {
        vehicle: true,
        event: { select: { id: true, title: true, date: true } },
      },
    });
  }

  /**
   * Find all vehicles registered for an event.
   */
  async findByEvent(eventId: string) {
    const event = await this.prisma.event.findUnique({ where: { id: eventId } });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return this.prisma.eventVehicle.findMany({
      where: { eventId },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, email: true } },
      },
      orderBy: { createdAt: 'asc' },
    });
  }

  /**
   * Find a single EventVehicle by ID.
   */
  async findOne(id: string) {
    const eventVehicle = await this.prisma.eventVehicle.findUnique({
      where: { id },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, email: true } },
        event: { select: { id: true, title: true, date: true } },
      },
    });

    if (!eventVehicle) {
      throw new NotFoundException(`EventVehicle ${id} not found`);
    }

    return eventVehicle;
  }

  /**
   * Update an EventVehicle's start location.
   */
  async update(id: string, dto: UpdateEventVehicleDto) {
    const eventVehicle = await this.prisma.eventVehicle.findUnique({
      where: { id },
    });
    if (!eventVehicle) {
      throw new NotFoundException(`EventVehicle ${id} not found`);
    }

    return this.prisma.eventVehicle.update({
      where: { id },
      data: {
        startLocation: dto.startLocation,
        startLat: dto.startLat,
        startLng: dto.startLng,
      },
      include: {
        vehicle: true,
        driver: { select: { id: true, name: true, email: true } },
      },
    });
  }

  /**
   * Remove a vehicle registration from an event.
   */
  async remove(id: string) {
    const eventVehicle = await this.prisma.eventVehicle.findUnique({
      where: { id },
    });
    if (!eventVehicle) {
      throw new NotFoundException(`EventVehicle ${id} not found`);
    }

    await this.prisma.eventVehicle.delete({ where: { id } });
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
    const vehicle = await this.prisma.vehicle.findUnique({
      where: { id: vehicleId },
    });
    if (!vehicle) {
      throw new NotFoundException(`Vehicle ${vehicleId} not found`);
    }

    const event = await this.prisma.event.findUnique({
      where: { id: eventId },
    });
    if (!event) {
      throw new NotFoundException(`Event ${eventId} not found`);
    }

    return this.checkPicoYPlaca(vehicle.plate, event.date);
  }
}
