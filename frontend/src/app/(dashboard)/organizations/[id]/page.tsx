'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { Building2, Users, Car, CalendarDays, Pencil, ArrowUpRight } from 'lucide-react';
import {
  useOrganization,
  useUpdateOrganization,
} from '@/lib/queries/organizations';
import { useEvents } from '@/lib/queries/events';
import { useVehicles } from '@/lib/queries/vehicles';
import { PageContainer } from '@/components/PageContainer';
import { Card, CardContent } from '@/components/ui/Card';
import { Badge } from '@/components/ui/Badge';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Skeleton } from '@/components/ui/Skeleton';
import { ApiError } from '@/lib/api';

function OrgDetailSkeleton() {
  return (
    <div className="flex flex-col gap-6">
      <Skeleton className="h-28 rounded-xl" />
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <Skeleton className="h-48 rounded-xl" />
        <Skeleton className="h-48 rounded-xl" />
      </div>
    </div>
  );
}

function EditOrganizationForm({
  org,
  onClose,
}: {
  org: { id: string; name: string };
  onClose: () => void;
}) {
  const [name, setName] = useState(org.name);
  const [error, setError] = useState<string | null>(null);
  const updateOrg = useUpdateOrganization(org.id);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await updateOrg.mutateAsync({ name });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al actualizar');
      }
    }
  };

  return (
    <Card className="mb-6">
      <CardContent className="p-6">
        <h3 className="mb-4 font-display font-semibold">Editar organización</h3>
        <form onSubmit={handleSubmit} className="max-w-md space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium text-text-secondary">
              Nombre
            </label>
            <Input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
            />
          </div>
          {error && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-2">
              <p className="text-sm text-destructive">{error}</p>
            </div>
          )}
          <div className="flex gap-3">
            <Button type="submit" disabled={updateOrg.isPending}>
              {updateOrg.isPending ? 'Guardando...' : 'Guardar'}
            </Button>
            <Button type="button" variant="outline" onClick={onClose}>
              Cancelar
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}

export default function OrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: org, isLoading, error } = useOrganization(id);
  const { data: events } = useEvents(id);
  const { data: vehicles } = useVehicles(id);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <OrgDetailSkeleton />;

  if (error || !org) {
    return (
      <PageContainer title="Organización">
        <Card>
          <CardContent className="p-8 text-center">
            <p className="text-destructive">Error al cargar la organización</p>
            <div className="mt-4">
              <Link href="/organizations">
                <Button variant="link">
                  ← Volver a organizaciones
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
      title={org.name}
      description={`/${org.slug}`}
      action={
        <div className="flex gap-2">
          <Link href={`/organizations/${id}/members`}>
            <Button variant="outline" size="sm">
              <Users className="size-4" />
              Miembros
            </Button>
          </Link>
          <Button size="sm" onClick={() => setEditing(!editing)}>
            <Pencil className="size-4" />
            Editar
          </Button>
        </div>
      }
    >
      {editing && (
        <EditOrganizationForm
          org={org}
          onClose={() => setEditing(false)}
        />
      )}

      {/* Info panel */}
      <Card>
        <CardContent className="p-5">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-4">
            <div>
              <p className="text-sm text-text-secondary">Nombre</p>
              <p className="font-medium">{org.name}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Slug</p>
              <p className="font-mono text-sm">/{org.slug}</p>
            </div>
            <div>
              <p className="text-sm text-text-secondary">Creada</p>
              <p className="text-sm font-medium">
                {new Date(org.createdAt).toLocaleDateString()}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Events */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-display font-semibold">
            <CalendarDays className="size-5 text-primary" />
            Eventos
          </h2>
          <Link href={`/events/new?orgId=${id}`}>
            <Button variant="link" size="sm">
              Nuevo evento
              <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </div>
        {!events || events.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <CalendarDays className="mx-auto mb-2 size-8 text-text-muted" />
              <p className="text-sm text-text-secondary">Sin eventos. Crea el primero.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <Link key={event.id} href={`/events/${event.id}`}>
                <Card className="transition hover:ring-2 hover:ring-primary/40">
                  <CardContent className="flex items-center justify-between p-4">
                    <div>
                      <p className="font-medium">{event.title}</p>
                      <p className="text-sm text-text-secondary">
                        {new Date(event.date).toLocaleDateString()} · {event.origin} → {event.destination}
                      </p>
                    </div>
                    <Badge variant={event.status === 'OPEN' ? 'success' : event.status === 'DRAFT' ? 'default' : 'warning'}>
                      {event.status}
                    </Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Vehicles */}
      <section>
        <div className="mb-3 flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-display font-semibold">
            <Car className="size-5 text-primary" />
            Vehículos
          </h2>
          <Link href={`/vehicles/new?orgId=${id}`}>
            <Button variant="link" size="sm">
              Nuevo vehículo
              <ArrowUpRight className="size-3.5" />
            </Button>
          </Link>
        </div>
        {!vehicles || vehicles.length === 0 ? (
          <Card>
            <CardContent className="p-8 text-center">
              <Car className="mx-auto mb-2 size-8 text-text-muted" />
              <p className="text-sm text-text-secondary">Sin vehículos. Registra el primero.</p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.slice(0, 4).map((v) => (
              <Link key={v.id} href={`/vehicles/${v.id}`}>
                <Card className="transition hover:ring-2 hover:ring-primary/40">
                  <CardContent className="p-4">
                    <div className="mb-1 flex items-center justify-between">
                      <p className="font-medium">{v.model || v.plate || 'Vehículo'}</p>
                      <Badge variant={v.isActive ? 'success' : 'default'}>
                        {v.isActive ? 'Activo' : 'Inactivo'}
                      </Badge>
                    </div>
                    <p className="text-sm text-text-secondary">
                      {v.plate && `${v.plate} · `}{v.capacity} plazas
                    </p>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </section>
    </PageContainer>
  );
}
