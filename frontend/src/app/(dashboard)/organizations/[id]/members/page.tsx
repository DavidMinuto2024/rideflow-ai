'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Shield, Users } from 'lucide-react';
import {
  useOrganization,
  useOrganizationMembers,
} from '@/lib/queries/organizations';
import { useUpdateRole } from '@/lib/queries/users';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

const ROLES = ['ORG_ADMIN', 'DRIVER', 'PASSENGER'] as const;

const roleBadge: Record<string, 'info' | 'success' | 'default'> = {
  ORG_ADMIN: 'info',
  DRIVER: 'success',
  PASSENGER: 'default',
};

function MembersSkeleton() {
  return (
    <div className="flex flex-col gap-3">
      {[1, 2, 3].map((i) => (
        <Skeleton key={i} className="h-16 rounded-xl" />
      ))}
    </div>
  );
}

function RoleChanger({
  currentRole,
  userId,
  onRoleChange,
  disabled,
}: {
  currentRole: string;
  userId: string;
  onRoleChange: (role: string) => Promise<void>;
  disabled: boolean;
}) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <div className="relative">
      <Button
        size="sm"
        variant="outline"
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
      >
        {disabled ? 'Cambiando...' : 'Cambiar rol'}
      </Button>
      {isOpen && (
        <div className="absolute right-0 z-10 mt-1 w-40 rounded-lg border border-border bg-surface-elevated shadow-xl">
          {ROLES.filter((r) => r !== currentRole).map((role) => (
            <button
              key={role}
              onClick={async () => {
                await onRoleChange(role);
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

export default function MembersPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: org, isLoading: orgLoading } = useOrganization(id);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(id);
  const [updating, setUpdating] = useState<string | null>(null);
  const updateRole = useUpdateRole(id);

  if (orgLoading || membersLoading) return <MembersSkeleton />;

  return (
    <PageContainer
      title="Miembros"
      description={org?.name ? `Miembros de ${org.name}` : undefined}
      action={
        <Link href={`/organizations/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </Link>
      }
    >
      {!members || members.length === 0 ? (
        <Card glass>
          <CardContent className="p-8 text-center">
            <Users className="mx-auto mb-2 size-8 text-text-muted" />
            <p className="text-sm text-text-secondary">
              Esta organización no tiene miembros todavía.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card glass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Usuario</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Email</th>
                  <th className="px-4 py-3 text-left text-sm font-medium text-text-secondary">Rol</th>
                  <th className="px-4 py-3 text-right text-sm font-medium text-text-secondary">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {members.map((member) => (
                  <tr key={member.id} className="transition hover:bg-surface-hover/50">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="flex size-8 items-center justify-center rounded-full bg-primary/10 text-sm font-semibold text-primary">
                          {member.user.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{member.user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-text-secondary">{member.user.email}</td>
                    <td className="px-4 py-3">
                      <Badge variant={roleBadge[member.role] ?? 'default'}>
                        <Shield className="mr-1 size-3" />
                        {member.role}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-right">
                      <RoleChanger
                        currentRole={member.role}
                        userId={member.userId}
                        onRoleChange={async (newRole) => {
                          setUpdating(member.userId);
                          try {
                            await updateRole.mutateAsync({
                              userId: member.userId,
                              role: newRole,
                            });
                          } catch (err) {
                            if (err instanceof ApiError) {
                              alert(err.message);
                            }
                          } finally {
                            setUpdating(null);
                          }
                        }}
                        disabled={updating === member.userId}
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </PageContainer>
  );
}
