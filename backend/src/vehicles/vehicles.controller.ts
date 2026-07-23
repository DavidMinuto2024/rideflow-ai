import {
  Controller,
  Get,
  Post,
  Patch,
  Delete,
  Body,
  Param,
  Query,
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
import { VehiclesService } from './vehicles.service';
import { CreateVehicleDto } from './dto/create-vehicle.dto';
import { UpdateVehicleDto } from './dto/update-vehicle.dto';

@Controller()
export class VehiclesController {
  constructor(private readonly vehiclesService: VehiclesService) {}

  @Post('organizations/:organizationId/vehicles')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN)
  async create(
    @Param('organizationId') organizationId: string,
    @Body() dto: CreateVehicleDto,
    @CurrentUser() user: User,
  ) {
    return this.vehiclesService.create(organizationId, dto, user.id);
  }

  @Get('organizations/:organizationId/vehicles')
  @UseGuards(AuthGuard)
  async findByOrganization(
    @Param('organizationId') organizationId: string,
    @Query('includeInactive') includeInactive?: string,
  ) {
    return this.vehiclesService.findByOrganization(
      organizationId,
      includeInactive === 'true',
    );
  }

  @Get('vehicles/:id')
  @UseGuards(AuthGuard)
  async findOne(@Param('id') id: string) {
    return this.vehiclesService.findOne(id);
  }

  @Patch('vehicles/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN)
  async update(
    @Param('id') id: string,
    @Body() dto: UpdateVehicleDto,
  ) {
    return this.vehiclesService.update(id, dto);
  }

  @Delete('vehicles/:id')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN)
  @HttpCode(HttpStatus.NO_CONTENT)
  async remove(@Param('id') id: string) {
    await this.vehiclesService.remove(id);
  }

  @Post('vehicles/:id/toggle-active')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.ORG_ADMIN, Role.DRIVER)
  @HttpCode(HttpStatus.OK)
  async toggleActive(@Param('id') id: string) {
    return this.vehiclesService.toggleActive(id);
  }
}
