import { Global, Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { AuthController } from './auth.controller';
import { AuthGuard } from './auth.guard';
import { RolesGuard } from './roles.guard';
import { SupabaseAuthService } from './supabase-auth.service';

@Global()
@Module({
  imports: [
    ConfigModule,
    ThrottlerModule.forRoot([
      {
        name: 'login',
        ttl: 60000, // 1 minute window
        limit: 5,   // 5 requests per window
      },
    ]),
  ],
  controllers: [AuthController],
  providers: [SupabaseAuthService, AuthGuard, RolesGuard],
  exports: [SupabaseAuthService, AuthGuard, RolesGuard],
})
export class AuthModule {}
