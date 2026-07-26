import { IsString, IsEnum, IsOptional, IsNumber } from 'class-validator';

export enum JoinRole {
  DRIVER = 'driver',
  PASSENGER = 'passenger',
}

export class JoinEventDto {
  @IsEnum(JoinRole)
  role!: JoinRole;

  // Driver-only fields (for creating EventVehicle)
  @IsOptional()
  @IsString()
  vehicleId?: string;

  @IsOptional()
  @IsString()
  startLocation?: string;

  @IsOptional()
  @IsNumber()
  startLat?: number;

  @IsOptional()
  @IsNumber()
  startLng?: number;

  // Passenger-only fields
  @IsOptional()
  @IsNumber()
  pickupLat?: number;

  @IsOptional()
  @IsNumber()
  pickupLng?: number;

  @IsOptional()
  @IsString()
  pickupAddress?: string;
}
