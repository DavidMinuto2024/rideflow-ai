import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '@prisma/client';
import { InvitationsService } from './invitations.service';
import { JoinEventDto } from './dto/join-event.dto';

@Controller()
export class InvitationsController {
  constructor(private readonly invitationsService: InvitationsService) {}

  /**
   * GET /invite/:token
   * Resolve invite token → return event info (public-ish, for QR landing page).
   * Optionally protected: unauthenticated users see basic event info.
   */
  @Get('invite/:token')
  async resolveToken(@Param('token') token: string) {
    return this.invitationsService.validateToken(token);
  }

  /**
   * POST /invite/:token/join
   * Authenticated user joins the event with a selected role.
   * Body: { role: "driver" | "passenger", vehicleId?, startLocation?, pickupLat?, pickupLng?, pickupAddress? }
   */
  @Post('invite/:token/join')
  @UseGuards(AuthGuard)
  async joinEvent(
    @Param('token') token: string,
    @Body() dto: JoinEventDto,
    @CurrentUser() user: User,
  ) {
    return this.invitationsService.joinEvent(token, user.id, dto);
  }
}
