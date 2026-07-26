import {
  IsString,
  IsOptional,
  IsDateString,
  IsInt,
  Min,
  IsNumber,
  MinLength,
} from 'class-validator';

export class CreateEventDto {
  @IsString()
  @MinLength(1)
  title!: string;

  @IsOptional()
  @IsString()
  description?: string;

  @IsDateString()
  date!: string;

  @IsString()
  @MinLength(1)
  origin!: string;

  @IsOptional()
  @IsNumber()
  originLat?: number;

  @IsOptional()
  @IsNumber()
  originLng?: number;

  @IsString()
  @MinLength(1)
  destination!: string;

  @IsOptional()
  @IsNumber()
  destLat?: number;

  @IsOptional()
  @IsNumber()
  destLng?: number;

  @IsOptional()
  @IsInt()
  @Min(1)
  capacity?: number;

  @IsOptional()
  @IsDateString()
  arrivalTime?: string;
}
