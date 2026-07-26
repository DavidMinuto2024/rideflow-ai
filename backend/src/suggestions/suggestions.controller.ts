import {
  Controller,
  Get,
  Post,
  Param,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { SuggestionsService } from './suggestions.service';

@Controller()
export class SuggestionsController {
  constructor(private readonly suggestionsService: SuggestionsService) {}

  /**
   * GET /events/:id/suggestions
   * Returns ranked driver suggestions per passenger based on Haversine distance.
   */
  @Get('events/:id/suggestions')
  @UseGuards(AuthGuard)
  async getSuggestions(@Param('id') eventId: string) {
    return this.suggestionsService.getSuggestions(eventId);
  }

  /**
   * POST /events/:id/optimize-times
   * Computes departure and pickup times for all trips using OSRM leg durations.
   */
  @Post('events/:id/optimize-times')
  @UseGuards(AuthGuard)
  async optimizeTimes(@Param('id') eventId: string) {
    return this.suggestionsService.optimizeTimes(eventId);
  }
}
