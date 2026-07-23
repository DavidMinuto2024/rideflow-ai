'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  useEvent,
  useUpdateEventStatus,
  canTransitionFrom,
  type EventStatus,
} from '@/lib/queries/events';
import { PageContainer, StatusBadge } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';
import dynamic from 'next/dynamic';
import { ApiError } from '@/lib/api';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-48 bg-rideflow-panel2 rounded-xl animate-pulse" />
  ),
});

const STATUS_ACTIONS: Record<EventStatus, EventStatus> = {
  DRAFT: 'PUBLISHED',
  PUBLISHED: 'OPEN',
  OPEN: 'CLOSED',
  CLOSED: 'FINISHED',
  FINISHED: null as unknown as EventStatus,
};

export default function EventDetailPage() {
  const params = useParams();
  const router = useRouter();
  const id = params.id as string;
  const { data: event, isLoading, error } = useEvent(id);
  const updateStatus = useUpdateEventStatus(id);
  const [actionError, setActionError] = useState<string | null>(null);

  if (isLoading) return <PageSkeleton />;

  if (error || !event) {
    return (
      <PageContainer title="Evento">
        <div className="panel p-8 text-center">
          <p className="text-red-400">Error al cargar el evento</p>
          <Link
            href="/events"
            className="mt-4 inline-block text-rideflow-amber hover:underline text-sm"
          >
            ← Volver a eventos
          </Link>
        </div>
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
        <Link
          href="/events"
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Volver
        </Link>
      }
    >
      {/* Status + Actions */}
      <div className="panel p-5">
        <div className="flex items-center justify-between flex-wrap gap-3">
          <div className="flex items-center gap-3">
            <StatusBadge status={event.status} />
            <span className="text-sm text-rideflow-muted2">
              {event.capacity} plazas
            </span>
          </div>
          <div className="flex gap-2">
            {possibleTransitions.map((status) => (
              <button
                key={status}
                onClick={() => handleStatusChange(status)}
                disabled={updateStatus.isPending}
                className="px-3 py-1.5 bg-rideflow-amber/10 text-rideflow-amber border border-rideflow-amber/30 rounded-lg text-sm font-medium hover:brightness-110 transition disabled:opacity-50"
              >
                {updateStatus.isPending ? '...' : `→ ${status}`}
              </button>
            ))}
          </div>
        </div>
        {actionError && (
          <p className="mt-2 text-sm text-red-400">{actionError}</p>
        )}
      </div>

      {/* Sub-navigation */}
      <div className="flex flex-wrap gap-2">
        <Link
          href={`/events/${id}/trips`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          🚗 Viajes
        </Link>
        <Link
          href={`/events/${id}/requests`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          📋 Solicitudes
        </Link>
        {event.status === 'OPEN' && (
          <Link
            href={`/events/${id}/request`}
            className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
          >
            Solicitar viaje
          </Link>
        )}
      </div>

      {/* Details grid */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="space-y-4">
          <div className="panel p-5 space-y-4">
            <h3 className="font-display font-semibold">Detalles</h3>
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <p className="text-rideflow-muted">Fecha</p>
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
                <p className="text-rideflow-muted">Conductor</p>
                <p className="font-medium">
                  {event.driver?.name ?? 'Sin asignar'}
                </p>
              </div>
              <div>
                <p className="text-rideflow-muted">Origen</p>
                <p className="font-medium">{event.origin}</p>
              </div>
              <div>
                <p className="text-rideflow-muted">Destino</p>
                <p className="font-medium">{event.destination}</p>
              </div>
              {event.vehicle && (
                <div>
                  <p className="text-rideflow-muted">Vehículo</p>
                  <p className="font-medium">
                    {event.vehicle.model || event.vehicle.plate || '—'}
                  </p>
                </div>
              )}
            </div>
            {event.description && (
              <div>
                <p className="text-sm text-rideflow-muted">Descripción</p>
                <p className="text-sm mt-1">{event.description}</p>
              </div>
            )}
          </div>
        </div>

        {/* Map */}
        <div>
          {hasCoords ? (
            <div className="panel overflow-hidden">
              <MapView
                center={[event.originLat!, event.originLng!]}
                zoom={14}
              />
            </div>
          ) : (
            <div className="panel p-8 text-center">
              <p className="text-rideflow-muted text-sm">
                No hay coordenadas disponibles para mostrar en el mapa.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
