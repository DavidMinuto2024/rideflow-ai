import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface Organization {
  id: string;
  name: string;
  slug: string;
  logo?: string;
  createdAt: string;
}

export interface OrganizationMember {
  id: string;
  userId: string;
  role: string;
  user: {
    id: string;
    email: string;
    name: string;
    avatar?: string;
  };
}

export function useOrganizations() {
  return useQuery<Organization[]>({
    queryKey: ['organizations'],
    queryFn: () => apiClient.get<Organization[]>('/organizations'),
  });
}

export function useOrganization(id: string) {
  return useQuery<Organization>({
    queryKey: ['organizations', id],
    queryFn: () => apiClient.get<Organization>(`/organizations/${id}`),
    enabled: !!id,
  });
}

export function useOrganizationMembers(organizationId: string) {
  return useQuery<OrganizationMember[]>({
    queryKey: ['organizations', organizationId, 'members'],
    queryFn: () =>
      apiClient.get<OrganizationMember[]>(
        `/organizations/${organizationId}/users`,
      ),
    enabled: !!organizationId,
  });
}

export function useCreateOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name: string; slug: string; logo?: string }) =>
      apiClient.post<Organization>('/organizations', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useUpdateOrganization(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; logo?: string }) =>
      apiClient.patch<Organization>(`/organizations/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}

export function useDeleteOrganization() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/organizations/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['organizations'] });
    },
  });
}
