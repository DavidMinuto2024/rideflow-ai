import { IsString, IsNotEmpty } from 'class-validator';

export class DirectAssignDto {
  @IsString()
  @IsNotEmpty()
  passengerId: string;

  @IsString()
  @IsNotEmpty()
  driverId: string;
}
