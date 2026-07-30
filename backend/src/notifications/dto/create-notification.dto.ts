import { IsString, IsEmail, IsOptional, IsBoolean } from 'class-validator';

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
  @IsEmail()
  userEmail?: string;

  @IsOptional()
  @IsBoolean()
  read?: boolean;
}
