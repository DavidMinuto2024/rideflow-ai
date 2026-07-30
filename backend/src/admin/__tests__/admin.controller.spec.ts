import { Test, TestingModule } from '@nestjs/testing';
import { AdminController } from '../admin.controller';
import { AdminService } from '../admin.service';
import { AuthGuard } from '../../auth/auth.guard';
import { RolesGuard } from '../../auth/roles.guard';
import { NotFoundException, BadRequestException, NotImplementedException } from '@nestjs/common';
import { Role } from '@prisma/client';

describe('AdminController', () => {
  let controller: AdminController;
  let adminService: jest.Mocked<AdminService>;

  const mockGuard = { canActivate: jest.fn(() => true) };

  beforeEach(async () => {
    adminService = {
      getStats: jest.fn(),
      getUsers: jest.fn(),
      getOrganizations: jest.fn(),
      updateUserRole: jest.fn(),
    } as unknown as jest.Mocked<AdminService>;

    const module: TestingModule = await Test.createTestingModule({
      controllers: [AdminController],
      providers: [
        { provide: AdminService, useValue: adminService },
      ],
    })
      .overrideGuard(AuthGuard)
      .useValue(mockGuard)
      .overrideGuard(RolesGuard)
      .useValue(mockGuard)
      .compile();

    controller = module.get<AdminController>(AdminController);
  });

  describe('GET /admin/stats', () => {
    it('should call adminService.getStats and return result', async () => {
      const expected = {
        totalOrganizations: 5,
        totalUsers: 100,
        totalEvents: 20,
        totalTrips: 150,
        eventsPerMonth: [],
      };
      adminService.getStats.mockResolvedValue(expected);

      const result = await controller.getStats();

      expect(result).toEqual(expected);
      expect(adminService.getStats).toHaveBeenCalledTimes(1);
    });
  });

  describe('GET /admin/users', () => {
    it('should call adminService.getUsers and return result', async () => {
      const expected = [
        { id: 'user-1', email: 'a@b.com', name: 'A', memberships: [] },
      ];
      adminService.getUsers.mockResolvedValue(expected);

      const result = await controller.getUsers();

      expect(result).toEqual(expected);
      expect(adminService.getUsers).toHaveBeenCalledTimes(1);
    });
  });

  describe('PATCH /admin/users/:userId', () => {
    it('should call adminService.updateUserRole with userId, dto, and authUserId', async () => {
      const dto = { organizationId: 'org-1', role: Role.ORG_ADMIN };
      const expected = { id: 'member-1', role: 'ORG_ADMIN' };
      adminService.updateUserRole.mockResolvedValue(expected);

      const result = await controller.updateUserRole(
        'user-123',
        dto,
        { user: { id: 'admin-1' } },
      );

      expect(result).toEqual(expected);
      expect(adminService.updateUserRole).toHaveBeenCalledWith(
        'user-123',
        dto,
        'admin-1',
      );
    });

    it('should propagate BadRequestException for self-demotion', async () => {
      const dto = { organizationId: 'org-1', role: Role.PASSENGER };
      adminService.updateUserRole.mockRejectedValue(
        new BadRequestException('Cannot change your own role'),
      );

      await expect(
        controller.updateUserRole('admin-1', dto, { user: { id: 'admin-1' } }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should propagate NotFoundException when user does not exist', async () => {
      const dto = { organizationId: 'org-1', role: Role.DRIVER };
      adminService.updateUserRole.mockRejectedValue(
        new NotFoundException('User nonexistent not found'),
      );

      await expect(
        controller.updateUserRole('nonexistent', dto, { user: { id: 'admin-1' } }),
      ).rejects.toThrow(NotFoundException);
    });
  });

  describe('DELETE /admin/users/:userId', () => {
    it('should throw NotImplementedException', async () => {
      await expect(controller.disableUser()).rejects.toThrow(NotImplementedException);
    });
  });

  describe('GET /admin/organizations', () => {
    it('should call adminService.getOrganizations and return result', async () => {
      const expected = [
        { id: 'org-1', name: 'Org', slug: 'org', memberCount: 10, eventCount: 3, createdAt: '2026-01-01T00:00:00Z' },
      ];
      adminService.getOrganizations.mockResolvedValue(expected);

      const result = await controller.getOrganizations();

      expect(result).toEqual(expected);
      expect(adminService.getOrganizations).toHaveBeenCalledTimes(1);
    });
  });
});
