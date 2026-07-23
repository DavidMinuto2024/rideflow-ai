'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useEvent } from '@/lib/queries/events';
import { useCreateRequest } from '@/lib/queries/rides';
import { PageContainer } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';

export default function RequestRidePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const createRequest = useCreateRequest(eventId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (eventLoading) return <PageSkeleton />;

  if (!event) {
    return (
      <PageContainer title="Solicitar Viaje">
        <div className="panel p-8 text-center">
          <p className="text-red-400">Evento no encontrado</p>
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

  if (event.status !== 'OPEN') {
    return (
      <PageContainer title="Solicitar Viaje">
        <div className="panel p-8 text-center">
          <p className="text-yellow-400 mb-2">
            Este evento no está aceptando solicitudes actualmente.
          </p>
          <p className="text-sm text-rideflow-muted mb-4">
            Estado actual: <strong>{event.status}</strong>
          </p>
          <Link
            href={`/events/${eventId}`}
            className="text-rideflow-amber hover:underline text-sm"
          >
            ← Volver al evento
          </Link>
        </div>
      </PageContainer>
    );
  }

  const handleSubmit = async () => {
    setError(null);
    try {
      await createRequest.mutateAsync();
      setSuccess(true);
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al enviar la solicitud');
      }
    }
  };

  return (
    <PageContainer
      title="Solicitar Viaje"
      description={`${event.title} — ${event.origin} → ${event.destination}`}
      action={
        <Link
          href={`/events/${eventId}`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Volver
        </Link>
      }
    >
      {success ? (
        <div className="panel p-8 text-center space-y-4">
          <div className="w-16 h-16 mx-auto rounded-full bg-green-500/10 flex items-center justify-center">
            <svg
              className="w-8 h-8 text-green-400"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M5 13l4 4L19 7"
              />
            </svg>
          </div>
          <h2 className="text-xl font-display font-semibold">
            ¡Solicitud enviada!
          </h2>
          <p className="text-rideflow-muted text-sm">
            Tu solicitud de viaje ha sido registrada. El organizador la revisará
            pronto.
          </p>
          <div className="flex gap-3 justify-center pt-2">
            <button
              onClick={() => router.push(`/events/${eventId}/requests`)}
              className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
            >
              Ver solicitudes
            </button>
            <Link
              href={`/events/${eventId}`}
              className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
            >
              Volver al evento
            </Link>
          </div>
        </div>
      ) : (
        <div className="max-w-lg">
          <div className="panel p-6 space-y-6">
            <div className="space-y-3 text-sm">
              <div className="flex justify-between">
                <span className="text-rideflow-muted">Evento</span>
                <span className="font-medium">{event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-rideflow-muted">Ruta</span>
                <span className="font-medium">
                  {event.origin} → {event.destination}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-rideflow-muted">Fecha</span>
                <span className="font-medium">
                  {new Date(event.date).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-rideflow-muted">Capacidad</span>
                <span className="font-medium">{event.capacity} plazas</span>
              </div>
            </div>

            {error && (
              <div className="p-3 bg-red-500/10 border border-red-500/30 rounded-lg text-sm text-red-400">
                {error}
              </div>
            )}

            <button
              onClick={handleSubmit}
              disabled={createRequest.isPending}
              className="w-full py-3 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm disabled:opacity-50"
            >
              {createRequest.isPending
                ? 'Enviando...'
                : 'Solicitar viaje'}
            </button>
          </div>
        </div>
      )}
    </PageContainer>
  );
}
