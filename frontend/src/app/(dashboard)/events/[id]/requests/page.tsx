'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2, XCircle, Sparkles, ClipboardList, Ban, UserPlus } from 'lucide-react';
import { useEvent } from '@/lib/queries/events';
import { useSession } from '@/lib/queries/auth';
import {
  useEventRequests,
  useUpdateRequestStatus,
  useCancelRequest,
  useDirectAssign,
  useAutoAssign,
} from '@/lib/queries/rides';
import { apiClient } from '@/lib/api';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Modal } from '@/components/ui/Modal';
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
  const cancelRequest = useCancelRequest();
  const autoAssign = useAutoAssign(eventId);
  const [assignSuccess, setAssignSuccess] = useState(false);
  const [cancelModal, setCancelModal] = useState<string | null>(null);
  const [assignModal, setAssignModal] = useState<{ requestId: string; passengerId: string } | null>(null);
  const [drivers, setDrivers] = useState<{ id: string; name: string; vehicle: string }[]>([]);
  const [selectedDriver, setSelectedDriver] = useState('');
  const [loadingDrivers, setLoadingDrivers] = useState(false);
  const directAssign = useDirectAssign(eventId);

  const canManage = session?.memberships?.some((m) => {
    if (!event) return false;
    return m.organization.id === event.organizationId && ALLOWED_ROLES.includes(m.role);
  });

  const currentUserId = session?.user?.id;

  const isOwnPending = (req: { passengerId: string; status: string }) =>
    req.passengerId === currentUserId && req.status === 'PENDING';

  // Fetch drivers when assign modal opens
  useEffect(() => {
    if (assignModal) {
      setLoadingDrivers(true);
      setSelectedDriver('');
      apiClient
        .get<{ id: string; driver: { id: string; name: string }; vehicle: { model: string; plate: string } }[]>(
          `/events/${eventId}/vehicles`,
        )
        .then((data) => {
          setDrivers(
            (data ?? []).map((ev) => ({
              id: ev.driver.id,
              name: ev.driver.name,
              vehicle: `${ev.vehicle.model} (${ev.vehicle.plate})`,
            })),
          );
        })
        .catch(() => setDrivers([]))
        .finally(() => setLoadingDrivers(false));
    }
  }, [assignModal, eventId]);

  const handleDirectAssign = () => {
    if (!assignModal || !selectedDriver) return;
    directAssign.mutate(
      { passengerId: assignModal.passengerId, driverId: selectedDriver },
      {
        onSuccess: () => {
          setAssignModal(null);
          refetch();
        },
      },
    );
  };

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
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              setAssignModal({
                                requestId: req.id,
                                passengerId: req.passengerId,
                              })
                            }
                            className="border-primary/30 text-primary hover:bg-primary/10"
                          >
                            <UserPlus className="size-3.5" />
                            Asignar a...
                          </Button>
                        </div>
                      </td>
                    )}
                    {isOwnPending(req) && !canManage && (
                      <td className="px-4 py-3 text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={() => setCancelModal(req.id)}
                          className="border-destructive/30 text-destructive hover:bg-destructive/10"
                        >
                          <Ban className="size-3.5" />
                          Cancelar
                        </Button>
                      </td>
                    )}
                    {((canManage && req.status !== 'PENDING') || (!isOwnPending(req) && !canManage)) && (
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
      {/* Cancel confirmation modal */}
      <Modal
        open={!!cancelModal}
        onClose={() => setCancelModal(null)}
        title="Cancelar solicitud"
      >
        <p className="mb-4 text-sm text-text-secondary">
          ¿Seguro que deseas cancelar tu solicitud de viaje? Esta acción no se puede deshacer.
        </p>
        <div className="flex gap-3">
          <Button
            onClick={() => {
              if (cancelModal) {
                cancelRequest.mutate(cancelModal);
                setCancelModal(null);
              }
            }}
            loading={cancelRequest.isPending}
            variant="destructive"
          >
            Cancelar solicitud
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={() => setCancelModal(null)}
          >
            Volver
          </Button>
        </div>
      </Modal>
      {/* Assign driver modal */}
      <Modal
        open={!!assignModal}
        onClose={() => setAssignModal(null)}
        title="Asignar pasajero a conductor"
      >
        <div className="flex flex-col gap-4">
          {loadingDrivers ? (
            <p className="text-sm text-text-secondary">Cargando conductores disponibles...</p>
          ) : drivers.length === 0 ? (
            <p className="text-sm text-text-secondary">
              No hay conductores disponibles para este evento.
            </p>
          ) : (
            <>
              <div>
                <label htmlFor="driver-select" className="mb-1 block text-sm font-medium">
                  Seleccionar conductor
                </label>
                <select
                  id="driver-select"
                  value={selectedDriver}
                  onChange={(e) => setSelectedDriver(e.target.value)}
                  className="flex w-full rounded-md border bg-surface px-3 py-2 text-sm shadow-sm transition-colors focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
                >
                  <option value="">— Selecciona un conductor —</option>
                  {drivers.map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} — {d.vehicle}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex gap-3 pt-2">
                <Button
                  onClick={handleDirectAssign}
                  loading={directAssign.isPending}
                  disabled={!selectedDriver}
                >
                  <UserPlus className="size-4" />
                  Asignar
                </Button>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAssignModal(null)}
                >
                  Cancelar
                </Button>
              </div>
            </>
          )}
        </div>
      </Modal>
    </PageContainer>
  );
}
