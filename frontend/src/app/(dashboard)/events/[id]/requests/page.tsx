'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, ClipboardList } from 'lucide-react';
import { useEvent } from '@/lib/queries/events';
import { useSession } from '@/lib/queries/auth';
import {
  useEventRequests,
  useUpdateRequestStatus,
  useAutoAssign,
} from '@/lib/queries/rides';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

const ALLOWED_ROLES = ['SUPER_ADMIN', 'ORG_ADMIN', 'DRIVER'];

function statusToBadge(
  status: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'ACCEPTED':
      return 'success';
    case 'REJECTED':
      return 'error';
    case 'CANCELLED':
      return 'outline';
    default:
      return 'outline';
  }
}

export default function EventRequestsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: session } = useSession();
  const { data: requests, isLoading, refetch } = useEventRequests(eventId);
  const updateStatus = useUpdateRequestStatus();
  const autoAssign = useAutoAssign(eventId);
  const [assignSuccess, setAssignSuccess] = useState(false);

  const canManage = session?.memberships?.some((m) => {
    if (!event) return false;
    return m.organization.id === event.organizationId && ALLOWED_ROLES.includes(m.role);
  });

  if (isLoading || eventLoading) {
    return (
      <PageContainer title="Solicitudes de Viaje">
        <Skeleton className="h-64 w-full rounded-xl" />
      </PageContainer>
    );
  }

  const pendingCount = requests?.filter((r) => r.status === 'PENDING').length ?? 0;

  return (
    <PageContainer
      title="Solicitudes de Viaje"
      description={
        event ? `${event.title} — ${pendingCount} pendiente(s)` : undefined
      }
      action={
        <Link href={`/events/${eventId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver al evento
          </Button>
        </Link>
      }
    >
      {canManage && pendingCount > 0 && (
        <div className="flex justify-end">
          <Button
            onClick={() => {
              setAssignSuccess(false);
              autoAssign.mutate(undefined, { onSuccess: () => setAssignSuccess(true) });
            }}
            loading={autoAssign.isPending}
          >
            <Sparkles className="size-4" />
            Asignar automáticamente ({pendingCount})
          </Button>
        </div>
      )}

      {assignSuccess && (
        <Card glass className="border-success/30 bg-success/5">
          <CardContent className="p-3 text-sm text-success">
            Asignación completada exitosamente.
          </CardContent>
        </Card>
      )}

      {!requests || requests.length === 0 ? (
        <Card glass>
          <CardContent className="p-12 text-center">
            <ClipboardList className="mx-auto mb-4 size-12 text-text-muted" />
            <h3 className="text-lg font-display font-semibold text-text-primary">
              Sin solicitudes
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              No hay solicitudes de viaje para este evento aún.
            </p>
          </CardContent>
        </Card>
      ) : (
        <Card glass className="overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-left text-text-secondary">
                  <th className="px-4 py-3 font-medium">Pasajero</th>
                  <th className="px-4 py-3 font-medium">Estado</th>
                  <th className="px-4 py-3 font-medium">Solicitado</th>
                  {canManage && (
                    <th className="px-4 py-3 text-right font-medium">Acciones</th>
                  )}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {requests.map((req) => (
                  <tr key={req.id} className="transition hover:bg-surface/50">
                    <td className="px-4 py-3">
                      <div className="font-medium">
                        {req.passenger?.name || req.passenger?.email || '—'}
                      </div>
                      {req.passenger?.email && (
                        <div className="text-xs text-text-secondary">
                          {req.passenger.email}
                        </div>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <Badge variant={statusToBadge(req.status)}>
                        {req.status}
                      </Badge>
                    </td>
                    <td className="px-4 py-3 text-text-secondary">
                      {new Date(req.createdAt).toLocaleDateString('es', {
                        day: 'numeric',
                        month: 'short',
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                    {canManage && req.status === 'PENDING' && (
                      <td className="px-4 py-3 text-right">
                        <div className="flex justify-end gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                requestId: req.id,
                                status: 'ACCEPTED',
                              })
                            }
                            loading={updateStatus.isPending}
                            className="border-success/30 text-success hover:bg-success/10"
                          >
                            <CheckCircle2 className="size-3.5" />
                            Aprobar
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              updateStatus.mutate({
                                requestId: req.id,
                                status: 'REJECTED',
                              })
                            }
                            loading={updateStatus.isPending}
                            className="border-destructive/30 text-destructive hover:bg-destructive/10"
                          >
                            <XCircle className="size-3.5" />
                            Rechazar
                          </Button>
                        </div>
                      </td>
                    )}
                    {canManage && req.status !== 'PENDING' && (
                      <td className="px-4 py-3 text-right">
                        <Badge variant={statusToBadge(req.status)}>
                          {req.status}
                        </Badge>
                      </td>
                    )}
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
