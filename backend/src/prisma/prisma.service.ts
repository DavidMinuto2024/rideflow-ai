import { Injectable, Logger, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor(private configService: ConfigService) {
    super({
      datasources: {
        db: {
          url: configService.get<string>('DATABASE_URL'),
        },
      },
    });
  }

  /**
   * Graceful startup — tries to connect but does NOT crash the app if the
   * database is unreachable. PrismaClient will auto-connect on first query,
   * so the app can start and serve non-DB routes even when the DB is down.
   */
  async onModuleInit() {
    try {
      // Short 500ms timeout for initial Postgres check; Supabase REST API handles all queries
      await Promise.race([
        this.$connect(),
        new Promise((_, reject) => setTimeout(() => reject(new Error('Postgres TCP timeout')), 500)),
      ]);
      this.logger.log('Connected to database');
    } catch (err) {
      this.logger.warn(
        `Database unavailable at startup — will connect on first query: ${(err as Error).message}`,
      );
    }
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }
}
