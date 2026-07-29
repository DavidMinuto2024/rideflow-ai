'use client';

import { CalendarDays, Clock, MapPin, RefreshCw, Users, Building2 } from 'lucide-react';
import Link from 'next/link';
import { usePassengerDashboard } from '@/lib/queries/passenger';
import { PageContainer, EmptyState } from '@/components/PageContainer';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import { GradientText } from '@/components/ui/aceternity/GradientText';
import { ApiError } from '@/lib/api';

// ── Helpers ────────────────────────────────────────────────

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (status) {
    case 'PENDING':
      return 'warning';
    case 'ACCEPTED':
    case 'OPEN':
      return 'success';
    case 'REJECTED':
    case 'CANCELLED':
      return 'error';
    case 'PUBLISHED':
      return 'info';
    default:
      return 'default';
  }
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('es-CO', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Skeleton ───────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-8 w-56" />
      <Skeleton className="h-4 w-72" />
      {Array.from({ length: 3 }).map((_, i) => (
        <div key={i}>
          <Skeleton className="h-6 w-44 mb-3" />
          <Card>
            <CardContent className="p-5">
              <Skeleton className="h-5 w-3/4 mb-2" />
              <Skeleton className="h-4 w-1/2" />
            </CardContent>
          </Card>
        </div>
      ))}
    </div>
  );
}

// ── Page ───────────────────────────────────────────────────

export default function PassengerDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = usePassengerDashboard();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageContainer
      title="Mis Solicitudes"
      description="Solicitudes de viaje, viajes aceptados y eventos disponibles."
    >
      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof ApiError
              ? error.message
              : 'Error al cargar tus solicitudes'}
          </p>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => refetch()}
            className="text-destructive hover:bg-destructive/10"
          >
            <RefreshCw className="mr-1.5 size-3.5" />
            Reintentar
          </Button>
        </div>
      )}

      {!dashboard ? (
        <EmptyState
          title="Sin datos"
          description="No se encontraron datos de pasajero."
        />
      ) : (
        <>
          {/* ── Active Requests ──────────────────────── */}
          <div>
            <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">
              Solicitudes Activas
            </GradientText>
            {dashboard.activeRequests.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary">Sin solicitudes activas</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {dashboard.activeRequests.map((req) => (
                  <Card key={req.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{req.eventName}</p>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <CalendarDays className="size-3.5" />
                          <span>{formatDate(req.eventDate)}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Clock className="size-3.5" />
                          <span>Solicitado: {formatDate(req.createdAt)}</span>
                        </div>
                      </div>
                      <Badge variant={statusVariant(req.status)}>
                        {req.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── Accepted Trips ────────────────────────── */}
          <div>
            <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">
              Viajes Aceptados
            </GradientText>
            {dashboard.acceptedTrips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary">Sin viajes aceptados</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {dashboard.acceptedTrips.map((trip) => (
                  <Card key={trip.tripId}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{trip.eventName}</p>
                        {trip.driverName && (
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Users className="size-3.5" />
                            <span>Conductor: {trip.driverName}</span>
                          </div>
                        )}
                        {trip.estimatedPickupTime && (
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Clock className="size-3.5" />
                            <span>Recoge: {formatTime(trip.estimatedPickupTime)}</span>
                          </div>
                        )}
                      </div>
                      <Badge variant={statusVariant(trip.status)}>
                        {trip.status}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── Available Events ──────────────────────── */}
          <div>
            <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">
              Eventos Disponibles
            </GradientText>
            {dashboard.availableEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary">
                    No hay eventos disponibles para solicitar
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dashboard.availableEvents.map((ev) => (
                  <Link key={ev.id} href={`/events/${ev.id}`}>
                    <Card className="transition hover:border-primary/50 h-full">
                      <CardContent className="p-4 flex flex-col h-full">
                        <div className="flex-1 space-y-2">
                          <p className="font-medium">{ev.title}</p>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <CalendarDays className="size-3.5 shrink-0" />
                            <span>{formatDate(ev.date)}</span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <MapPin className="size-3.5 shrink-0" />
                            <span className="truncate">
                              {ev.origin} → {ev.destination}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Building2 className="size-3.5 shrink-0" />
                            <span>{ev.organizationName}</span>
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
