import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { NotificationsService } from './notifications.service';
import { CreateNotificationDto } from './dto/create-notification.dto';

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
}
