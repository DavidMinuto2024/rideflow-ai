import {
  Controller,
  Get,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RoutesService } from './routes.service';

@Controller()
export class RoutesController {
  constructor(private readonly routesService: RoutesService) {}

  @Get('events/:eventId/trips/:tripId/route')
  @UseGuards(AuthGuard)
  async getOptimizedRoute(
    @Param('eventId') eventId: string,
    @Param('tripId') tripId: string,
  ) {
    return this.routesService.getOptimizedRoute(eventId, tripId);
  }
}
