'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useOrganizations, useCreateOrganization } from '@/lib/queries/organizations';
import { PageContainer, EmptyState } from '@/components/PageContainer';
import { LoadingSpinner } from '@/components/LoadingSpinner';
import { ApiError } from '@/lib/api';

export default function OrganizationsPage() {
  const { data: orgs, isLoading, error } = useOrganizations();
  const [showCreate, setShowCreate] = useState(false);

  if (isLoading) return <LoadingSpinner />;

  if (error) {
    return (
      <PageContainer title="Organizaciones">
        <div className="panel p-8 text-center">
          <p className="text-red-400">Error al cargar organizaciones</p>
        </div>
      </PageContainer>
    );
  }

  return (
    <PageContainer
      title="Organizaciones"
      description="Gestiona las organizaciones registradas en RideFlow"
      action={
        <button
          onClick={() => setShowCreate(true)}
          className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition text-sm"
        >
          Nueva organización
        </button>
      }
    >
      {showCreate && (
        <CreateOrganizationForm onClose={() => setShowCreate(false)} />
      )}

      {!orgs || orgs.length === 0 ? (
        <EmptyState
          title="No hay organizaciones"
          description="Crea la primera organización para empezar."
        />
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {orgs.map((org) => (
            <Link
              key={org.id}
              href={`/organizations/${org.id}`}
              className="panel p-5 hover:border-rideflow-amber/50 transition group"
            >
              <div className="w-12 h-12 rounded-lg bg-rideflow-amber/10 flex items-center justify-center mb-3">
                <span className="text-lg font-bold text-rideflow-amber">
                  {org.name[0]?.toUpperCase()}
                </span>
              </div>
              <h3 className="font-display font-semibold group-hover:text-rideflow-amber transition">
                {org.name}
              </h3>
              <p className="text-sm text-rideflow-muted mt-1">{org.slug}</p>
              <p className="text-xs text-rideflow-muted2 mt-2">
                Creada {new Date(org.createdAt).toLocaleDateString()}
              </p>
            </Link>
          ))}
        </div>
      )}
    </PageContainer>
  );
}

function CreateOrganizationForm({ onClose }: { onClose: () => void }) {
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [error, setError] = useState<string | null>(null);
  const createOrg = useCreateOrganization();

  const handleSlugChange = (value: string) => {
    setSlug(value.toLowerCase().replace(/[^a-z0-9-]/g, '-'));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    try {
      await createOrg.mutateAsync({ name, slug });
      onClose();
    } catch (err) {
      if (err instanceof ApiError) {
        setError(err.message);
      } else {
        setError('Error al crear la organización');
      }
    }
  };

  return (
    <div className="panel p-6 mb-6">
      <h3 className="font-display font-semibold text-lg mb-4">
        Nueva organización
      </h3>
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
            placeholder="Mi Organización"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-rideflow-muted mb-1">
            Slug
          </label>
          <input
            type="text"
            value={slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            required
            className="w-full px-3 py-2 bg-rideflow-panel2 border border-rideflow-border rounded-lg text-rideflow-text focus:outline-none focus:border-rideflow-amber font-mono text-sm"
            placeholder="mi-organizacion"
          />
          <p className="text-xs text-rideflow-muted2 mt-1">
            Identificador único usado en URLs
          </p>
        </div>
        {error && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg px-4 py-2">
            <p className="text-red-400 text-sm">{error}</p>
          </div>
        )}
        <div className="flex gap-3">
          <button
            type="submit"
            disabled={createOrg.isPending}
            className="px-4 py-2 bg-rideflow-amber text-rideflow-bg font-semibold rounded-lg hover:brightness-110 transition disabled:opacity-50 text-sm"
          >
            {createOrg.isPending ? 'Creando...' : 'Crear'}
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
