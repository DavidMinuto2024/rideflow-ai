import { IsOptional, IsString } from 'class-validator';

export class CreateRideRequestDto {
  @IsOptional()
  @IsString()
  notes?: string;
}
