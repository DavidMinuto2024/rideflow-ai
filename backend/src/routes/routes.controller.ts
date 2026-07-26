import {
  Controller,
  Get,
  Param,
  Query,
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
    @Query('waypoints') waypoints?: string,
  ) {
    const parsedWaypoints = waypoints
      ? waypoints.split(';').map((wp) => {
          const [lat, lng] = wp.split(',').map(Number);
          return { lat, lng };
        })
      : [];

    return this.routesService.getOptimizedRoute(eventId, tripId, parsedWaypoints);
  }
}
