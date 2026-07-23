import { useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export function useUpdateProfile() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { name?: string; phone?: string; avatar?: string }) =>
      apiClient.patch('/users/profile', data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['users', 'profile'] });
    },
  });
}

export function useUpdateRole(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: { userId: string; role: string }) =>
      apiClient.patch(
        `/organizations/${organizationId}/users/${data.userId}/role`,
        { role: data.role },
      ),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ['organizations', organizationId, 'members'],
      });
    },
  });
}
