'use client';

import { useState } from 'react';
import { Search, Shield, Users } from 'lucide-react';
import { useAdminUsers, useUpdateUserRole, type AdminUser } from '@/lib/queries/admin';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

const ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'DRIVER', 'PASSENGER'] as const;

const roleBadge: Record<string, 'info' | 'success' | 'warning' | 'default'> = {
  SUPER_ADMIN: 'info',
  ORG_ADMIN: 'info',
  DRIVER: 'success',
  PASSENGER: 'warning',
};

function UsersSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-72 rounded-lg" />
      <Skeleton className="h-64 rounded-xl" />
    </div>
  );
}

function RoleChanger({
  currentRole,
  userId,
  organizationId,
  onRoleChange,
  disabled,
}: {
  currentRole: string;
  userId: string;
  organizationId: string;
  onRoleChange: (organizationId: string, role: string) => Promise<void>;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative inline-block">
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="text-xs font-medium text-primary hover:underline underline-offset-2"
      >
        {disabled ? 'updating...' : currentRole}
      </button>
      {isOpen && (
        <div className="absolute left-0 z-10 mt-1 w-40 rounded-lg border border-border bg-surface-elevated shadow-xl">
          {ROLES.filter((r) => r !== currentRole).map((role) => (
            <button
              key={role}
              onClick={async () => {
                await onRoleChange(organizationId, role);
                setIsOpen(false);
              }}
              className="block w-full px-4 py-2 text-left text-sm transition first:rounded-t-lg last:rounded-b-lg hover:bg-surface-hover"
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

function UserRow({ user, updating, onRoleChange }: {
  user: AdminUser;
  updating: string | null;
  onRoleChange: (userId: string, organizationId: string, role: string) => Promise<void>;
}) {
  return (
    <tr className="transition hover:bg-surface-hover/50">
      <td className="px-4 py-3">
        <div className="flex items-center gap-3">
          <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
            {user.name[0]?.toUpperCase()}
          </div>
          <span className="font-medium">{user.name}</span>
        </div>
      </td>
      <td className="px-4 py-3 text-sm text-text-secondary">{user.email}</td>
      <td className="px-4 py-3">
        {user.memberships.length === 0 ? (
          <span className="text-xs text-text-muted">No memberships</span>
        ) : (
          <div className="flex flex-wrap gap-2">
            {user.memberships.map((m) => (
              <Badge key={m.organizationId} variant={roleBadge[m.role] ?? 'default'} className="gap-1">
                <Shield className="size-3" />
                {m.organizationName}
                {' — '}
                <RoleChanger
                  currentRole={m.role}
                  userId={user.id}
                  organizationId={m.organizationId}
                  onRoleChange={(orgId, role) => onRoleChange(user.id, orgId, role)}
                  disabled={updating === `${user.id}-${m.organizationId}`}
                />
              </Badge>
            ))}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AdminUsersPage() {
  const { data: users, isLoading, error } = useAdminUsers();
  const updateRole = useUpdateUserRole();
  const [search, setSearch] = useState('');
  const [updating, setUpdating] = useState<string | null>(null);
  const [roleError, setRoleError] = useState<string | null>(null);

  const filtered = (users ?? []).filter(
    (u) =>
      u.name.toLowerCase().includes(search.toLowerCase()) ||
      u.email.toLowerCase().includes(search.toLowerCase()),
  );

  if (isLoading) return <UsersSkeleton />;

  return (
    <PageContainer title="Users" description="Manage all platform users and their roles">
      {error && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof ApiError ? error.message : 'Error loading users'}
          </p>
        </div>
      )}

      {roleError && (
        <div className="mb-4 flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">{roleError}</p>
          <button
            onClick={() => setRoleError(null)}
            className="text-xs text-destructive/70 hover:text-destructive"
          >
            Dismiss
          </button>
        </div>
      )}
      <div className="flex items-center gap-2">
        <div className="relative w-72">
          <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-text-muted" />
          <Input
            placeholder="Search by name or email..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto mb-2 size-8 text-text-muted" />
            <p className="text-sm text-text-secondary">
              {search ? 'No users match your search.' : 'No users found.'}
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card glass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Name</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Memberships</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {filtered.map((user) => (
                  <UserRow
                    key={user.id}
                    user={user}
                    updating={updating}
                    onRoleChange={async (userId, organizationId, role) => {
                      setUpdating(`${userId}-${organizationId}`);
                      try {
                        await updateRole.mutateAsync({ userId, organizationId, role });
                        setRoleError(null);
                      } catch (err) {
                        setRoleError(
                          err instanceof ApiError ? err.message : 'Failed to update role',
                        );
                      } finally {
                        setUpdating(null);
                      }
                    }}
                  />
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
