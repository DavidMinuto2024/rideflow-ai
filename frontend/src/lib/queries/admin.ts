import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface AdminStats {
  totalOrganizations: number;
  totalUsers: number;
  totalEvents: number;
  totalTrips: number;
  eventsPerMonth: { month: string; count: number }[];
}

export interface AdminUser {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  memberships: { organizationId: string; organizationName: string; role: string }[];
}

export interface AdminOrganization {
  id: string;
  name: string;
  slug: string;
  memberCount: number;
  eventCount: number;
  createdAt: string;
}

export const adminStatsQueryKey = ['admin', 'stats'] as const;
export const adminUsersQueryKey = ['admin', 'users'] as const;
export const adminOrganizationsQueryKey = ['admin', 'organizations'] as const;

export function useAdminStats() {
  return useQuery<AdminStats>({
    queryKey: adminStatsQueryKey,
    queryFn: () => apiClient.get<AdminStats>('/admin/stats'),
    staleTime: 5 * 60 * 1000, // aggregate stats rarely change
  });
}

export function useAdminUsers() {
  return useQuery<AdminUser[]>({
    queryKey: adminUsersQueryKey,
    queryFn: () => apiClient.get<AdminUser[]>('/admin/users'),
    staleTime: 30 * 1000,
  });
}

export function useAdminOrganizations() {
  return useQuery<AdminOrganization[]>({
    queryKey: adminOrganizationsQueryKey,
    queryFn: () => apiClient.get<AdminOrganization[]>('/admin/organizations'),
    staleTime: 30 * 1000,
  });
}

export function useUpdateUserRole() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (params: { userId: string; organizationId: string; role: string }) =>
      apiClient.patch(`/admin/users/${params.userId}`, {
        organizationId: params.organizationId,
        role: params.role,
      }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
    },
  });
}
