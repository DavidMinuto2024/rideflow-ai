import { IsString, IsOptional, IsBoolean, IsEnum } from 'class-validator';

export class CreateNotificationDto {
  @IsString()
  type!: string;

  @IsString()
  title!: string;

  @IsOptional()
  @IsString()
  message?: string;

  @IsString()
  userId!: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
