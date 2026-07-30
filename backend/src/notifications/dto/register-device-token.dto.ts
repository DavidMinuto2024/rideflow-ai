import { IsString, IsIn } from 'class-validator';

export class RegisterDeviceTokenDto {
  @IsString()
  token: string;

  @IsString()
  @IsIn(['web', 'ios', 'android'])
  platform: string;
}