'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Car, ClipboardList, QrCode, SendHorizonal } from 'lucide-react';
import {
  useEvent,
  useUpdateEventStatus,
  canTransitionFrom,
  type EventStatus,
} from '@/lib/queries/events';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import { ApiError } from '@/lib/api';
import { buildWazeDeepLink, buildGoogleMapsDeepLink } from '@/lib/maps';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="h-48 w-full rounded-xl" />,
});

const STATUS_ACTIONS: Record<EventStatus, EventStatus> = {
  DRAFT: 'PUBLISHED',
  PUBLISHED: 'OPEN',
  OPEN: 'CLOSED',
  CLOSED: 'FINISHED',
  FINISHED: null as unknown as EventStatus,
};

function statusToBadge(
  status: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (status) {
    case 'DRAFT':
      return 'outline';
    case 'PUBLISHED':
      return 'info';
    case 'OPEN':
      return 'success';
    case 'CLOSED':
      return 'warning';
    case 'FINISHED':
      return 'default';
    default:
      return 'outline';
  }
}

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: event, isLoading, error } = useEvent(id);
  const updateStatus = useUpdateEventStatus(id);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) {
    return (
      <PageContainer title="Evento">
        <Skeleton className="h-16 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <Skeleton className="h-64 rounded-xl" />
          <Skeleton className="h-64 rounded-xl" />
        </div>
      </PageContainer>
    );
  }

  if (error || !event) {
    return (
      <PageContainer title="Evento">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error al cargar el evento</p>
            <div className="mt-4">
              <Link href="/events">
                <Button variant="link">
                  <ArrowLeft className="size-4" />
                  Volver a eventos
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const nextStatus = STATUS_ACTIONS[event.status];
  const possibleTransitions = canTransitionFrom(event.status);

  const handleStatusChange = async (newStatus: EventStatus) => {
    setActionError(null);
    try {
      await updateStatus.mutateAsync(newStatus);
    } catch (err) {
      if (err instanceof ApiError) {
        setActionError(err.message);
      } else {
        setActionError('Error al cambiar estado');
      }
    }
  };

  const hasCoords = event.originLat && event.originLng;

  return (
    <PageContainer
      title={event.title}
      description={`${event.origin} → ${event.destination}`}
      action={
        <Link href="/events">
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </Link>
      }
    >
      {/* Status + Actions */}
      <Card>
        <CardContent className="flex flex-wrap items-center justify-between gap-3 p-5">
          <div className="flex items-center gap-3">
            <Badge variant={statusToBadge(event.status)}>{event.status}</Badge>
            <span className="text-sm text-text-muted">{event.capacity} plazas</span>
          </div>
          <div className="flex gap-2">
            {possibleTransitions.map((status) => (
              <Button
                key={status}
                size="sm"
                onClick={() => handleStatusChange(status)}
                loading={updateStatus.isPending}
              >
                → {status}
              </Button>
            ))}
          </div>
        </CardContent>
        {actionError && (
          <div className="px-5 pb-4">
            <p className="text-sm text-destructive">{actionError}</p>
          </div>
        )}
      </Card>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        <Link href={`/events/${id}/trips`}>
          <Button variant="outline" size="sm">
            <Car className="size-4" />
            Viajes
          </Button>
        </Link>
        <Link href={`/events/${id}/requests`}>
          <Button variant="outline" size="sm">
            <ClipboardList className="size-4" />
            Solicitudes
          </Button>
        </Link>
        {event.status === 'OPEN' && (
          <Link href={`/events/${id}/request`}>
            <Button size="sm">
              <SendHorizonal className="size-4" />
              Solicitar viaje
            </Button>
          </Link>
        )}
        {event.inviteToken && (
          <Link href={`/events/${id}/qr`}>
            <Button variant="outline" size="sm">
              <QrCode className="size-4" />
              QR Invitación
            </Button>
          </Link>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="flex flex-col gap-4">
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-4 font-display font-semibold">Detalles</h3>
              <div className="grid grid-cols-2 gap-4 text-sm">
                <div>
                  <p className="text-text-secondary">Fecha</p>
                  <p className="font-medium">
                    {new Date(event.date).toLocaleDateString('es', {
                      weekday: 'long',
                      day: 'numeric',
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Conductor</p>
                  <p className="font-medium">
                    {event.driver?.name ?? 'Sin asignar'}
                  </p>
                </div>
                <div>
                  <p className="text-text-secondary">Origen</p>
                  <p className="font-medium">{event.origin}</p>
                </div>
                <div>
                  <p className="text-text-secondary">Destino</p>
                  <p className="font-medium">{event.destination}</p>
                </div>
                {event.arrivalTime && (
                  <div>
                    <p className="text-text-secondary">Hora de llegada</p>
                    <p className="font-medium">
                      {new Date(event.arrivalTime).toLocaleTimeString('es', {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </p>
                  </div>
                )}
                {event.vehicle && (
                  <div>
                    <p className="text-text-secondary">Vehículo</p>
                    <p className="font-medium">
                      {event.vehicle.model || event.vehicle.plate || '—'}
                    </p>
                  </div>
                )}
              </div>
              {event.description && (
                <div className="mt-4">
                  <p className="text-sm text-text-secondary">Descripción</p>
                  <p className="mt-1 text-sm">{event.description}</p>
                </div>
              )}
            </CardContent>
          </Card>

          {/* EventVehicles registered */}
          {event.eventVehicles && event.eventVehicles.length > 0 && (
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-3 font-display font-semibold">
                  Vehículos registrados ({event.eventVehicles.length})
                </h3>
                <div className="flex flex-col gap-2">
                  {event.eventVehicles.map((ev) => (
                    <div
                      key={ev.id}
                      className="flex items-center justify-between rounded-lg bg-surface-hover px-3 py-2 text-sm"
                    >
                      <div>
                        <p className="font-medium">
                          {ev.vehicle?.model || ev.vehicle?.plate || 'Vehículo'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          Conductor: {ev.driver?.name || '—'}
                          {ev.startLocation && ` · Salida: ${ev.startLocation}`}
                        </p>
                      </div>
                      {ev.picoYPlaca && (
                        <span className="whitespace-nowrap text-xs font-medium text-destructive">
                          Pico y placa
                        </span>
                      )}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )}
        </div>

        {/* Map */}
        <div>
          {hasCoords ? (
            <Card className="overflow-hidden">
              <MapView
                center={[event.originLat!, event.originLng!]}
                zoom={14}
              />
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <p className="text-sm text-text-secondary">
                  No hay coordenadas disponibles para mostrar en el mapa.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
