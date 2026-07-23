import {
  Injectable,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateRoleDto } from './dto/update-role.dto';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  async getProfile(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        members: {
          include: { organization: true },
        },
        vehicles: true,
      },
    });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async updateProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      throw new NotFoundException('User not found');
    }

    return this.prisma.user.update({
      where: { id: userId },
      data: dto,
    });
  }

  async updateRole(
    organizationId: string,
    userId: string,
    dto: UpdateRoleDto,
    requesterId: string,
  ) {
    // Verify requester has admin rights in this org
    const requesterMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId: requesterId,
        },
      },
    });

    if (
      !requesterMember ||
      (requesterMember.role !== 'SUPER_ADMIN' &&
        requesterMember.role !== 'ORG_ADMIN')
    ) {
      throw new ForbiddenException(
        'Only admins can change user roles',
      );
    }

    // Find the target member
    const targetMember = await this.prisma.organizationMember.findUnique({
      where: {
        organizationId_userId: {
          organizationId,
          userId,
        },
      },
    });

    if (!targetMember) {
      throw new NotFoundException('User is not a member of this organization');
    }

    return this.prisma.organizationMember.update({
      where: { id: targetMember.id },
      data: { role: dto.role },
    });
  }
}
