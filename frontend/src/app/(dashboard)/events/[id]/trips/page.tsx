'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Car, Users, Route } from 'lucide-react';
import { useEvent } from '@/lib/queries/events';
import { useEventTrips } from '@/lib/queries/trips';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

function TripsListSkeleton() {
  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-40 rounded-xl" />
      ))}
    </div>
  );
}

export default function EventTripsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: trips, isLoading } = useEventTrips(eventId);

  if (isLoading || eventLoading) return <TripsListSkeleton />;

  return (
    <PageContainer
      title="Viajes"
      description={event ? `Viajes programados para ${event.title}` : undefined}
      action={
        <Link href={`/events/${eventId}`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Volver al evento
          </Button>
        </Link>
      }
    >
      {!trips || trips.length === 0 ? (
        <Card glass>
          <CardContent className="p-12 text-center">
            <Car className="mx-auto mb-4 size-12 text-text-muted" />
            <h3 className="text-lg font-display font-semibold text-text-primary">
              Sin viajes
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Aún no hay viajes asignados para este evento.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/events/${eventId}/trips/${trip.id}`}
              className="block"
            >
              <Card glass className="transition hover:border-primary/50">
                  <CardContent className="p-5">
                  <div className="mb-4 flex items-start justify-between">
                    <div className="flex items-center gap-2">
                      <div className="flex size-9 items-center justify-center rounded-full bg-primary/10">
                        <Car className="size-4 text-primary" />
                      </div>
                      <div>
                        <p className="font-medium text-text-primary transition group-hover:text-primary">
                          {trip.driver?.name || 'Conductor'}
                        </p>
                        <p className="text-xs text-text-secondary">
                          {trip.vehicle?.model || trip.vehicle?.plate || 'Sin vehículo'}
                        </p>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 text-sm">
                    <div className="flex items-center gap-1 text-text-secondary">
                      <Users className="size-4" />
                      <span>{trip.assignments?.length ?? 0} pasajero(s)</span>
                    </div>

                    {trip.distance != null && (
                      <div className="flex items-center gap-1 text-text-secondary">
                        <Route className="size-4" />
                        <span>{trip.distance.toFixed(1)} km</span>
                      </div>
                    )}
                  </div>

                  {/* Passenger list preview */}
                  {trip.assignments && trip.assignments.length > 0 && (
                    <div className="mt-3 border-t border-border pt-3">
                      <div className="flex flex-wrap gap-1.5">
                        {trip.assignments.map((a) => (
                          <span
                            key={a.id}
                            className="inline-flex items-center rounded-full bg-surface-hover px-2 py-0.5 text-xs text-text-secondary"
                          >
                            {a.passenger.name || a.passenger.email}
                          </span>
                        ))}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
