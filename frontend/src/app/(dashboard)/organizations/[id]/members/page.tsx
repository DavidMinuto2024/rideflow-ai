'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useOrganization,
  useOrganizationMembers,
} from '@/lib/queries/organizations';
import { useUpdateRole } from '@/lib/queries/users';
import { PageContainer, StatusBadge, EmptyState } from '@/components/PageContainer';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';

const ROLES = ['ORG_ADMIN', 'DRIVER', 'PASSENGER'] as const;

export default function MembersPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: org, isLoading: orgLoading } = useOrganization(id);
  const { data: members, isLoading: membersLoading } = useOrganizationMembers(id);
  const [updating, setUpdating] = useState<string | null>(null);
  const updateRole = useUpdateRole(id);

  if (orgLoading || membersLoading) return <LoadingSpinner />;

  return (
    <PageContainer
      title="Miembros"
      description={org?.name ? `Miembros de ${org.name}` : undefined}
      action={
        <Link
          href={`/organizations/${id}`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Volver
        </Link>
      }
    >
      {!members || members.length === 0 ? (
        <EmptyState title="Sin miembros" description="Esta organización no tiene miembros todavía." />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-rideflow-border">
                  <th className="text-left px-4 py-3 text-sm font-medium text-rideflow-muted">Usuario</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-rideflow-muted">Email</th>
                  <th className="text-left px-4 py-3 text-sm font-medium text-rideflow-muted">Rol</th>
                  <th className="text-right px-4 py-3 text-sm font-medium text-rideflow-muted">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-rideflow-border">
                {members.map((member) => (
                  <tr key={member.id} className="hover:bg-rideflow-panel2/50 transition">
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-rideflow-amber/20 flex items-center justify-center text-sm font-semibold text-rideflow-amber">
                          {member.user.name[0]?.toUpperCase()}
                        </div>
                        <span className="font-medium">{member.user.name}</span>
                      </div>
                    </td>
                    <td className="px-4 py-3 text-sm text-rideflow-muted">{member.user.email}</td>
                    <td className="px-4 py-3">
                      <StatusBadge status={member.role} />
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
        </div>
      )}
    </PageContainer>
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
      <button
        onClick={() => setIsOpen(!isOpen)}
        disabled={disabled}
        className="text-sm text-rideflow-muted hover:text-rideflow-text px-2 py-1 rounded border border-rideflow-border disabled:opacity-50"
      >
        {disabled ? 'Cambiando...' : 'Cambiar rol'}
      </button>
      {isOpen && (
        <div className="absolute right-0 mt-1 w-40 bg-rideflow-panel2 border border-rideflow-border rounded-lg shadow-xl z-10">
          {ROLES.filter((r) => r !== currentRole).map((role) => (
            <button
              key={role}
              onClick={async () => {
                await onRoleChange(role);
                setIsOpen(false);
              }}
              className="block w-full text-left px-4 py-2 text-sm hover:bg-rideflow-panel transition first:rounded-t-lg last:rounded-b-lg"
            >
              {role}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
