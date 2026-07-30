import { IsString, IsEnum, IsNotEmpty } from 'class-validator';
import { Role } from '@prisma/client';

export class UpdateUserRoleDto {
  @IsString()
  @IsNotEmpty()
  organizationId!: string;

  @IsEnum(Role)
  @IsNotEmpty()
  role!: Role;
}
