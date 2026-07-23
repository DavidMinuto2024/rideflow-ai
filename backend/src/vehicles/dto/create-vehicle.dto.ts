import { IsString, IsOptional, IsInt, Min } from 'class-validator';

export class CreateVehicleDto {
  @IsOptional()
  @IsString()
  plate?: string;

  @IsOptional()
  @IsString()
  model?: string;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;
}
