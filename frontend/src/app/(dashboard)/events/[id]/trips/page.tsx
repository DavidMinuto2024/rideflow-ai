'use client';

import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useEvent } from '@/lib/queries/events';
import { useEventTrips } from '@/lib/queries/trips';
import { PageContainer, EmptyState } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';

export default function EventTripsPage() {
  const params = useParams();
  const eventId = params.id as string;
  const { data: event, isLoading: eventLoading } = useEvent(eventId);
  const { data: trips, isLoading } = useEventTrips(eventId);

  if (isLoading || eventLoading) return <PageSkeleton />;

  return (
    <PageContainer
      title="Viajes"
      description={event ? `Viajes programados para ${event.title}` : undefined}
      action={
        <Link
          href={`/events/${eventId}`}
          className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
        >
          ← Volver al evento
        </Link>
      }
    >
      {!trips || trips.length === 0 ? (
        <EmptyState
          title="Sin viajes"
          description="Aún no hay viajes asignados para este evento."
          icon={
            <svg className="w-12 h-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={1}
                d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
              />
            </svg>
          }
        />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {trips.map((trip) => (
            <Link
              key={trip.id}
              href={`/events/${eventId}/trips/${trip.id}`}
              className="panel p-5 hover:border-rideflow-amber/50 transition group"
            >
              <div className="flex items-start justify-between mb-4">
                <div className="flex items-center gap-2">
                  <div className="w-9 h-9 rounded-full bg-rideflow-amber/10 flex items-center justify-center">
                    <svg
                      className="w-4 h-4 text-rideflow-amber"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={2}
                        d="M13 16V6a1 1 0 00-1-1H4a1 1 0 00-1 1v10a1 1 0 001 1h1m8-1a1 1 0 01-1 1H9m4-1V8a1 1 0 011-1h2.586a1 1 0 01.707.293l3.414 3.414a1 1 0 01.293.707V16a1 1 0 01-1 1h-1m-6-1a2 2 0 001 1h1M5 17a2 2 0 104 0m-4 0a2 2 0 114 0m6 0a2 2 0 104 0m-4 0a2 2 0 114 0"
                      />
                    </svg>
                  </div>
                  <div>
                    <p className="font-medium group-hover:text-rideflow-amber transition">
                      {trip.driver?.name || 'Conductor'}
                    </p>
                    <p className="text-xs text-rideflow-muted">
                      {trip.vehicle?.model || trip.vehicle?.plate || 'Sin vehículo'}
                    </p>
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-4 text-sm">
                <div className="flex items-center gap-1 text-rideflow-muted">
                  <svg
                    className="w-4 h-4"
                    fill="none"
                    viewBox="0 0 24 24"
                    stroke="currentColor"
                  >
                    <path
                      strokeLinecap="round"
                      strokeLinejoin="round"
                      strokeWidth={1.5}
                      d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0z"
                    />
                  </svg>
                  <span>{trip.assignments?.length ?? 0} pasajero(s)</span>
                </div>

                {trip.distance != null && (
                  <div className="flex items-center gap-1 text-rideflow-muted">
                    <svg
                      className="w-4 h-4"
                      fill="none"
                      viewBox="0 0 24 24"
                      stroke="currentColor"
                    >
                      <path
                        strokeLinecap="round"
                        strokeLinejoin="round"
                        strokeWidth={1.5}
                        d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6"
                      />
                    </svg>
                    <span>{trip.distance.toFixed(1)} km</span>
                  </div>
                )}
              </div>

              {/* Passenger list preview */}
              {trip.assignments && trip.assignments.length > 0 && (
                <div className="mt-3 pt-3 border-t border-rideflow-border">
                  <div className="flex flex-wrap gap-1.5">
                    {trip.assignments.map((a) => (
                      <span
                        key={a.id}
                        className="inline-flex items-center px-2 py-0.5 rounded-full text-xs bg-rideflow-panel2 text-rideflow-muted"
                      >
                        {a.passenger.name || a.passenger.email}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
