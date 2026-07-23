import { useQuery } from '@tanstack/react-query';
import { apiClient } from '@/lib/api';

interface UserProfile {
  id: string;
  email: string;
  name: string;
  phone?: string;
  avatar?: string;
  createdAt: string;
}

interface SessionResponse {
  user: UserProfile;
  memberships: Array<{
    role: string;
    organization: {
      id: string;
      name: string;
      slug: string;
    };
  }>;
}

export function useSession() {
  return useQuery<SessionResponse>({
    queryKey: ['auth', 'session'],
    queryFn: () => apiClient.get<SessionResponse>('/auth/session'),
    retry: false,
  });
}

export function useProfile() {
  return useQuery<UserProfile>({
    queryKey: ['users', 'profile'],
    queryFn: () => apiClient.get<UserProfile>('/users/profile'),
  });
}
