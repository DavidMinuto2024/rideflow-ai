'use client';

import { useState } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import {
  useOrganization,
  useUpdateOrganization,
} from '@/lib/queries/organizations';
import { useEvents } from '@/lib/queries/events';
import { useVehicles } from '@/lib/queries/vehicles';
import { PageContainer, StatusBadge, EmptyState } from '@/components/PageContainer';
import { PageSkeleton } from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';

export default function OrganizationDetailPage() {
  const params = useParams();
  const id = params.id as string;
  const { data: org, isLoading, error } = useOrganization(id);
  const { data: events } = useEvents(id);
  const { data: vehicles } = useVehicles(id);
  const [editing, setEditing] = useState(false);

  if (isLoading) return <PageSkeleton />;

  if (error || !org) {
    return (
      <PageContainer title="Organización">
        <div className="panel p-8 text-center">
          <p className="text-red-400">Error al cargar la organización</p>
          <Link
            href="/organizations"
            className="mt-4 inline-block text-rideflow-amber hover:underline text-sm"
          >
            ← Volver a organizaciones
          </Link>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title={org.name}
      description={`/${org.slug}`}
      action={
        <div className="flex gap-2">
          <Link
            href={`/organizations/${id}/members`}
            className="px-4 py-2 border border-rideflow-border text-rideflow-text font-medium rounded-lg hover:bg-rideflow-panel transition text-sm"
          >
            Miembros
          </Link>
          <button
            onClick={() => setEditing(!editing)}
            className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
          >
            Editar
          </button>
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
      <div className="panel p-5 grid grid-cols-2 sm:grid-cols-3 gap-4">
        <div>
          <p className="text-sm text-rideflow-muted">Nombre</p>
          <p className="font-medium">{org.name}</p>
        </div>
        <div>
          <p className="text-sm text-rideflow-muted">Slug</p>
          <p className="font-mono text-sm">/{org.slug}</p>
        </div>
        <div>
          <p className="text-sm text-rideflow-muted">Creada</p>
          <p className="font-medium text-sm">
            {new Date(org.createdAt).toLocaleDateString()}
          </p>
        </div>
      </div>

      {/* Events */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Eventos</h2>
          <Link
            href={`/events/new?orgId=${id}`}
            className="text-sm text-rideflow-amber hover:underline"
          >
            Nuevo evento
          </Link>
        </div>
        {!events || events.length === 0 ? (
          <EmptyState title="Sin eventos" description="Crea el primer evento para esta organización." />
        ) : (
          <div className="space-y-2">
            {events.slice(0, 5).map((event) => (
              <Link
                key={event.id}
                href={`/events/${event.id}`}
                className="panel p-4 flex items-center justify-between hover:border-rideflow-amber/50 transition group"
              >
                <div>
                  <p className="font-medium group-hover:text-rideflow-amber transition">
                    {event.title}
                  </p>
                  <p className="text-sm text-rideflow-muted">
                    {new Date(event.date).toLocaleDateString()} · {event.origin} → {event.destination}
                  </p>
                </div>
                <StatusBadge status={event.status} />
              </Link>
            ))}
          </div>
        )}
      </div>

      {/* Vehicles */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-lg font-display font-semibold">Vehículos</h2>
          <Link
            href={`/vehicles/new?orgId=${id}`}
            className="text-sm text-rideflow-amber hover:underline"
          >
            Nuevo vehículo
          </Link>
        </div>
        {!vehicles || vehicles.length === 0 ? (
          <EmptyState title="Sin vehículos" description="Registra el primer vehículo." />
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {vehicles.slice(0, 4).map((v) => (
              <Link
                key={v.id}
                href={`/vehicles/${v.id}`}
                className="panel p-4 hover:border-rideflow-amber/50 transition group"
              >
                <div className="flex items-center justify-between mb-1">
                  <p className="font-medium group-hover:text-rideflow-amber transition">
                    {v.model || v.plate || 'Vehículo'}
                  </p>
                  <StatusBadge status={v.isActive ? 'ACTIVE' : 'INACTIVE'} />
                </div>
                <p className="text-sm text-rideflow-muted">
                  {v.plate && `${v.plate} · `}{v.capacity} plazas
                </p>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageContainer>
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
    <div className="panel p-6 mb-6">
      <h3 className="font-display font-semibold mb-4">Editar organización</h3>
      <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm font-medium text-rideflow-muted mb-1">
            Nombre
          </label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber"
          />
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={updateOrg.isPending}
            className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 text-sm"
          >
            {updateOrg.isPending ? 'Guardando...' : 'Guardar'}
          </button>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-rideflow-border rounded-lg text-rideflow-muted hover:text-rideflow-text transition text-sm"
          >
            Cancelar
          </button>
        </div>
      </form>
    </div>
  );
}
