import {
  Controller,
  Get,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { Role, User } from '@prisma/client';
import { DashboardService, DriverDashboardResponse, PassengerDashboardResponse } from './dashboard.service';

@Controller()
export class DashboardController {
  constructor(private readonly dashboardService: DashboardService) {}

  @Get('dashboard/stats')
  @UseGuards(AuthGuard)
  async getStats(@CurrentUser() user: User) {
    return this.dashboardService.getStats(user.id);
  }

  @Get('dashboard/driver')
  @UseGuards(AuthGuard, RolesGuard)
  @Roles(Role.DRIVER, Role.ORG_ADMIN)
  async getDriverDashboard(@CurrentUser() user: User): Promise<DriverDashboardResponse> {
    return this.dashboardService.getDriverDashboard(user.id);
  }

  @Get('dashboard/passenger')
  @UseGuards(AuthGuard)
  async getPassengerDashboard(@CurrentUser() user: User): Promise<PassengerDashboardResponse> {
    return this.dashboardService.getPassengerDashboard(user.id);
  }
}
