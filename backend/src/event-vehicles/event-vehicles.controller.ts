import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User, Role } from '@prisma/client';
import { EventVehiclesService } from './event-vehicles.service';
import { RegisterVehicleDto, UpdateEventVehicleDto } from './dto/register-vehicle.dto';

@Controller()
export class EventVehiclesController {
  constructor(private readonly eventVehiclesService: EventVehiclesService) {}

  @Post('events/:eventId/vehicles')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ORG_ADMIN)
  async register(
    @Param('eventId') eventId: string,
    @Body() dto: RegisterVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.eventVehiclesService.register(eventId, user.id, dto);
  }

  @Get('events/:eventId/vehicles')
  @UseGuards(AuthGuard)
  async findByEvent(@Param('eventId') eventId: string) {
    return this.eventVehiclesService.findByEvent(eventId);
  }

  @Get('event-vehicles/:id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.eventVehiclesService.findOne(id);
  }

  @Get('event-vehicles/:id/pico-y-placa')
  @UseGuards(AuthGuard)
  async checkPicoYPlaca(@Param('id') id: string) {
    const ev = await this.eventVehiclesService.findOne(id);
    const active = await this.eventVehiclesService.checkPicoYPlacaForEvent(
      ev.vehicle_id,
      ev.event_id,
    );
    return { picoYPlacaActive: active };
  }

  @Patch('event-vehicles/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ORG_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventVehicleDto,
  ) {
    return this.eventVehiclesService.update(id, dto);
  }

  @Delete('event-vehicles/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.eventVehiclesService.remove(id);
  }
}
