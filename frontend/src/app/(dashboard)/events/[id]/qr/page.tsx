'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Share2, QrCode } from 'lucide-react';
import { useEvent } from '@/lib/queries/events';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

export default function EventQrPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: event, isLoading, error } = useEvent(id);

  const handleShare = async () => {
    if (!event?.inviteToken) return;
    const inviteUrl = `${window.location.origin}/invite/${event.inviteToken}`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: event.title,
          text: `Únete a "${event.title}" — ${event.origin} → ${event.destination}`,
          url: inviteUrl,
        });
      } catch {
        // user cancelled
      }
    } else {
      try {
        await navigator.clipboard.writeText(inviteUrl);
        alert('¡Enlace copiado al portapapeles!');
      } catch {
        // fallback
      }
    }
  };

  if (isLoading) {
    return (
      <PageContainer title="Código QR">
        <Skeleton className="mx-auto h-96 w-full max-w-sm rounded-xl" />
      </PageContainer>
    );
  }

  if (error || !event) {
    return (
      <PageContainer title="Código QR">
        <Card glass>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error al cargar el evento</p>
            <div className="mt-4">
              <Link href={`/events/${id}`}>
                <Button variant="link">
                  <ArrowLeft className="size-4" />
                  Volver al evento
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Compartir invitación"
      description={`Escanea el código QR para unirte a "${event.title}"`}
      action={
        <Link href={`/events/${id}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver
          </Button>
        </Link>
      }
    >
      <div className="flex flex-col items-center">
        <Card glass className="w-full max-w-sm">
          <CardContent className="p-8 text-center">
            {event.qrCodeSvg ? (
              <div
                className="mx-auto mb-6"
                style={{ maxWidth: 280 }}
                dangerouslySetInnerHTML={{ __html: event.qrCodeSvg }}
              />
            ) : (
              <div className="mx-auto mb-6 flex size-64 items-center justify-center rounded-xl bg-surface-hover">
                <QrCode className="size-16 text-text-muted" />
              </div>
            )}

            <h2 className="mb-1 text-lg font-display font-semibold">
              {event.title}
            </h2>
            <p className="mb-1 text-sm text-text-secondary">
              {event.origin} → {event.destination}
            </p>
            <p className="mb-6 text-xs text-text-muted">
              {new Date(event.date).toLocaleDateString('es', {
                weekday: 'long',
                day: 'numeric',
                month: 'long',
              })}
            </p>

            <Button onClick={handleShare} className="w-full">
              <Share2 className="size-4" />
              Compartir invitación
            </Button>

            {event.inviteToken && (
              <p className="mt-4 break-all text-xs text-text-muted">
                Enlace: {window.location.origin}/invite/{event.inviteToken}
              </p>
            )}
          </CardContent>
        </Card>
      </div>
    </PageContainer>
  );
}
