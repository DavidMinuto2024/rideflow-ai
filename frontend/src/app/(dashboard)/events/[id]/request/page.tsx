'use client';

import { useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, CheckCircle2 } from 'lucide-react';
import { useEvent } from '@/lib/queries/events';
import { useCreateRequest } from '@/lib/queries/rides';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

export default function RequestRidePage() {
  const params = useParams();
  const router = useRouter();
  const eventId = params.id as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const createRequest = useCreateRequest(eventId);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);

  if (eventLoading) {
    return (
      <PageContainer title="Solicitar Viaje">
        <Skeleton className="h-64 w-full max-w-lg rounded-xl" />
      </PageContainer>
    );
  }

  if (!event) {
    return (
      <PageContainer title="Solicitar Viaje">
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Evento no encontrado</p>
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

  if (event.status !== 'OPEN') {
    return (
      <PageContainer title="Solicitar Viaje">
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="mb-2 text-warning">
              Este evento no está aceptando solicitudes actualmente.
            </p>
            <p className="mb-4 text-sm text-text-secondary">
              Estado actual: <strong>{event.status}</strong>
            </p>
            <Link href={`/events/${eventId}`}>
              <Button variant="link">
                <ArrowLeft className="size-4" />
                Volver al evento
              </Button>
            </Link>
          </CardContent>
        </Card>
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
        <Link href={`/events/${eventId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </Link>
      }
    >
      {success ? (
        <Card glass className="max-w-lg">
          <CardContent className="p-8 text-center">
            <CheckCircle2 className="mx-auto mb-4 size-12 text-success" />
            <h2 className="mb-1 text-xl font-display font-semibold">
              ¡Solicitud enviada!
            </h2>
            <p className="mb-4 text-sm text-text-secondary">
              Tu solicitud de viaje ha sido registrada. El organizador la
              revisará pronto.
            </p>
            <div className="flex justify-center gap-3">
              <Button onClick={() => router.push(`/events/${eventId}/requests`)}>
                Ver solicitudes
              </Button>
              <Link href={`/events/${eventId}`}>
                <Button variant="outline">Volver al evento</Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card glass className="max-w-lg">
          <CardContent className="p-6">
            <div className="mb-6 flex flex-col gap-3 text-sm">
              <div className="flex justify-between">
                <span className="text-text-secondary">Evento</span>
                <span className="font-medium">{event.title}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Ruta</span>
                <span className="font-medium">
                  {event.origin} → {event.destination}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Fecha</span>
                <span className="font-medium">
                  {new Date(event.date).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                  })}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-text-secondary">Capacidad</span>
                <span className="font-medium">{event.capacity} plazas</span>
              </div>
            </div>

            {error && (
              <div
                role="alert"
                className="mb-4 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2.5 text-sm text-destructive"
              >
                {error}
              </div>
            )}

            <Button
              onClick={handleSubmit}
              loading={createRequest.isPending}
              className="w-full"
            >
              Solicitar viaje
            </Button>
          </CardContent>
        </Card>
      )}
    </PageContainer>
  );
}
