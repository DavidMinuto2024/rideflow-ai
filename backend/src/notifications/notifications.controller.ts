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
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';
import { RegisterDeviceTokenDto } from './dto/register-device-token.dto';
import { UpdatePreferencesDto } from './dto/update-preferences.dto';

@Controller()
export class NotificationsController {
  constructor(private readonly notificationsService: NotificationsService) {}

  @Get('notifications')
  @UseGuards(AuthGuard)
  async findByUser(@CurrentUser() user: User) {
    return this.notificationsService.findByUser(user.id);
  }

  @Patch('notifications/:id/read')
  @UseGuards(AuthGuard)
  async markAsRead(
    @Param('id') id: string,
    @CurrentUser() user: User,
  ) {
    return this.notificationsService.markAsRead(id, user.id);
  }

  @Post('notifications')
  @UseGuards(AuthGuard)
  async create(
    @Body() dto: CreateNotificationDto,
  ) {
    return this.notificationsService.create(dto);
  }

  // Device Token endpoints
  @Post('notifications/device-token')
  @UseGuards(AuthGuard)
  async registerDeviceToken(
    @CurrentUser() user: User,
    @Body() dto: RegisterDeviceTokenDto,
  ) {
    return this.notificationsService.registerDeviceToken(user.id, dto.token, dto.platform);
  }

  @Delete('notifications/device-token')
  @UseGuards(AuthGuard)
  @HttpCode(HttpStatus.NO_CONTENT)
  async revokeDeviceToken(@CurrentUser() user: User) {
    await this.notificationsService.revokeDeviceToken(user.id);
  }

  // Preferences endpoints
  @Get('notifications/preferences')
  @UseGuards(AuthGuard)
  async getPreferences(@CurrentUser() user: User) {
    return this.notificationsService.getPreferences(user.id);
  }

  @Patch('notifications/preferences')
  @UseGuards(AuthGuard)
  async updatePreferences(
    @CurrentUser() user: User,
    @Body() dto: UpdatePreferencesDto,
  ) {
    return this.notificationsService.updatePreferences(user.id, dto);
  }
}