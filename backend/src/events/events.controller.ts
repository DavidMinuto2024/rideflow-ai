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
import { EventsService } from './events.service';
import { CreateEventDto } from './dto/create-event.dto';
import { UpdateEventDto } from './dto/update-event.dto';
import { UpdateEventStatusDto } from './dto/update-event-status.dto';

@Controller()
export class EventsController {
  constructor(private readonly eventsService: EventsService) {}

  @Post('organizations/:organizationId/events')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DRIVER)
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateEventDto,
  ) {
    return this.eventsService.create(organizationId, dto);
  }

  @Get('organizations/:organizationId/events')
  @UseGuards(AuthGuard)
  async findByOrganization(
    @Param('organizationId') organizationId: string,
  ) {
    return this.eventsService.findByOrganization(organizationId);
  }

  @Get('events/:id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.eventsService.findOne(id);
  }

  @Patch('events/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DRIVER)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateEventDto,
  ) {
    return this.eventsService.update(id, dto);
  }

  @Patch('events/:id/status')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DRIVER)
  async updateStatus(
    @Param('id') id: string,
    @Body() dto: UpdateEventStatusDto,
  ) {
    return this.eventsService.updateStatus(id, dto);
  }

  @Delete('events/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.eventsService.remove(id);
  }
}
