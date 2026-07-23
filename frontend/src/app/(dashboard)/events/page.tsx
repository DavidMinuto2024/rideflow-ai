'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrganizations } from '@/lib/queries/organizations';
import { useEvents } from '@/lib/queries/events';
import { PageContainer, StatusBadge, EmptyState } from '@/components/PageContainer';
import { LoadingSpinner } from '@/components/LoadingSpinner';

export default function EventsPage() {
  const { data: orgs } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string>('');

  // Auto-select first org
  const effectiveOrgId = selectedOrg || orgs?.[0]?.id || '';
  const { data: events, isLoading } = useEvents(effectiveOrgId);

  return (
    <PageContainer
      title="Eventos"
      description="Gestiona el ciclo de vida de los eventos"
      action={
        <Link
          href={`/events/new${effectiveOrgId ? `?orgId=${effectiveOrgId}` : ''}`}
          className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
        >
          Nuevo evento
        </Link>
      }
    >
      {/* Org selector */}
      {orgs && orgs.length > 1 && (
        <div className="flex gap-2 flex-wrap">
          {orgs.map((org) => (
            <button
              key={org.id}
              onClick={() => setSelectedOrg(org.id)}
              className={`px-3 py-1.5 rounded-lg text-sm font-medium transition ${
                (selectedOrg || orgs[0]?.id) === org.id
                  ? 'bg-rideflow-amber/10 text-rideflow-amber border border-rideflow-amber/30'
                  : 'bg-rideflow-panel text-rideflow-muted border border-rideflow-border hover:text-rideflow-text'
              }`}
            >
              {org.name}
            </button>
          ))}
        </div>
      )}

      {!effectiveOrgId ? (
        <EmptyState
          title="Selecciona una organización"
          description="Necesitas pertenecer a una organización para ver sus eventos."
          action={
            <Link
              href="/organizations"
              className="text-rideflow-amber hover:underline text-sm"
            >
              Ir a organizaciones
            </Link>
          }
        />
      ) : isLoading ? (
        <LoadingSpinner />
      ) : !events || events.length === 0 ? (
        <EmptyState
          title="Sin eventos"
          description="No hay eventos en esta organización."
        />
      ) : (
        <div className="space-y-3">
          {events.map((event) => (
            <Link
              key={event.id}
              href={`/events/${event.id}`}
              className="panel p-5 flex items-center justify-between hover:border-rideflow-amber/50 transition group"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-3 mb-1">
                  <h3 className="font-display font-semibold group-hover:text-rideflow-amber transition">
                    {event.title}
                  </h3>
                  <StatusBadge status={event.status} />
                </div>
                <p className="text-sm text-rideflow-muted">
                  {new Date(event.date).toLocaleDateString('es', {
                    weekday: 'long',
                    day: 'numeric',
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
                <p className="text-sm text-rideflow-muted2">
                  {event.origin} → {event.destination}
                </p>
              </div>
              <div className="text-right shrink-0 ml-4">
                <p className="text-sm font-medium">{event.capacity} plazas</p>
                {event.driver && (
                  <p className="text-xs text-rideflow-muted2">{event.driver.name}</p>
                )}
              </div>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}
