import {
  Controller,
  Post,
  Get,
  Body,
  Req,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { ThrottlerGuard } from '@nestjs/throttler';
import { AuthGuard } from './auth.guard';
import { SupabaseAuthService } from './supabase-auth.service';
import { PrismaService } from '../prisma/prisma.service';
import { RegisterDto } from './dto/register.dto';
import { LoginDto } from './dto/login.dto';
import { CurrentUser } from './decorators/current-user.decorator';
import { User } from '@prisma/client';

@Controller('auth')
export class AuthController {
  constructor(
    private readonly supabaseAuth: SupabaseAuthService,
    private readonly prisma: PrismaService,
  ) {}

  @Post('signup')
  async signup(@Body() dto: RegisterDto) {
    // Register in Supabase Auth
    const result = await this.supabaseAuth.signup(dto.email, dto.password);

    // Create or update the local user record
    const supabaseUserId = result.user?.id ?? 'unknown';
    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      update: { name: dto.name },
      create: {
        email: dto.email,
        name: dto.name,
        id: supabaseUserId,
      },
    });

    return {
      user,
      access_token: result.session?.access_token ?? null,
      refresh_token: result.session?.refresh_token ?? null,
    };
  }

  @Post('login')
  @HttpCode(HttpStatus.OK)
  @UseGuards(ThrottlerGuard)
  async login(@Body() dto: LoginDto) {
    const result = await this.supabaseAuth.login(dto.email, dto.password);

    // Ensure local user record exists
    const supabaseUserId = result.user?.id ?? 'unknown';
    const user = await this.prisma.user.upsert({
      where: { email: dto.email },
      update: {},
      create: {
        email: dto.email,
        name: dto.email.split('@')[0],
        id: supabaseUserId,
      },
    });

    return {
      user,
      access_token: result.session?.access_token ?? null,
      refresh_token: result.session?.refresh_token ?? null,
    };
  }

  @Get('session')
  @UseGuards(AuthGuard)
  async session(@CurrentUser() user: User) {
    // Load memberships to return role context
    const memberships = await this.prisma.organizationMember.findMany({
      where: { userId: user.id },
      include: { organization: true },
    });

    return { user, memberships };
  }
}
