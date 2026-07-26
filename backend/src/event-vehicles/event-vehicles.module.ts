import { Module } from '@nestjs/common';
import { EventVehiclesController } from './event-vehicles.controller';
import { EventVehiclesService } from './event-vehicles.service';

@Module({
  controllers: [EventVehiclesController],
  providers: [EventVehiclesService],
  exports: [EventVehiclesService],
})
export class EventVehiclesModule {}
