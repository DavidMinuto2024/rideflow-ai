import { IsOptional, IsString, IsNumber } from 'class-validator';

export class CreateRideRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;

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
