import {
  Controller,
  Get,
  Patch,
  Delete,
  Param,
  Body,
  UseGuards,
  HttpCode,
  HttpStatus,
  NotImplementedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';
import { AuthGuard } from '../auth/auth.guard';
import { RolesGuard } from '../auth/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';
import { AdminService } from './admin.service';
import { UpdateUserRoleDto } from './dto/update-user-role.dto';

@Controller('admin')
@UseGuards(AuthGuard, RolesGuard)
@Roles(Role.SUPER_ADMIN)
export class AdminController {
  constructor(private readonly adminService: AdminService) {}

  @Get('stats')
  async getStats() {
    return this.adminService.getStats();
  }

  @Get('users')
  async getUsers() {
    return this.adminService.getUsers();
  }

  @Patch('users/:userId')
  async updateUserRole(
    @Param('userId') userId: string,
    @Body() dto: UpdateUserRoleDto,
  ) {
    return this.adminService.updateUserRole(userId, dto);
  }

  @Delete('users/:userId')
  @HttpCode(HttpStatus.NOT_IMPLEMENTED)
  async disableUser() {
    throw new NotImplementedException(
      'User disable endpoint is not yet implemented. Use PATCH /admin/users/:userId to manage roles within organizations.',
    );
  }

  @Get('organizations')
  async getOrganizations() {
    return this.adminService.getOrganizations();
  }
}
