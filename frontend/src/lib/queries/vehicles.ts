import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

export interface Vehicle {
  id: string;
  plate?: string;
  model?: string;
  capacity: number;
  isActive: boolean;
  organizationId: string;
  driverId?: string;
  driver?: { id: string; name: string; email: string };
  createdAt: string;
}

export function useVehicles(
  organizationId: string,
  includeInactive = false,
) {
  return useQuery<Vehicle[]>({
    queryKey: ['vehicles', organizationId, includeInactive],
    queryFn: () =>
      apiClient.get<Vehicle[]>(
        `/organizations/${organizationId}/vehicles?includeInactive=${includeInactive}`,
      ),
    enabled: !!organizationId,
  });
}

export function useVehicle(id: string) {
  return useQuery<Vehicle>({
    queryKey: ['vehicles', id],
    queryFn: () => apiClient.get<Vehicle>(`/vehicles/${id}`),
    enabled: !!id,
  });
}

export function useCreateVehicle(organizationId: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (data: {
      plate?: string;
      model?: string;
      capacity: number;
      driverId?: string;
    }) => {
      if (!organizationId) {
        throw new Error('Selecciona una organización primero');
      }
      return apiClient.post<Vehicle>(
        `/organizations/${organizationId}/vehicles`,
        data,
      );
    },
    onSuccess: () => {
      if (organizationId) {
        queryClient.invalidateQueries({ queryKey: ['vehicles', organizationId] });
      }
    },
  });
}

export function useUpdateVehicle(id: string) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (data: Partial<Vehicle>) =>
      apiClient.patch<Vehicle>(`/vehicles/${id}`, data),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useToggleVehicleActive() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) =>
      apiClient.post<Vehicle>(`/vehicles/${id}/toggle-active`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}

export function useDeleteVehicle() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (id: string) => apiClient.delete(`/vehicles/${id}`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['vehicles'] });
    },
  });
}
