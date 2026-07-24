'use client';

import { useState } from 'react';
import Link from 'next/link';
import { CalendarDays, Plus, ArrowUpRight } from 'lucide-react';
import { useOrganizations } from '@/lib/queries/organizations';
import { useEvents } from '@/lib/queries/events';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Skeleton } from '@/components/ui/Skeleton';

function EventsListSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      <Skeleton className="h-10 w-full max-w-md" />
      {Array.from({ length: 4 }).map((_, i) => (
        <Skeleton key={i} className="h-24 w-full rounded-xl" />
      ))}
    </div>
  );
}

export default function EventsPage() {
  const { data: orgs } = useOrganizations();
  const [selectedOrg, setSelectedOrg] = useState<string>('');
  const effectiveOrgId = selectedOrg || orgs?.[0]?.id || '';
  const { data: events, isLoading } = useEvents(effectiveOrgId);

  return (
    <PageContainer
      title="Eventos"
      description="Gestiona el ciclo de vida de los eventos"
      action={
        <Link href={`/events/new${effectiveOrgId ? `?orgId=${effectiveOrgId}` : ''}`}>
          <Button>
            <Plus className="size-4" />
            Nuevo evento
          </Button>
        </Link>
      }
    >
      {/* Org selector */}
      {orgs && orgs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {orgs.map((org) => {
            const isActive = (selectedOrg || orgs[0]?.id) === org.id;
            return (
              <Button
                key={org.id}
                variant={isActive ? 'default' : 'outline'}
                size="sm"
                onClick={() => setSelectedOrg(org.id)}
              >
                {org.name}
              </Button>
            );
          })}
        </div>
      )}

      {!effectiveOrgId ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="mx-auto mb-4 size-12 text-text-muted" />
            <h3 className="text-lg font-display font-semibold text-text-primary">
              Selecciona una organización
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              Necesitas pertenecer a una organización para ver sus eventos.
            </p>
            <div className="mt-4">
              <Link href="/organizations">
                <Button variant="outline">
                  <ArrowUpRight className="size-4" />
                  Ir a organizaciones
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      ) : isLoading ? (
        <EventsListSkeleton />
      ) : !events || events.length === 0 ? (
        <Card>
          <CardContent className="p-12 text-center">
            <CalendarDays className="mx-auto mb-4 size-12 text-text-muted" />
            <h3 className="text-lg font-display font-semibold text-text-primary">
              Sin eventos
            </h3>
            <p className="mt-1 text-sm text-text-secondary">
              No hay eventos en esta organización.
            </p>
          </CardContent>
        </Card>
      ) : (
        <div className="flex flex-col gap-3">
          {events.map((event) => {
            const eventDate = new Date(event.date);
            return (
              <Link key={event.id} href={`/events/${event.id}`} className="block">
                <Card className="transition hover:border-primary/50">
                  <CardContent className="flex items-center justify-between p-5">
                    <div className="min-w-0 flex-1">
                      <div className="mb-1 flex items-center gap-3">
                        <h3 className="font-display font-semibold text-text-primary transition group-hover:text-primary">
                          {event.title}
                        </h3>
                        <Badge variant={statusToBadge(event.status)}>
                          {event.status}
                        </Badge>
                      </div>
                      <p className="text-sm text-text-secondary">
                        {eventDate.toLocaleDateString('es', {
                          weekday: 'long',
                          day: 'numeric',
                          month: 'long',
                          year: 'numeric',
                        })}
                      </p>
                      <p className="text-sm text-text-muted">
                        {event.origin} → {event.destination}
                      </p>
                    </div>
                    <div className="ml-4 shrink-0 text-right">
                      <p className="text-sm font-medium">{event.capacity} plazas</p>
                      {event.driver && (
                        <p className="text-xs text-text-muted">{event.driver.name}</p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </PageContainer>
  );
}

function statusToBadge(
  status: string,
): 'default' | 'success' | 'warning' | 'error' | 'info' | 'outline' {
  switch (status) {
    case 'DRAFT':
      return 'outline';
    case 'PUBLISHED':
      return 'info';
    case 'OPEN':
      return 'success';
    case 'CLOSED':
      return 'warning';
    case 'FINISHED':
      return 'default';
    default:
      return 'outline';
  }
}
