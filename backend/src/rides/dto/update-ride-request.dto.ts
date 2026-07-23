import { IsEnum } from 'class-validator';
import { RequestStatus } from '@prisma/client';

export class UpdateRideRequestDto {
  @IsEnum(RequestStatus)
  status!: RequestStatus;
}
