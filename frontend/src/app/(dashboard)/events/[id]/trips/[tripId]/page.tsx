'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, User, Car, Route, Clock, Users, MapPin, Navigation } from 'lucide-react';
import { useEvent } from '@/lib/queries/events';
import { useTrip, useTripRoute, type TripPassengerAssignment } from '@/lib/queries/trips';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';
import dynamic from 'next/dynamic';
import { buildWazeDeepLink, buildGoogleMapsCoordsLink } from '@/lib/maps';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => <Skeleton className="h-96 w-full rounded-xl" />,
});

function TripDetailSkeleton() {
  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
      <div className="flex flex-col gap-4 lg:col-span-1">
        <Skeleton className="h-40 rounded-xl" />
        <Skeleton className="h-32 rounded-xl" />
        <Skeleton className="h-40 rounded-xl" />
      </div>
      <Skeleton className="h-96 rounded-xl lg:col-span-2" />
    </div>
  );
}

export default function TripDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const tripId = params.tripId as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: trip, isLoading: tripLoading } = useTrip(eventId, tripId);

  const mapWaypoints: Array<{ lat: number; lng: number; label: string; color: string }> = [
    {
      lat: 4.871100695973315,
      lng: -74.057979146935,
      label: 'Punto de encuentro — Terra Forte, Chía',
      color: '#3b82f6',
    },
  ];

  const { data: route } = useTripRoute(eventId, tripId, mapWaypoints);

  if (eventLoading || tripLoading) return <TripDetailSkeleton />;

  if (!trip) {
    return (
      <PageContainer title="Viaje">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Viaje no encontrado</p>
            <div className="mt-4">
              <Link href={`/events/${eventId}/trips`}>
                <Button variant="link">
                  <ArrowLeft className="size-4" />
                  Volver a viajes
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </PageContainer>
    );
  }

  const hasRouteMap = event?.destLat != null && event?.destLng != null;
  const routeGeometry = route?.geometry || trip?.routeGeometry;
  const mapOriginLat = trip?.originLat ?? event?.originLat ?? undefined;
  const mapOriginLng = trip?.originLng ?? event?.originLng ?? undefined;
  const mapOriginLabel = trip?.origin || event?.origin || 'Salida';

  return (
    <PageContainer
      title="Detalle del Viaje"
      description={`Conductor: ${trip.driver?.name || 'Sin asignar'}`}
      action={
        <Link href={`/events/${eventId}/trips`}>
          <Button variant="outline" size="sm">
            <ArrowLeft className="size-4" />
            Todos los viajes
          </Button>
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info panel */}
        <div className="flex flex-col gap-4 lg:col-span-1">
          {/* Driver info */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                <User className="size-4 text-primary" />
                Conductor
              </h3>
              <div className="mb-3 flex items-center gap-3">
                <div className="flex size-10 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                  {trip.driver?.name?.[0]?.toUpperCase() || '?'}
                </div>
                <div>
                  <p className="font-medium">{trip.driver?.name || 'Sin asignar'}</p>
                  {trip.driver?.email && (
                    <p className="text-xs text-text-secondary">{trip.driver.email}</p>
                  )}
                </div>
              </div>
              {trip.estimatedDepartureTime && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="size-3.5 text-text-secondary" />
                  <span className="text-text-secondary">Hora estimada de salida: </span>
                  <span className="font-medium">
                    {new Date(trip.estimatedDepartureTime).toLocaleTimeString('es', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
              {event?.arrivalTime && (
                <div className="mt-1 flex items-center gap-2 text-sm">
                  <MapPin className="size-3.5 text-text-secondary" />
                  <span className="text-text-secondary">Llegada (evento): </span>
                  <span className="font-medium">
                    {new Date(event.arrivalTime).toLocaleTimeString('es', {
                      hour: '2-digit',
                      minute: '2-digit',
                    })}
                  </span>
                </div>
              )}
            </CardContent>
          </Card>

          {/* Vehicle info */}
          {trip.vehicle && (
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                  <Car className="size-4 text-primary" />
                  Vehículo
                </h3>
                <div className="flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Modelo</span>
                    <span className="font-medium">{trip.vehicle.model || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Placa</span>
                    <span className="font-medium">{trip.vehicle.plate || '—'}</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Capacidad</span>
                    <span className="font-medium">{trip.vehicle.capacity || '—'} plazas</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Route stats */}
          {route && (
            <Card>
              <CardContent className="p-5">
                <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                  <Route className="size-4 text-primary" />
                  Ruta
                </h3>
                <div className="mb-3 flex flex-col gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Distancia</span>
                    <span className="font-medium">{route.distance.toFixed(1)} km</span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-text-secondary">Duración</span>
                    <span className="font-medium">{Math.round(route.duration / 60)} min</span>
                  </div>
                </div>

                {/* Navigation deep links */}
                {mapOriginLat != null && mapOriginLng != null && event?.destLat != null && event?.destLng != null && (
                  <div className="border-t border-border pt-3">
                    <p className="mb-2 text-xs font-medium uppercase tracking-wide text-text-secondary">
                      Abrir en navegación
                    </p>
                    <div className="flex gap-2">
                      <a
                        href={buildWazeDeepLink(event.destLat, event.destLng)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg border border-blue-600/30 bg-blue-600/10 px-3 py-2 text-center text-sm font-medium text-blue-400 transition hover:brightness-110"
                      >
                        <Navigation className="mr-1.5 inline-block size-3.5" />
                        Waze
                      </a>
                      <a
                        href={buildGoogleMapsCoordsLink(
                          mapOriginLat!,
                          mapOriginLng!,
                          event.destLat!,
                          event.destLng!,
                        )}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex-1 rounded-lg border border-success/30 bg-success/10 px-3 py-2 text-center text-sm font-medium text-success transition hover:brightness-110"
                      >
                        Google Maps
                      </a>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {/* Passengers */}
          <Card>
            <CardContent className="p-5">
              <h3 className="mb-3 flex items-center gap-2 font-display font-semibold">
                <Users className="size-4 text-primary" />
                Pasajeros ({trip.assignments?.length ?? 0})
              </h3>
              {trip.assignments && trip.assignments.length > 0 ? (
                <div className="flex flex-col gap-2">
                  {trip.assignments.map((a) => {
                    const assignment = a as TripPassengerAssignment;
                    const pickupTime = assignment.estimatedPickupTime;
                    const pickupOrder = assignment.pickupOrder;
                    return (
                      <div
                        key={a.id}
                        className="flex items-center gap-3 rounded-lg bg-surface-hover px-3 py-2"
                      >
                        <div className="flex size-8 items-center justify-center rounded-full bg-surface text-xs font-semibold text-text-secondary">
                          {a.passenger.name?.[0]?.toUpperCase() || '?'}
                        </div>
                        <div className="flex-1">
                          <p className="text-sm font-medium">
                            {a.passenger.name || '—'}
                          </p>
                          {a.passenger.email && (
                            <p className="text-xs text-text-secondary">
                              {a.passenger.email}
                            </p>
                          )}
                          {pickupTime && (
                            <p className="text-xs text-primary">
                              Recogida ~
                              {new Date(pickupTime).toLocaleTimeString('es', {
                                hour: '2-digit',
                                minute: '2-digit',
                              })}
                              {pickupOrder != null && ` · Parada #${pickupOrder}`}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              ) : (
                <p className="text-sm text-text-secondary">No hay pasajeros asignados.</p>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          {hasRouteMap ? (
            <Card className="overflow-hidden">
              <MapView
                originLat={mapOriginLat}
                originLng={mapOriginLng}
                destLat={event!.destLat!}
                destLng={event!.destLng!}
                routeGeometry={routeGeometry}
                originLabel={mapOriginLabel}
                destLabel={event!.destination}
                waypoints={mapWaypoints}
                zoom={12}
              />
              <div className="flex flex-wrap items-center gap-4 p-3 text-xs text-text-secondary">
                <div className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded-full bg-success" />
                  {mapOriginLabel}
                </div>
                {mapWaypoints.map((wp) => (
                  <div key={wp.label} className="flex items-center gap-1.5">
                    <span
                      className="inline-block size-3 rounded-full"
                      style={{ backgroundColor: wp.color }}
                    />
                    {wp.label}
                  </div>
                ))}
                <div className="flex items-center gap-1.5">
                  <span className="inline-block size-3 rounded-full bg-destructive" />
                  {event!.destination}
                </div>
                {route && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-6 bg-primary" />
                    Ruta ({route.distance.toFixed(1)} km)
                  </div>
                )}
                {!route && trip?.distance && (
                  <div className="flex items-center gap-1.5">
                    <span className="inline-block h-0.5 w-6 bg-primary" />
                    ~{(trip.distance / 1000).toFixed(1)} km estimados
                  </div>
                )}
              </div>
            </Card>
          ) : (
            <Card>
              <CardContent className="p-8 text-center">
                <MapPin className="mx-auto mb-2 size-8 text-text-secondary" />
                <p className="text-sm text-text-secondary">
                  No hay coordenadas disponibles para mostrar la ruta en el mapa.
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
