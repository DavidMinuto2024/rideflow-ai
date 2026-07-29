'use client';

import { useMemo } from 'react';
import { Navigation, Users, CalendarDays, Clock, MapPin, RefreshCw } from 'lucide-react';
import { useDriverDashboard } from '@/lib/queries/driver';
import { PageContainer, EmptyState } from '@/components/PageContainer';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Skeleton } from '@/components/ui/Skeleton';
import { Button } from '@/components/ui/Button';
import { GradientText } from '@/components/ui/aceternity/GradientText';
import { ApiError } from '@/lib/api';

// ── Helpers ────────────────────────────────────────────────

function formatTime(iso?: string) {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString('es-CO', {
    hour: '2-digit',
    minute: '2-digit',
  });
}

function statusVariant(status: string): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (status) {
    case 'OPEN':
      return 'success';
    case 'PUBLISHED':
      return 'info';
    case 'CLOSED':
      return 'warning';
    case 'FINISHED':
      return 'outline';
    default:
      return 'default';
  }
}

// ── Skeleton ───────────────────────────────────────────────

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <div className="flex flex-col gap-1">
        <Skeleton className="h-8 w-56" />
        <Skeleton className="h-4 w-72" />
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {Array.from({ length: 2 }).map((_, i) => (
          <Card key={i}>
            <CardContent className="p-5">
              <div className="flex items-center gap-3">
                <Skeleton className="size-10 rounded-lg" />
                <div className="flex flex-col gap-1.5">
                  <Skeleton className="h-7 w-16" />
                  <Skeleton className="h-4 w-24" />
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
      <Skeleton className="h-6 w-40" />
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-5 w-48 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-3/4" />
        </CardContent>
      </Card>
      <Skeleton className="h-6 w-40" />
      <Card>
        <CardContent className="p-5">
          <Skeleton className="h-5 w-32 mb-3" />
          <Skeleton className="h-4 w-full mb-2" />
          <Skeleton className="h-4 w-2/3" />
        </CardContent>
      </Card>
    </div>
  );
}

// ── Status badge helper ────────────────────────────────────

function TripStatusBadge({ status }: { status: string }) {
  return <Badge variant={statusVariant(status)}>{status}</Badge>;
}

// ── Page ───────────────────────────────────────────────────

export default function DriverDashboardPage() {
  const {
    data: dashboard,
    isLoading,
    error,
    refetch,
  } = useDriverDashboard();

  if (isLoading) return <DashboardSkeleton />;

  return (
    <PageContainer
      title="Panel del Conductor"
      description="Resumen de tus viajes y pasajeros hoy."
    >
      {/* Error banner */}
      {error && (
        <div className="flex items-center justify-between rounded-xl border border-destructive/30 bg-destructive/10 p-4">
          <p className="text-sm text-destructive">
            {error instanceof ApiError
              ? error.message
              : 'Error al cargar el panel del conductor'}
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
          description="No se encontraron datos del conductor."
        />
      ) : (
        <>
          {/* ── KPIs ────────────────────────────────── */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <Card glass>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-primary/10">
                    <Navigation className="size-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">
                      {dashboard.tripsToday}
                    </p>
                    <p className="text-sm text-text-secondary">Viajes Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card glass>
              <CardContent className="p-5">
                <div className="flex items-center gap-3">
                  <div className="flex size-10 items-center justify-center rounded-lg bg-success/10">
                    <Users className="size-5 text-success" />
                  </div>
                  <div>
                    <p className="text-2xl font-display font-bold">
                      {dashboard.totalPassengersToday}
                    </p>
                    <p className="text-sm text-text-secondary">Pasajeros Hoy</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>

          {/* ── Next Trip ──────────────────────────── */}
          <div>
            <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">
              Próximo Viaje
            </GradientText>
            {dashboard.nextTrip ? (
              <Card glow>
                <CardContent className="p-5">
                  <div className="flex items-start justify-between">
                    <div className="space-y-2">
                      <p className="font-display text-lg font-semibold">
                        {dashboard.nextTrip.eventName}
                      </p>
                      <div className="flex items-center gap-2 text-sm text-text-secondary">
                        <MapPin className="size-4 shrink-0" />
                        <span>{dashboard.nextTrip.destination}</span>
                      </div>
                      {dashboard.nextTrip.estimatedDepartureTime && (
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Clock className="size-4 shrink-0" />
                          <span>
                            Sale: {formatTime(dashboard.nextTrip.estimatedDepartureTime)}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </CardContent>
              </Card>
            ) : (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary">Sin viajes pendientes</p>
                </CardContent>
              </Card>
            )}
          </div>

          {/* ── Upcoming Events ────────────────────── */}
          <div>
            <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">
              Próximos Eventos
            </GradientText>
            {dashboard.upcomingEvents.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary">
                    No tienes eventos próximos como conductor
                  </p>
                </CardContent>
              </Card>
            ) : (
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                {dashboard.upcomingEvents.map((ev) => (
                  <Card key={ev.id}>
                    <CardContent className="p-4">
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <p className="font-medium">{ev.title}</p>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <CalendarDays className="size-3.5" />
                            <span>
                              {new Date(ev.date).toLocaleDateString('es-CO', {
                                day: 'numeric',
                                month: 'short',
                              })}
                            </span>
                          </div>
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <MapPin className="size-3.5" />
                            <span className="truncate">
                              {ev.origin} → {ev.destination}
                            </span>
                          </div>
                        </div>
                        <TripStatusBadge status={ev.status} />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>

          {/* ── Today Trips ────────────────────────── */}
          <div>
            <GradientText as="h2" shimmer={false} className="mb-3 text-lg font-display font-semibold">
              Viajes de Hoy
            </GradientText>
            {dashboard.todayTrips.length === 0 ? (
              <Card>
                <CardContent className="p-8 text-center">
                  <p className="text-text-secondary">No tienes viajes programados para hoy</p>
                </CardContent>
              </Card>
            ) : (
              <div className="space-y-2">
                {dashboard.todayTrips.map((trip) => (
                  <Card key={trip.id}>
                    <CardContent className="flex items-center justify-between p-4">
                      <div className="space-y-1">
                        <p className="font-medium">{trip.eventName}</p>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <MapPin className="size-3.5" />
                          <span>{trip.destination}</span>
                        </div>
                        <div className="flex items-center gap-2 text-sm text-text-secondary">
                          <Users className="size-3.5" />
                          <span>{trip.passengerCount} pasajeros</span>
                        </div>
                        {trip.estimatedDepartureTime && (
                          <div className="flex items-center gap-2 text-sm text-text-secondary">
                            <Clock className="size-3.5" />
                            <span>Sale: {formatTime(trip.estimatedDepartureTime)}</span>
                          </div>
                        )}
                      </div>
                      <TripStatusBadge status={trip.status} />
                    </CardContent>
                  </Card>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </PageContainer>
  );
}
