'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEvent } from '@/lib/queries/events';
import { useTrip, useTripRoute } from '@/lib/queries/trips';
import { PageContainer } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';
import dynamic from 'next/dynamic';

const MapView = dynamic(() => import('@/components/MapView'), {
  ssr: false,
  loading: () => (
    <div className="h-96 bg-rideflow-panel2 rounded-xl animate-pulse" />
  ),
});

export default function TripDetailPage() {
  const params = useParams();
  const eventId = params.id as string;
  const tripId = params.tripId as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: trip, isLoading: tripLoading } = useTrip(eventId, tripId);
  const { data: route } = useTripRoute(eventId, tripId);

  if (eventLoading || tripLoading) return <PageSkeleton />;

  if (!trip) {
    return (
      <PageContainer title="Viaje">
        <div className="panel p-8 text-center">
          <p className="text-red-400">Viaje no encontrado</p>
          <Link
            href={`/events/${eventId}/trips`}
            className="mt-4 inline-block text-rideflow-amber hover:underline text-sm"
          >
            ← Volver a viajes
          </Link>
        </div>
      </PageContainer>
    );
  }

  const hasRouteMap =
    event?.originLat != null &&
    event?.originLng != null &&
    event?.destLat != null &&
    event?.destLng != null;

  // Use route geometry from the trip or from the route endpoint
  const routeGeometry = route?.geometry || trip?.routeGeometry;

  return (
    <PageContainer
      title="Detalle del Viaje"
      description={`Conductor: ${trip.driver?.name || 'Sin asignar'}`}
      action={
        <Link
          href={`/events/${eventId}/trips`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Todos los viajes
        </Link>
      }
    >
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Info panel */}
        <div className="lg:col-span-1 space-y-4">
          {/* Driver info */}
          <div className="panel p-5 space-y-4">
            <h3 className="font-display font-semibold">Conductor</h3>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-rideflow-amber/10 flex items-center justify-center text-rideflow-amber font-semibold">
                {trip.driver?.name?.[0]?.toUpperCase() || '?'}
              </div>
              <div>
                <p className="font-medium">{trip.driver?.name || 'Sin asignar'}</p>
                {trip.driver?.email && (
                  <p className="text-xs text-rideflow-muted">{trip.driver.email}</p>
                )}
              </div>
            </div>
          </div>

          {/* Vehicle info */}
          {trip.vehicle && (
            <div className="panel p-5 space-y-3">
              <h3 className="font-display font-semibold">Vehículo</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-rideflow-muted">Modelo</span>
                  <span className="font-medium">
                    {trip.vehicle.model || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rideflow-muted">Placa</span>
                  <span className="font-medium">
                    {trip.vehicle.plate || '—'}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rideflow-muted">Capacidad</span>
                  <span className="font-medium">
                    {trip.vehicle.capacity || '—'} plazas
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Route stats */}
          {route && (
            <div className="panel p-5 space-y-3">
              <h3 className="font-display font-semibold">Ruta</h3>
              <div className="text-sm space-y-2">
                <div className="flex justify-between">
                  <span className="text-rideflow-muted">Distancia</span>
                  <span className="font-medium">
                    {route.distance.toFixed(1)} km
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-rideflow-muted">Duración</span>
                  <span className="font-medium">
                    {Math.round(route.duration / 60)} min
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* Passengers */}
          <div className="panel p-5 space-y-3">
            <h3 className="font-display font-semibold">
              Pasajeros ({trip.assignments?.length ?? 0})
            </h3>
            {trip.assignments && trip.assignments.length > 0 ? (
              <div className="space-y-2">
                {trip.assignments.map((a) => (
                  <div
                    key={a.id}
                    className="flex items-center gap-3 py-2 px-3 rounded-lg bg-rideflow-panel2"
                  >
                    <div className="w-8 h-8 rounded-full bg-rideflow-panel flex items-center justify-center text-xs font-semibold text-rideflow-muted">
                      {a.passenger.name?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div>
                      <p className="text-sm font-medium">
                        {a.passenger.name || '—'}
                      </p>
                      {a.passenger.email && (
                        <p className="text-xs text-rideflow-muted">
                          {a.passenger.email}
                        </p>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-rideflow-muted">
                No hay pasajeros asignados.
              </p>
            )}
          </div>
        </div>

        {/* Map */}
        <div className="lg:col-span-2">
          {hasRouteMap ? (
            <div className="panel overflow-hidden">
              <MapView
                originLat={event!.originLat!}
                originLng={event!.originLng!}
                destLat={event!.destLat!}
                destLng={event!.destLng!}
                routeGeometry={routeGeometry}
                originLabel={event!.origin}
                destLabel={event!.destination}
                zoom={12}
              />
              <div className="p-3 flex items-center gap-6 text-xs text-rideflow-muted">
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-green-500 inline-block" />
                  {event!.origin}
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="w-3 h-3 rounded-full bg-red-500 inline-block" />
                  {event!.destination}
                </div>
                {route && (
                  <div className="flex items-center gap-1.5">
                    <span className="w-6 h-0.5 bg-rideflow-amber inline-block" />
                    Ruta ({route.distance.toFixed(1)} km)
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="panel p-8 text-center">
              <p className="text-rideflow-muted text-sm">
                No hay coordenadas disponibles para mostrar la ruta en el mapa.
              </p>
            </div>
          )}
        </div>
      </div>
    </PageContainer>
  );
}
