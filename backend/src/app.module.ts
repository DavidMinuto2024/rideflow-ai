import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { SupabaseModule } from './supabase/supabase.module';
import { AuthModule } from './auth/auth.module';
import { OrganizationsModule } from './organizations/organizations.module';
import { UsersModule } from './users/users.module';
import { EventsModule } from './events/events.module';
import { VehiclesModule } from './vehicles/vehicles.module';
import { RidesModule } from './rides/rides.module';
import { RoutesModule } from './routes/routes.module';
import { DashboardModule } from './dashboard/dashboard.module';
import { NotificationsModule } from './notifications/notifications.module';
import { InvitationsModule } from './invitations/invitations.module';
import { EventVehiclesModule } from './event-vehicles/event-vehicles.module';
import { SuggestionsModule } from './suggestions/suggestions.module';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true }),
    // SupabaseModule provides SupabaseDataService for all database access.
    SupabaseModule,
    AuthModule,
    OrganizationsModule,
    UsersModule,
    EventsModule,
    VehiclesModule,
    RidesModule,
    RoutesModule,
    DashboardModule,
    NotificationsModule,
    InvitationsModule,
    EventVehiclesModule,
    SuggestionsModule,
  ],
})
export class AppModule {}
