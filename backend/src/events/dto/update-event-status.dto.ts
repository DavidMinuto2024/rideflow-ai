import { IsEnum } from 'class-validator';
import { EventStatus } from '@prisma/client';

export class UpdateEventStatusDto {
  @IsEnum(EventStatus)
  status!: EventStatus;
}
