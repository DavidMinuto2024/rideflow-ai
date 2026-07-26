import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { RidesService } from './rides.service';
import { CreateRideRequestDto } from './dto/create-ride-request.dto';
import { UpdateRideRequestDto } from './dto/update-ride-request.dto';
import { DirectAssignDto } from './dto/direct-assign.dto';

@Controller()
export class RidesController {
  constructor(private readonly ridesService: RidesService) {}

  // ─── Ride Requests ─────────────────────────────────────

  @Post('events/:eventId/requests')
  @UseGuards(AuthGuard)
  async createRequest(
    @Param('eventId') eventId: string,
    @Body() dto: CreateRideRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.ridesService.createRequest(eventId, user.id, dto);
  }

  @Get('events/:eventId/requests')
  @UseGuards(AuthGuard)
  async findRequestsByEvent(@Param('eventId') eventId: string) {
    return this.ridesService.findRequestsByEvent(eventId);
  }

  @Patch('requests/:id')
  @UseGuards(AuthGuard)
  async updateRequestStatus(
    @Param('id') id: string,
    @Body() dto: UpdateRideRequestDto,
    @CurrentUser() user: User,
  ) {
    return this.ridesService.updateRequestStatus(id, dto, user.id);
  }

  // ─── Auto-Assignment ───────────────────────────────────

  @Post('events/:eventId/assign')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DRIVER)
  async autoAssign(
    @Param('eventId') eventId: string,
    @CurrentUser() user: User,
  ) {
    return this.ridesService.autoAssign(eventId, user.id);
  }

  @Post('events/:eventId/direct-assign')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DRIVER)
  async directAssign(
    @Param('eventId') eventId: string,
    @Body() dto: DirectAssignDto,
    @CurrentUser() user: User,
  ) {
    return this.ridesService.directAssign(eventId, dto, user.id);
  }

  // ─── Trips ─────────────────────────────────────────────

  @Get('events/:eventId/trips')
  @UseGuards(AuthGuard)
  async findTripsByEvent(@Param('eventId') eventId: string) {
    return this.ridesService.findTripsByEvent(eventId);
  }

  @Get('events/:eventId/trips/:tripId')
  @UseGuards(AuthGuard)
  async findTripById(
    @Param('eventId') eventId: string,
    @Param('tripId') tripId: string,
  ) {
    return this.ridesService.findTripById(eventId, tripId);
  }
}
