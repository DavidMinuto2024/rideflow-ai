import {
  Injectable,
  ConflictException,
  NotFoundException,
  ForbiddenException,
} from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateOrganizationDto } from './dto/create-organization.dto';
import { UpdateOrganizationDto } from './dto/update-organization.dto';

@Injectable()
export class OrganizationsService {
  constructor(private readonly prisma: PrismaService) {}

  async create(dto: CreateOrganizationDto, userId: string) {
    // Check slug uniqueness
    const existing = await this.prisma.organization.findUnique({
      where: { slug: dto.slug },
    });

    if (existing) {
      throw new ConflictException(`Organization with slug "${dto.slug}" already exists`);
    }

    // Create org and make the creator ORG_ADMIN in a transaction
    const org = await this.prisma.$transaction(async (tx) => {
      const organization = await tx.organization.create({
        data: {
          name: dto.name,
          slug: dto.slug,
          logo: dto.logo,
        },
      });

      // Automatically add creator as ORG_ADMIN
      await tx.organizationMember.create({
        data: {
          role: 'ORG_ADMIN',
          organizationId: organization.id,
          userId,
        },
      });

      return organization;
    });

    return org;
  }

  async findAll() {
    return this.prisma.organization.findMany({
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id },
      include: { members: { include: { user: true } } },
    });

    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return org;
  }

  async update(id: string, dto: UpdateOrganizationDto) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    return this.prisma.organization.update({
      where: { id },
      data: dto,
    });
  }

  async remove(id: string) {
    const org = await this.prisma.organization.findUnique({ where: { id } });
    if (!org) {
      throw new NotFoundException(`Organization ${id} not found`);
    }

    // Delete org and all associated data
    await this.prisma.$transaction(async (tx) => {
      // Delete members first
      await tx.organizationMember.deleteMany({ where: { organizationId: id } });
      await tx.organization.delete({ where: { id } });
    });

    return { deleted: true };
  }

  async getMembers(organizationId: string) {
    const org = await this.prisma.organization.findUnique({
      where: { id: organizationId },
    });
    if (!org) {
      throw new NotFoundException(`Organization ${organizationId} not found`);
    }

    return this.prisma.organizationMember.findMany({
      where: { organizationId },
      include: { user: true },
      orderBy: { createdAt: 'asc' },
    });
  }
}
