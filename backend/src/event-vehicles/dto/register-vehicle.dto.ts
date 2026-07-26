import { IsString, IsOptional, IsNumber } from 'class-validator';

export class RegisterVehicleDto {
  @IsString()
  vehicleId!: string;

  @IsOptional()
  @IsString()
  startLocation?: string;

  @IsOptional()
  @IsNumber()
  startLat?: number;

  @IsOptional()
  @IsNumber()
  startLng?: number;
}

export class UpdateEventVehicleDto {
  @IsOptional()
  @IsString()
  startLocation?: string;

  @IsOptional()
  @IsNumber()
  startLat?: number;

  @IsOptional()
  @IsNumber()
  startLng?: number;
}
