import { Global, Module } from '@nestjs/common';
import { SupabaseDataService } from './supabase-data.service';

/**
 * Global module that provides SupabaseDataService for database access.
 *
 * This module is imported alongside PrismaModule during the transition
 * period. Once all services are migrated, PrismaModule can be removed.
 */
@Global()
@Module({
  providers: [SupabaseDataService],
  exports: [SupabaseDataService],
})
export class SupabaseModule {}
