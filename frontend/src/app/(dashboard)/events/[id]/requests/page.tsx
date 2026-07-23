'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEvent } from '@/lib/queries/events';
import { useSession } from '@/lib/queries/auth';
import {
  useEventRequests,
  useUpdateRequestStatus,
  useAutoAssign,
} from '@/lib/queries/rides';
import { PageContainer, EmptyState, StatusBadge } from '@/components/PageContainer';
import { PageSkeleton, LoadingSpinner } from '@/components/LoadingSpinner';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'DRIVER'];

export default function EventRequestsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: session } = useSession();
  const {
    data: requests,
    isLoading,
    refetch,
  } = useEventRequests(eventId);
  const updateStatus = useUpdateRequestStatus();
  const autoAssign = useAutoAssign(eventId);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const canManage = session?.memberships?.some((m) => {
    if (!event) return false;
    // The user must belong to the event's org with an allowed role
    const orgMatch = m.organization.id === event.organizationId;
    return orgMatch && ALLOWED_ROLES.includes(m.role);
  });

  if (isLoading || eventLoading) return <PageSkeleton />;

  const pendingCount = requests?.filter((r) => r.status === 'PENDING').length ?? 0;

  return (
    <PageContainer
      title="Solicitudes de Viaje"
      description={
        event ? `${event.title} — ${pendingCount} pendiente(s)` : undefined
      }
      action={
        <Link
          href={`/events/${eventId}`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Volver al evento
        </Link>
      }
    >
      {canManage && pendingCount > 0 && (
        <div className="flex justify-end">
          <button
            onClick={() => {
              setAssignSuccess(false);
              autoAssign.mutate(undefined, { onSuccess: () => setAssignSuccess(true) });
            }}
            disabled={autoAssign.isPending}
            className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm disabled:opacity-50"
          >
            {autoAssign.isPending
              ? 'Asignando...'
              : `Asignar automáticamente (${pendingCount})`}
          </button>
        </div>
      )}

      {assignSuccess && (
        <div className="panel p-3 border border-green-500/30 bg-green-500/5 rounded-xl text-sm text-green-400">
          Asignación completada exitosamente.
        </div>
      )}

      {!requests || requests.length === 0 ? (
        <EmptyState
          title="Sin solicitudes"
          description="No hay solicitudes de viaje para este evento aún."
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
              />
            </svg>
          }
        />
      ) : (
        <div className="panel overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-rideflow-border text-rideflow-muted text-left">
                  <th className="px-4 py-3 font-medium">Pasajero</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Solicitado</th>
                  {canManage && (
                    <th className="px-4 py-3 font-medium text-right">
                      Acciones
                    </th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-rideflow-border">
                {requests.map((req) => (
                  <tr
                    key={req.id}
                    className="hover:bg-rideflow-panel/50 transition"
                  >
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {req.passenger?.name || req.passenger?.email || '—'}
                      </div>
                      {req.passenger?.email && (
                        <div className="text-xs text-rideflow-muted">
                          {req.passenger.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <StatusBadge status={req.status} />
                    </td>
                    <td className="px-4 py-3 text-rideflow-muted">
                      {new Date(req.createdAt).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {canManage && req.status === 'PENDING' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex gap-2 justify-end">
                          <button
                            onClick={() =>
                              updateStatus.mutate({
                                requestId: req.id,
                                status: 'ACCEPTED',
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="px-3 py-1 text-xs font-medium bg-green-500/10 text-green-400 border border-green-500/30 rounded-lg hover:brightness-110 transition disabled:opacity-50"
                          >
                            Aprobar
                          </button>
                          <button
                            onClick={() =>
                              updateStatus.mutate({
                                requestId: req.id,
                                status: 'REJECTED',
                              })
                            }
                            disabled={updateStatus.isPending}
                            className="px-3 py-1 text-xs font-medium bg-red-500/10 text-red-400 border border-red-500/30 rounded-lg hover:brightness-110 transition disabled:opacity-50"
                          >
                            Rechazar
                          </button>
                        </div>
                      </td>
                    )}
                    {canManage && req.status !== 'PENDING' && (
                      <td className="px-4 py-3 text-right">
                        <StatusBadge status={req.status} />
                      </td>
                    )}
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
